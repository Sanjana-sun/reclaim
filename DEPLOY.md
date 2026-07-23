# Deploying Overturn

The whole app (marketing site + all portals + API + Postgres) runs as **one service** on
Railway. Frontend is served by the same Express server, so there's no split and no CORS.

---

## Recommended: Railway CLI (no git required)

```bash
npm i -g @railway/cli
railway login

cd app
railway init                 # create a new project
railway add                  # choose "PostgreSQL"
railway up                   # builds app/Dockerfile and deploys

# secrets
railway variables --set JWT_SECRET=$(openssl rand -hex 32)
railway domain               # generate a public URL
```

In the Railway dashboard, on the **app** service, add a variable so it reads the database:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Migrations run automatically on boot (`server/migrate.js`). Health check: `/api/health`.

---

## Alternative: Railway via GitHub

1. Push this repo to GitHub (see "Git" below).
2. Railway → New Project → Deploy from GitHub repo.
3. Service settings → **Root Directory = `app`** (picks up `app/Dockerfile` + `app/railway.json`).
4. Add the **PostgreSQL** plugin.
5. Add variables (below). Deploy.

---

## Environment variables

| Variable | Required? | Purpose |
|---|---|---|
| `DATABASE_URL` | yes (prod) | Postgres connection. From the Railway Postgres plugin. |
| `JWT_SECRET` | yes | Signs auth tokens. Use a long random value. |
| `ANTHROPIC_API_KEY` | optional | Real Claude-drafted appeals (else templates). |
| `DRAFT_MODEL` / `CLASSIFY_MODEL` | optional | Override model ids. |
| `STRIPE_SECRET_KEY` | optional | Real payments (else stub). |
| `STRIPE_PUBLISHABLE_KEY` | optional | Frontend card element. |
| `STRIPE_WEBHOOK_SECRET` | optional | Verifies webhook signatures. |
| `STRIPE_PRICE_ID` | optional | Recurring price for the $12/mo Plus plan. |
| `APPEAL_PRICE` / `CONTINGENCY_RATE` | optional | Pricing knobs. |
| `PORT` | auto | Set by Railway; app respects it. |

Nothing is required for a first deploy except `DATABASE_URL` + `JWT_SECRET` — everything else
degrades gracefully.

---

## Stripe setup (when you're ready to charge)

1. Create a recurring $12/mo Price in Stripe → copy its id to `STRIPE_PRICE_ID`.
2. Add a webhook endpoint: `https://<your-domain>/api/billing/webhook`
   (events: `payment_intent.succeeded`, `checkout.session.completed`, `customer.subscription.deleted`).
3. Copy the endpoint's signing secret to `STRIPE_WEBHOOK_SECRET`.
4. Set `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY`.

Local webhook testing: `stripe listen --forward-to localhost:3000/api/billing/webhook`.

---

## Post-deploy checklist

- [ ] `GET /api/health` returns `{"backend":"pg", ...}`
- [ ] Sign up as a patient; generate an appeal
- [ ] Log in to a portal (org codes: PROVIDER / PHARMA / EMPLOYER / CLINICIAN)
- [ ] Change the seeded demo passwords or disable demo accounts before real launch
- [ ] Point a custom domain at the Railway service

---

## Other hosts

- **Docker anywhere:** `docker compose up --build` (app + Postgres). See `app/docker-compose.yml`.
- **Fly.io:** `app/fly.toml` + `fly deploy`, then `fly postgres create` and attach.
- **Render:** `render.yaml` blueprint at the repo root.

> Vercel is intentionally not used: this is a stateful Express server with Postgres and a
> Stripe webhook, which doesn't fit Vercel's serverless model. Railway (or any container host)
> is the right home.

---

## Git

```bash
cd /Users/sun/IdeaProjects/overturn
# already initialized; to push to GitHub:
gh repo create overturn --private --source=. --remote=origin --push
# or: git remote add origin git@github.com:<you>/overturn.git && git push -u origin main
```
