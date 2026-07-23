# Overturn (working name)

An AI patient advocate that helps people **fight denied health-insurance claims** and
dispute wrong medical bills — the patient's own self-help tool, not a lawyer or doctor.

## Why this
- ~1 in 5 in-network claims are denied; **fewer than 1% are ever appealed**.
- **44–60% of appeals win**, and ~77% of denials are paperwork/plan-design errors — exactly
  what an LLM drafts around at near-zero marginal cost.
- The legal/regulatory current is pro-patient (CA SB 1120, the UnitedHealth nH Predict
  litigation, CMS/NAIC rules on AI denials).

## The strategy in one line
A thin, viral **consumer** top that funds and feeds a fat **B2B2C** bottom (pharma + providers
+ employers). Consumer traction is the key that opens the B2B2C vault — it is not the vault.

## Revenue engines (see docs/business-plan.md)
1. Consumer (per-appeal / subscription) — ignition + data-collection
2. Contingency on recovered bills — frictionless, lumpy
3. B2B2C: pharma-sponsored appeals, provider/RCM subscriptions, employer benefit — the scale money

## Compliance guardrails (baked into the product, see docs/business-plan.md §7)
1. Positioned as a **document-preparation / self-help** tool — never "robot lawyer".
2. **Patient reviews, signs, and submits** their own appeal.
3. **Clinician-in-the-loop** for any medical-necessity assertion.
4. Substantiated claims + clear AI disclosure.
5. HIPAA-grade data handling (governed by the FTC Health Breach Notification Rule as a DTC app).
6. Fee structure compliant with CROA / state debt-adjusting rules.

> Not legal advice. Get state-specific counsel on UPL, fees, and privacy before launch.

## Repo layout
- `docs/business-plan.md` — market, product, GTM, revenue, competition, legal, risks
- `docs/mvp-scope-90-days.md` — v1 feature scope, stack, architecture, week-by-week plan
- `docs/validation-plan.md` — cheap demand test to run BEFORE heavy build
- `mvp/index.html` — runnable prototype + validation landing page (open in a browser)

## Run the prototype
Open `mvp/index.html` in any browser. No build step. It generates a structured appeal
letter from an intake form using a template engine (the placeholder for the real LLM call
is marked in the code) and captures waitlist emails to localStorage for the validation test.
