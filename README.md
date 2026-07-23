<div align="center">

# 🛡️ Overturn

**AI that helps patients fight denied insurance claims and dispute wrong medical bills — you review, sign, and send.**

[![CI](https://github.com/Sanjana-sun/overturn/actions/workflows/ci.yml/badge.svg)](https://github.com/Sanjana-sun/overturn/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-20%2B-3c873a)
![Express](https://img.shields.io/badge/server-Express-000000)
![Postgres](https://img.shields.io/badge/db-JSON%20%7C%20Postgres-336791)
![Stripe](https://img.shields.io/badge/payments-Stripe-635bff)
![License](https://img.shields.io/badge/license-Proprietary-lightgrey)

</div>

---

## Why

Fewer than 1% of insurance denials are ever appealed — yet **44–60% of appeals win**, and ~77% of
denials are paperwork errors. Meanwhile ~$220B in US medical debt sits partly on **wrong bills**.
AI just made a citation-backed appeal a 5-minute, near-zero-cost act. Overturn puts that in
patients' hands as a **self-help tool** (not a law firm, not medical advice — you sign and send).

## What it does — three revenue engines

| Engine | For the user | How it earns |
|---|---|---|
| **Appeals** | Draft a plan-specific appeal for a denied claim | $40/appeal or $12/mo Plus |
| **Bill disputes** | Detect duplicate/upcoded/over-benchmark charges, draft the dispute | 25% of realized savings |
| **B2B2C** | Sponsored appeals + clinic/employer portals | Pharma programs · provider ACV · employer PMPM |

Five role portals (patient, provider, pharma, employer, admin) **plus a clinician-review queue**,
and a full marketing site.

## Architecture

```mermaid
flowchart LR
  subgraph Clients
    C[Patients]:::c
    B[Provider / Pharma / Employer]:::c
    Cl[Clinicians]:::c
    A[Admin]:::c
  end
  Clients --> W[Express server<br/>static site + REST API]
  W --> ALG[Algorithm<br/>classify · draft · lint · bill-detect · win-rate]
  ALG --> LLM[Claude API<br/>fallback: templates]
  W --> DB[(JSON | Postgres)]
  W --> STR[Stripe<br/>PaymentIntents + Billing]
  classDef c fill:#e5f3ee,stroke:#0f7b5f,color:#08503f;
```

Every integration is **feature-flagged** — the app runs with zero config and lights up as you add
`ANTHROPIC_API_KEY`, `DATABASE_URL`, and `STRIPE_*`.

## Quickstart

```bash
cd app
npm install
npm start          # http://localhost:3000
npm run eval       # guardrail + bill-detector tests (6/6)
```

### Demo accounts (seeded on first run)

| Role | Email | Password |
|---|---|---|
| Patient | `patient@overturn.dev` | `demo1234` |
| Provider | `provider@overturn.dev` | `demo1234` |
| Pharma | `pharma@overturn.dev` | `demo1234` |
| Employer | `employer@overturn.dev` | `demo1234` |
| Clinician | `clinician@overturn.dev` | `demo1234` |
| Admin | `admin@overturn.dev` | `admin123` |

Sign up as a patient with no code, or use org codes `PROVIDER` / `PHARMA` / `EMPLOYER` / `CLINICIAN`.

## Tech stack

Node/Express · dual **JSON | Postgres** store (auto-migrated) · JWT + bcrypt auth ·
**Claude** (Opus draft / Haiku classify) with template fallback · **Stripe** PaymentIntents +
Billing + signed webhooks · vanilla-JS frontend on a hand-built design system · GitHub Actions CI.

## Deploy

One service on **Railway** (app + Postgres, no CORS). See **[DEPLOY.md](DEPLOY.md)** — includes the
CLI and GitHub paths, env-var table, and Stripe webhook setup. `Dockerfile`, `docker-compose.yml`,
`fly.toml`, and `render.yaml` are included for other hosts.

## Repo layout

```
app/           full-stack application (server/, public/, migrations, tests)
docs/          business plan, MVP scope, validation plan
mvp/           original single-file prototype
.github/       CI workflow
DEPLOY.md      deployment guide
```

## Status & disclaimers

Working MVP — **not production-hardened**. See the go-live checklist in [app/README.md](app/README.md)
(HIPAA-grade hosting, security review, real Stripe keys, legal counsel). Overturn is a self-help
document-preparation tool, not a law firm or medical provider, and does not provide legal or medical
advice. Outcomes are not guaranteed.

## License

Proprietary — all rights reserved. See [LICENSE](LICENSE).
