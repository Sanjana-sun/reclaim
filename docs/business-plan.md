# Reclaim — Business Plan

Working name. AI patient advocate for insurance-denial appeals and medical-bill disputes.

---

## 1. Problem
The US health-billing system overcharges and wrongly denies ordinary people billions, and
almost nobody fights back because it is too hard, slow, and intimidating.

- ~85M in-network claims denied on the ACA marketplace in 2024; ~1 in 5 claims denied.
- **<1% of denials are ever appealed**, yet **44–60% of appeals succeed**.
- ~77% of denials are paperwork/plan-design errors (not medical judgment).
- 100M Americans owe ~$220B in medical debt; ~74% of people who contest a bill error get it fixed — most never try.

The entire opportunity lives in the gap between **"should win"** and **"nobody tries."**
AI closes that gap: drafting a citation-backed, plan-specific appeal is now a 5-minute,
near-zero-marginal-cost act.

## 2. Solution
A consumer tool that turns a denial or a wrong bill into a ready-to-sign, evidence-backed
appeal/dispute in minutes. The patient reviews, signs, and submits it themselves. Over time,
the product accumulates the one defensible asset: **which appeal language + citations win,
against which insurer, for which denial code.**

## 3. Market
- Beachhead: **chronic patients with high-cost, frequently-denied treatment** (specialty
  drugs, GLP-1s, infusions) — they get denied repeatedly, so they actually retain.
- Expansion: acute denials (ER, imaging, surgery), then medical-bill disputes.
- TAM framing: tens of millions of denials/yr + $220B medical debt. Capturable revenue is a
  low-hundreds-of-millions ceiling as a standalone; larger if it becomes the default
  consumer interface to healthcare billing.

## 4. Competition & wedge
| Player | Model | Weakness we exploit |
|---|---|---|
| Counterforce Health | Grant-funded, **free** | No commercial engine; trains consumers to $0; no pharma/provider monetization depth |
| Claimable | ~$40/appeal + pharma deals | Thin retention; single-shot; narrow |
| Goodbill / Resolve | Bill negotiation, contingency | Human-labor-heavy, thin margin, not appeals |
| RCM incumbents (athena, R1) | IDR/appeals modules | Shallow bolt-ons, provider-side only |

Our wedge: **retention via chronic patients + a compounding win-rate dataset + a stacked
monetization model** (consumer → contingency → pharma/provider) that the free nonprofit and
the single-shot player don't have. Not "a better appeal generator" — a data flywheel.

## 5. Revenue model (see the interactive 3-yr model)
Three stacked engines, sequenced:
1. **Consumer** — ~$40/appeal or $9–15/mo. Small by design; ignition + data.
2. **Contingency** — 20–35% of recovered savings. Frictionless, lumpy, CROA-constrained.
3. **B2B2C** — the scale money:
   - **Pharma**: fund appeals for denied high-cost drugs (a denied script = 100% lost revenue to them).
   - **Providers/RCM**: per-provider subscription or % of recovered; our wins = their revenue.
   - **Employers**: PMPM benefit (slow enterprise sale).

Illustrative trajectory (default assumptions): ~$1.3M → $5.3M → $18.8M over 3 years, with
contingency + B2B2C as the growth, consumer as the smallest line.

## 6. Go-to-market
- **Organic/viral**: denial-rage is a cultural moment. "I got $X reversed" share loop;
  condition-specific SEO ("Ozempic denial appeal letter"); r/HealthInsurance and
  disease-specific communities; clinic/patient-advocate referral loops.
- **Sequence**: consumer freemium (0–6 mo, prove + collect data) → contingency bill-audit
  (6–18 mo) → land first pharma + provider deals (12 mo+, step-change).

## 7. Legal & compliance (design constraints, not afterthoughts)
Viable, but execution-dependent. The core activity is lawful self-help; the traps are
positioning and data. Guardrails:
1. **Document-prep / self-help positioning** — never "robot lawyer" or attorney/doctor
   substitute (UPL doctrine; *Janson v. LegalZoom* 2011; DoNotPay/FTC 2025; CO HB 26-1263).
2. **Patient signs and submits** their own appeal (keeps it pro-se self-help).
3. **Clinician-in-the-loop** for medical-necessity assertions — the AI assembles the treating
   doctor's evidence; it does not render a clinical opinion (mirrors CA SB 1120 logic).
4. **Substantiate every efficacy claim** before publishing; **disclose AI use** (UT SB 149/226).
5. **Privacy**: DTC app → FTC Health Breach Notification Rule (2024). HIPAA-grade security,
   no ad-tech data sharing (see GoodRx $1.5M, BetterHelp $7.8M). BAAs if we later handle PHI
   for providers/insurers (which flips us into HIPAA).
6. **Fees**: prefer flat/subscription; if contingency, don't collect before performance
   (CROA); screen stricter state debt-adjusting rules.

> Tailwind: regulators are cracking down on insurers' AI denials — the nH Predict suit alleges
> ~90% of those denials are reversed on appeal. We help people exercise rights regulators are reinforcing.

## 8. Key risks
- Two players ~18 months ahead (Counterforce free; Claimable funded).
- Consumer WTP is weak → must reach B2B2C revenue fast.
- Contingency is ops-heavy and cash-lumpy (biggest line in the model = biggest execution bet).
- Regulatory/positioning missteps (the DoNotPay failure mode).
- HIPAA-grade data burden from day one.

## 9. What would make this a huge company (honest)
Realistic base case: a strong $50–300M-revenue business. The path to more is becoming the
**default consumer interface to healthcare billing** — appeals → bills → benefits navigation →
the account every patient opens when the system wrongs them. That's a decade of execution, not the idea.
