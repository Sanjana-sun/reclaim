// State-specific rights for FULLY-INSURED plans (self-funded/ERISA plans are federally
// governed and generally exempt from state insurance law). Seeded with high-impact states and
// well-established protections. Citations are directional — verify current law with the state
// Department of Insurance. Not legal advice.
const COMMON = {
  externalReview: {
    id: 'state_external_review',
    title: 'State external review through the Department of Insurance',
    summary: 'For a fully-insured plan, if your internal appeal is denied you can request an independent external review through the state DOI; the reviewer\'s decision binds the insurer.',
    citation: 'State DOI external-review program',
    evidence: ['Final internal denial letter', 'External review request form (from the state DOI)'],
  },
  stepTherapy: {
    id: 'state_step_therapy_override',
    title: 'Step-therapy exception / override',
    summary: 'Most states require insurers to grant a step-therapy exception when the required drug was tried and failed, is contraindicated, or is expected to be ineffective, with a fast turnaround.',
    citation: 'State step-therapy override statute',
    evidence: ['Physician attestation of prior failure/intolerance/contraindication'],
  },
};

function s(name, extra = []) { return [COMMON.externalReview, COMMON.stepTherapy, ...extra]; }

module.exports = {
  CA: s('California', [{ id: 'ca_sb1120', title: 'Physician review of AI denials (CA SB 1120)', summary: 'A medical-necessity denial cannot be made solely by an algorithm; a licensed physician must review it. Strict UM timelines apply (5 business days standard / 72 hours urgent).', citation: 'California SB 1120 (2024, eff. 2025); Health & Safety Code', evidence: ['Ask whether an algorithm made the decision and demand physician review'] }]),
  NY: s('New York', [{ id: 'ny_dfs_external', title: 'New York external appeal (DFS)', summary: 'New York runs a robust external appeal program through the Department of Financial Services for medical-necessity and experimental/investigational denials.', citation: 'NY Ins. Law Art. 49; NY DFS', evidence: ['NY external appeal application'] }]),
  TX: s('Texas', [{ id: 'tx_hb3459', title: 'Prior-authorization "gold card" (TX HB 3459)', summary: 'Physicians with a strong approval history are exempt from prior authorization for certain services; onerous prior-auth denials can be challenged on this basis.', citation: 'Texas HB 3459 (2021)', evidence: ['Evidence the service should be exempt or was improperly required'] }]),
  FL: s('Florida'),
  IL: s('Illinois', [{ id: 'il_ai', title: 'Clinician review of medical-necessity denials', summary: 'Illinois requires a clinical peer to make adverse medical-necessity determinations; algorithms may not be the sole decision-maker.', citation: 'Illinois insurance regulations', evidence: ['Demand clinical-peer review'] }]),
  PA: s('Pennsylvania'),
  OH: s('Ohio'),
  GA: s('Georgia'),
  NJ: s('New Jersey'),
  WA: s('Washington', [{ id: 'wa_mhmda', title: 'My Health My Data (privacy)', summary: 'Washington provides strong consumer health-data privacy protections.', citation: 'WA My Health My Data Act (2023)', evidence: [] }]),
  MA: s('Massachusetts'),
};
