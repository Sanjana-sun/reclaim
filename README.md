# Reclaim

AI that helps patients fight denied insurance claims and dispute wrong medical bills: it drafts a plan specific, citation backed appeal, and you review, sign, and send.


## Why it exists

Fewer than 1% of US insurance denials are ever appealed, yet a large share of appeals win and most denials trace back to paperwork errors, not real coverage disputes. Meanwhile billions in medical debt sit on top of duplicate and upcoded charges. Reclaim turns a citation backed appeal into a five minute act and puts it in patients' hands as a self help tool: not a law firm, not medical advice, you stay in control of what gets sent.

## Tech stack

Node.js and Express backend, PostgreSQL (with a JSON store fallback for zero config local runs), JWT and bcrypt auth, the Claude API for classification and drafting with template fallback, Stripe for PaymentIntents and billing, and a vanilla JS frontend on a hand built design system. GitHub Actions CI.

## Features

- **Appeal drafting:** classify a denial reason, then draft a plan specific appeal letter with the right framing (medical necessity, step therapy exception, out of network in network rate, and more).
- **Bill dispute detection:** scan an itemized bill for duplicate, upcoded, and over benchmark charges, estimate savings, and draft the dispute.
- **Document extraction:** a Claude vision path reads uploaded PDFs and images of denials and bills into structured fields.
- **Five role based portals:** patient, provider, pharma, employer, and admin, plus a clinician review queue.
- **Stripe payments:** per appeal charges and subscription billing with signed webhooks.
- **Safety guardrails:** every generated letter passes a linter that bans overreaching phrases (no guarantees, no "robot lawyer", no "we will win") and enforces the self help disclaimer and filing deadline.

## Architecture

Concrete numbers:

- **43 REST endpoints across 9 route modules:** `auth`, `appeals`, `bills`, `billing`, `org`, `clinician`, `public`, `admin`, and a Stripe `webhook`.
- **Roughly 1,400 lines** of Node and Express server code.
- Every external integration is **feature flagged**: the app boots with zero config and lights up as you add `ANTHROPIC_API_KEY`, `DATABASE_URL`, and the `STRIPE_*` keys.

### The Claude pipeline

The core logic in `app/server/algorithm.js` (prompts in `app/server/prompts.js`, Claude wrapper in `app/server/llm.js`) runs a three stage pass:

1. **Classify** the denial into a reason category and attach the filing deadline.
2. **Draft** the appeal letter for that reason, flagging when a medical necessity argument is required.
3. **Extract** structured billing errors from itemized charges and estimate recoverable savings.

Claude failures return null and the pipeline falls back to deterministic templates, so the product still works without an API key.

### Automated eval harness

`app/eval/run.js` runs the drafter and bill detector against a fixed suite of denial scenarios and asserts required content, banned phrases, the disclaimer, deadlines, and duplicate detection. It runs in template mode with no key, or validates real Claude output the same way when a key is present, and exits non zero on any failure. Wired into CI as `npm run eval`.

## Running locally

```bash
cd app
npm install
npm start          # http://localhost:3000
npm run eval       # guardrail + bill-detector tests
```

Seeded demo accounts (patient, provider, pharma, employer, clinician, admin) are created on first run; see the app README for logins. Deployment configs for Railway, Fly, Render, and Docker are included.

## Status and disclaimers

Working MVP, not production hardened. Reclaim is a self help document preparation tool, not a law firm or medical provider, and does not provide legal or medical advice. Outcomes are not guaranteed.
