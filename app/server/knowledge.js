// Lightweight insurer/denial knowledge base. The seed of the real moat: per-reason policy
// citations and evidence tips that strengthen the drafted appeal. Extend over time with
// insurer-specific policy language keyed on outcomes.
const KB = {
  medical_necessity: {
    citation: 'Coverage of medically necessary services is governed by the plan\'s own medical policy and generally accepted standards of medical practice.',
    tip: 'Attach the treating physician\'s letter of medical necessity plus relevant clinical guidelines.',
  },
  prior_auth: {
    citation: 'Prior-authorization requirements are subject to exception for emergent care and where authorization was requested; the claim should be reviewed on clinical merits.',
    tip: 'Note any emergency circumstances or a prior authorization request and its reference number.',
  },
  step_therapy: {
    citation: 'Plans are generally required to provide a step-therapy exception process for documented failure, intolerance, or contraindication of the preferred agent.',
    tip: 'Document each prior drug tried, with dates and outcomes, and any adverse reactions.',
  },
  experimental: {
    citation: 'A service is not "experimental/investigational" where it is supported by published clinical guidelines and standard practice for the condition.',
    tip: 'Cite the specific guidelines and peer-reviewed evidence your physician relies on.',
  },
  out_of_network: {
    citation: 'Network-adequacy and continuity-of-care protections, and the No Surprises Act, may require in-network cost-sharing where no in-network option was available.',
    tip: 'State whether care was emergent, referred, or lacked an in-network alternative.',
  },
  not_covered: {
    citation: 'The plan must identify the specific contractual exclusion relied upon; ambiguous exclusions are construed in the member\'s favor.',
    tip: 'Ask the plan to quote the exact plan language it relied on to deny the claim.',
  },
  coding: {
    citation: 'Claims must be adjudicated against correctly coded services; billing/coding errors are correctable and appealable.',
    tip: 'Attach the itemized statement and identify the specific coding error.',
  },
};

function lookup(reason) { return KB[reason] || null; }

module.exports = { KB, lookup };
