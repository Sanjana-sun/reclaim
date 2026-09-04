# Reclaim — full-stack app

AI patient advocate with all three revenue engines, auth, and five portals. Runs locally
with no external database and no API key (LLM drafting falls back to templates).

## Run
```bash
cd app
npm install
npm start
# open http://localhost:3000
```
Optional: `cp .env.example .env` and set `ANTHROPIC_API_KEY` to enable real Claude-drafted
appeals. Everything else works without it.

## Demo logins (seeded on first run)
| Role | Email | Password | Portal |
|---|---|---|---|
| Patient | patient@overturn.dev | demo1234 | /dashboard.html |
| Clinic | provider@overturn.dev | demo1234 | /provider.html |
| Pharma | pharma@overturn.dev | demo1234 | /pharma.html |
| Employer | employer@overturn.dev | demo1234 | /employer.html |
| Admin | admin@overturn.dev | admin123 | /admin.html |

Sign up as a patient with no code, or use org codes `PROVIDER` / `PHARMA` / `EMPLOYER`.

## What's implemented
- **Engine 1 — Consumer**: intake → classify → draft → safety-lint → review/edit → pay
  ($40/appeal or subscribe) → submit → outcome capture. Deadlines from deterministic rules.
- **Engine 2 — Contingency**: itemized-bill parsing → error/variance detection (duplicate,
  above-benchmark, unit overcharge, possible upcoding) → dispute letter → fee charged only on
  realized savings (CROA-safe).
- **Engine 3 — B2B2C**: pharma sponsored-appeal matching + program management; provider
  attribution + recovery + ACV; employer PMPM + aggregate outcomes.
- **Algorithm** (`server/algorithm.js`): classifier, drafter (Claude + template fallback),
  safety linter, bill detector, and the de-identified win-rate flywheel.
- **RAG + tool-use agent** (`server/rag.js`, `server/agent.js`): retrieval-grounded drafting.
  A BM25 retriever indexes 32 legal passages (federal rights, per-state rules, CARC codes) from
  a curated corpus (`server/legal/corpus.js`) — this runs with **no API key**. Two drafting
  backends sit on top of it:
  - **Free (no key, default)**: a deterministic planner runs the same tools
    (`get_federal_rights`, `get_state_rules`, `lookup_denial_code`, `search_legal_kb`,
    `check_bill_benchmark`) and assembles a grounded, cited appeal — fully offline, always works.
  - **Claude agent (if `ANTHROPIC_API_KEY` is set)**: a tool-use agent plans, calls those same
    tools, and writes the appeal citing only what it retrieved.
  Order: Claude agent (if key) → free RAG drafter → bare template. Both grounded paths return the
  citations and the tool-call trace behind the letter.
- **Auth**: JWT + bcrypt, role-based access, five role-scoped portals.
- **Admin**: revenue-by-engine + win-rate moat.

## Architecture
`server/` Express API (JSON-file store in `data/db.json`, zero-config). `public/` static
portals talking to `/api`. Guardrails are structural: the LLM never owns deadlines and never
asserts medical necessity (it references the treating physician's evidence).

## Optional integrations (feature-flagged — all real, all verified)
The app runs with zero config; each env var lights up a real integration:

| Set this | Effect | Fallback when unset |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude drafts/classifies appeals | Deterministic templates |
| `DATABASE_URL` | Postgres (JSONB store, auto-migrated + seeded) | Local JSON file |
| `STRIPE_SECRET_KEY` | Real Stripe PaymentIntents | Auto-succeeding stub |
| `RESEND_API_KEY` | Real email (deadline reminders, password reset) | Logs to console |
| `ANALYTICS_DOMAIN`+`ANALYTICS_SRC` | Privacy-friendly analytics (e.g. Plausible) | Off |

Example Postgres run:
```bash
createdb overturn
DATABASE_URL=postgres://localhost:5432/overturn npm start
```
A bad/misconfigured key degrades gracefully (e.g. a failing LLM call falls back to templates,
never a 500). `GET /api/health` reports which integrations are active.

## Stripe (full loop)
- Server: PaymentIntent creation (`payments.js`) + a signature-verified webhook
  (`routes/webhook.js`, mounted with a raw body parser) that flips records to `paid`.
- Frontend: Stripe.js Elements card flow in `dashboard.html` (shown only when a
  `STRIPE_PUBLISHABLE_KEY` is configured; otherwise the stub path runs).
- Local testing: `stripe listen --forward-to localhost:3000/api/billing/webhook` and put the
  printed secret in `STRIPE_WEBHOOK_SECRET`. The webhook returns 400 on bad signatures.

## Postgres migrations
Ordered, idempotent SQL in `server/migrations/`, tracked in `_migrations`, run at boot inside
transactions (`server/migrate.js`). 002 adds indexes (per-user, sponsor/provider, email, GIN
on JSONB). Add new files as `003_*.sql` etc.

## Eval harness
`npm run eval` — regression tests for the drafter's guardrails (must cite the physician for
medical-necessity reasons, no banned/guarantee language, disclaimer present, correct
reason-specific framing) and the bill detector. Runs in template mode without a key, and
validates real Claude output the same way when `ANTHROPIC_API_KEY` is set. Exit code 1 on any
failure — wire it into CI.

`node eval/agent-demo.js` — shows the RAG retriever ranking passages for sample denials,
smoke-tests each tool, and drafts a full appeal end-to-end, printing the plan → tool-call →
citation trace. Runs entirely offline with the free drafter; uses the Claude agent instead when
`ANTHROPIC_API_KEY` is set.

## Deployment

### Railway (recommended — runs the server + Postgres natively)
This app is a persistent Express server with a Postgres store, so Railway is the best fit.
1. New Project → Deploy from repo. Set the service **Root Directory** to `app` (it picks up
   `app/Dockerfile` + `app/railway.json`).
2. Add a **Postgres** plugin — Railway injects `DATABASE_URL` automatically; migrations run on boot.
3. Add variables: `JWT_SECRET` (long random) and any of `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`,
   `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`.
4. Deploy. Health check hits `/api/health`.

> Vercel note: Vercel is serverless and NOT a good fit for this app — the long-running server,
> the JSON/Postgres store, and the stateful Stripe webhook don't map cleanly to functions. Use
> Railway (or any container host) for the full app. Vercel would only suit the static marketing
> pages, which aren't worth splitting out.

### Other hosts
- `docker-compose.yml` — app + Postgres locally in one command:
  ```bash
  cd app
  JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
  ```
- `fly.toml` (Fly.io) and `render.yaml` (Render blueprint) are included. Any container host
  works: build the image, set `DATABASE_URL` + secrets, expose port 3000.

## Consumer account & settings
`account.html` — profile edit, subscription status with upgrade/cancel, billing history, and a
right-to-delete that wipes the account and all associated appeals/bills/payments.

## Marketing site
Landing, `pricing.html`, `business.html`, `about.html`, `blog.html`, `security.html` — a full
static marketing surface sharing the design system, served by the same server.

## Go-live checklist (still NOT done — flagged honestly)
- Stripe: production webhook endpoint registration + idempotency keys; subscriptions via
  Stripe Billing (currently recorded locally).
- Postgres: connection-pool limits, read replicas as needed, encryption at rest.
- HIPAA-grade hosting, FTC Health Breach Notification Rule compliance, no ad-tech trackers.
- Human/clinician review workflow; expand the eval set + track win-rate by prompt version.
- Security review, rate limiting, secrets management, state-specific legal counsel.
