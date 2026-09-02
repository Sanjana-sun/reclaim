// Federal appeal rights. Each entry has an `applies()` predicate and a real citation.
// These are well-established rights — but statutes/regs change; a healthcare-coverage
// attorney should review before production reliance. Nothing here is legal advice.
module.exports = [
  {
    id: 'aca_appeals',
    title: 'Right to internal appeal and independent external review',
    summary: 'Non-grandfathered plans must provide a full internal appeal and, if it fails, an independent external review whose decision is binding on the plan.',
    citation: 'ACA §2719, 42 U.S.C. §300gg-19; 29 CFR §2590.715-2719',
    evidence: ['A copy of the denial (adverse benefit determination) letter', 'Your plan documents (SPD/EOC)'],
    applies: ({ planType }) => ['commercial', 'aca'].includes(planType),
  },
  {
    id: 'erisa_full_fair_review',
    title: 'ERISA full-and-fair-review rights',
    summary: 'Self-funded employer plans must give a full and fair review, disclose the specific reasons and plan provisions relied on, provide the claim file free on request, and decide within strict timelines.',
    citation: '29 U.S.C. §1133; 29 CFR §2560.503-1',
    evidence: ['A written request for your complete claim file', 'The denial letter citing the exact plan provision'],
    applies: ({ planType }) => planType === 'erisa',
  },
  {
    id: 'ma_reconsideration',
    title: 'Medicare Advantage reconsideration rights',
    summary: 'MA organizations must offer reconsideration, medical-necessity denials must be reviewed by a physician/qualified professional, and cases auto-forward to an independent entity if upheld.',
    citation: '42 CFR Part 422, Subpart M',
    evidence: ['The Integrated Denial Notice', 'Your physician\'s supporting statement'],
    applies: ({ planType }) => planType === 'ma',
  },
  {
    id: 'no_surprises_act',
    title: 'No Surprises Act balance-billing protections',
    summary: 'Emergency care and out-of-network care at in-network facilities are protected from balance billing; you generally owe only in-network cost-sharing. Uninsured/self-pay patients get good-faith estimates and a dispute right if billed >$400 over estimate.',
    citation: 'No Surprises Act, 45 CFR Part 149 (2022)',
    evidence: ['Proof the facility was in-network or care was emergent', 'Any good-faith estimate you received'],
    applies: ({ reason }) => reason === 'out_of_network',
  },
  {
    id: 'mhpaea_parity',
    title: 'Mental Health Parity (MHPAEA)',
    summary: 'Plans cannot apply more restrictive limits, medical-necessity criteria, or prior-auth to mental-health/substance-use benefits than to comparable medical/surgical benefits. Ask for the plan\'s parity comparative analysis.',
    citation: 'Mental Health Parity and Addiction Equity Act, 29 U.S.C. §1185a',
    evidence: ['A request for the plan\'s NQTL comparative analysis', 'Notes showing the treatment is behavioral-health related'],
    // Deliberately narrow: a bare "therapy" match pulled parity law into physical-therapy and
    // occupational-therapy cases, and unanchored SUD/ABA matched inside "sudden"/"database".
    applies: ({ service, notes }) => /mental health|behavioral health|behavioral|psych|substance (use|abuse)|addiction|\bSUD\b|autism|\bABA\b|depression|anxiety|eating disorder|inpatient rehab/i.test(`${service || ''} ${notes || ''}`),
  },
  {
    id: 'medical_necessity_standard',
    title: 'Medical-necessity determinations must follow accepted standards',
    summary: 'A medical-necessity denial must be based on the plan\'s written clinical criteria and generally accepted standards of care, and (for many plans/states) reviewed by an appropriately qualified clinician.',
    citation: 'Plan medical policy; ACA/ERISA claims-procedure rules',
    evidence: ['Treating physician\'s letter of medical necessity', 'Relevant clinical guidelines your physician cites'],
    applies: ({ reason }) => ['medical_necessity', 'experimental', 'step_therapy'].includes(reason),
  },
];
