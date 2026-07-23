// Health-insurance vertical. To add a new line (e.g. disability/LTD), drop a sibling file with
// the same shape and register it in ./index.js — no algorithm changes needed.
module.exports = {
  key: 'health',
  label: 'Health insurance',
  deadlines: {
    commercial: { days: 180, text: 'Generally 180 days from the denial to file an internal appeal. Confirm the exact date on your denial letter.' },
    aca: { days: 180, text: '180 days to file an internal appeal; external review available afterward.' },
    ma: { days: 65, text: 'Medicare Advantage: generally 65 days to file a reconsideration. These are overturned at a high rate.' },
    erisa: { days: 180, text: 'Self-funded (ERISA) plans: typically 180 days. Deadlines are strict — file early.' },
  },
  reasons: {
    medical_necessity: {
      mn: true,
      arg: 'This service is medically necessary. My treating physician has determined it is required to diagnose or treat my condition, consistent with generally accepted standards of medical practice and the plan\'s own medical policy. My physician\'s statement of medical necessity and supporting records are attached.',
      citation: 'Coverage of medically necessary services is governed by the plan\'s own medical policy and generally accepted standards of medical practice.',
    },
    prior_auth: {
      mn: false,
      arg: 'The prior-authorization requirement should not bar payment here. Please review the claim on its clinical merits, taking into account the circumstances described below.',
      citation: 'Prior-authorization requirements are subject to exception for emergent care and where authorization was requested; the claim should be reviewed on clinical merits.',
    },
    experimental: {
      mn: true,
      arg: 'This treatment is not experimental or investigational for my condition. It is supported by published clinical guidelines and standard medical practice, as documented by my physician in the attached materials.',
      citation: 'A service is not "experimental/investigational" where it is supported by published clinical guidelines and standard practice for the condition.',
    },
    step_therapy: {
      mn: true,
      arg: 'A step-therapy exception is warranted. My physician supports this exception for the reasons described below and in the attached letter.',
      citation: 'Plans are generally required to provide a step-therapy exception process for documented failure, intolerance, or contraindication of the preferred agent.',
    },
    out_of_network: {
      mn: false,
      arg: 'Network-adequacy and continuity-of-care protections apply. Please reprocess the claim at the in-network rate given the circumstances described below.',
      citation: 'Network-adequacy and continuity-of-care protections, and the No Surprises Act, may require in-network cost-sharing where no in-network option was available.',
    },
    not_covered: {
      mn: false,
      arg: 'This service should be covered under the terms of my plan. Please identify the specific plan language relied on to deny it and reconsider in light of the attached documentation.',
      citation: 'The plan must identify the specific contractual exclusion relied upon; ambiguous exclusions are construed in the member\'s favor.',
    },
    coding: {
      mn: false,
      arg: 'This appears to be a coding or billing error. Please review the coding on the attached itemized statement and reprocess the claim correctly.',
      citation: 'Claims must be adjudicated against correctly coded services; billing/coding errors are correctable and appealable.',
    },
  },
};
