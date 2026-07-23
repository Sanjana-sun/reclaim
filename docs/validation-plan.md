# Overturn — Demand validation plan (run BEFORE heavy build)

Goal: cheaply prove that (1) people with denials want this, and (2) they'll pay — before
sinking months into engineering. Budget: ~$0–500 and ~2 weeks.

## What we're testing
- **Desire**: do people in denial actively want help drafting an appeal?
- **Willingness to pay**: will they pay ~$40/appeal (or subscribe)?
- **Channel**: does the organic/viral loop actually move people?
- **Beachhead fit**: which condition/community converts best?

## The tests (run in parallel)

### 1. Landing page + demo (the MVP prototype doubles as this)
Use `mvp/index.html` as a live landing page: hero → "generate a sample appeal" → email
capture for the beta + a fake "pay $40 to finalize" button that logs intent (the classic
price-probe). Measure: visit → generate → email → "pay" click-through.

### 2. Community outreach (no paid ads first)
Post genuinely helpful appeal guidance in 3–5 communities and link the demo:
- r/HealthInsurance, disease-specific subreddits (e.g. r/diabetes, r/Semaglutide),
  and Facebook groups for a specific chronic condition.
- Rule: lead with real help, not a pitch. Measure which community converts.

### 3. Concierge test (the highest-signal one)
Manually write 10–20 real appeals for real people for free, by hand + Claude, in one
community. This proves the letters actually win, generates testimonials/"$X reversed"
stories, and teaches you the template patterns — all before building automation.

### 4. Price probe
On a subset, ask directly: "If this had cost $40, would you have paid?" and offer a real
paid slot to 5–10 people. Actual dollars > survey answers.

## Kill / go criteria (decide honestly)
- **Go** if: demo→email conversion is healthy in ≥1 community, several concierge appeals win,
  and ≥1 in 5 price-probed users would actually pay.
- **Pivot** if: people want it but won't pay consumer prices → lean harder/earlier into the
  B2B2C (pharma/provider) model, where the money actually is.
- **Kill** if: even free concierge help gets little uptake in the highest-pain communities.

## Why this order
Consumer health WTP is historically weak. The concierge test is the cheapest way to learn
whether the whole "thin viral consumer top" assumption holds before you build it — and it
seeds the win-rate dataset and testimonials you'll need for the B2B2C conversations anyway.
