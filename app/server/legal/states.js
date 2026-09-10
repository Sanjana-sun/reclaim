// State-specific rights for FULLY-INSURED plans (self-funded/ERISA plans are federally
// governed and generally exempt from state insurance law).
//
// HONEST SCOPING: every state gets two protections that are genuinely near-universal —
// (1) ACA-mandated external review via the state DOI, and (2) a step-therapy exception process
// (most states, worded to prompt verification). A handful of states carry confirmed,
// statute-level specifics. We deliberately do NOT invent per-state statute numbers.
// Verify current law with the state Department of Insurance. Not legal advice.
const COMMON = {
  externalReview: {
    id: 'state_external_review',
    title: 'State external review through the Department of Insurance',
    summary: 'For a fully-insured plan, if your internal appeal is denied you can request an independent external review through your state DOI; the reviewer\'s decision binds the insurer.',
    citation: 'ACA-mandated external review; state DOI program (verify specifics)',
    // Stage-scoped: cite this right in the internal appeal, but don't tell the patient to
    // attach external-review paperwork to it. That comes later, if the internal appeal fails.
    stage: 'external',
    evidence: ['Final internal denial letter', 'External review request form (from the state DOI)'],
  },
  stepTherapy: {
    id: 'state_step_therapy_override',
    title: 'Step-therapy exception / override',
    summary: 'Most states require insurers to grant a step-therapy exception when the required drug was tried and failed, is contraindicated, or is medically inappropriate. Confirm your state\'s specific law and timelines.',
    citation: 'State step-therapy override law (verify specifics with your state DOI)',
    evidence: ['Physician attestation of prior failure/intolerance/contraindication'],
    // Only cite this where the denial is actually about fail-first. Citing a drug-tiering
    // statute in, say, an imaging appeal is noise at best and a credibility problem at worst.
    applies: ({ reason, notes }) => reason === 'step_therapy'
      || /step[- ]therapy|fail[- ]first|tried and failed|preferred (drug|agent|medication)|formulary tier/i.test(notes || ''),
  },
};

const SPECIFICS = {
  CA: [{ id: 'ca_sb1120', title: 'Physician review of AI denials (CA SB 1120)', summary: 'A medical-necessity denial cannot be made solely by an algorithm; a licensed physician must review it. Strict UM timelines apply (5 business days standard / 72 hours urgent).', citation: 'California SB 1120 (2024, eff. 2025)', evidence: ['Ask whether an algorithm made the decision and demand physician review'] }],
  MA: [{
    id: 'ma_opp_external',
    title: 'Massachusetts external review (Office of Patient Protection)',
    summary: 'Massachusetts runs external review through the Office of Patient Protection at the Health Policy Commission, not the Division of Insurance. You have 4 months from the final adverse determination to file. The fee is $25, capped at $75 per plan year, waivable for financial hardship. OPP assigns your case to one of several independent review organizations; the reviewer is a clinician in the relevant specialty and the decision is final and binding on the insurer. Standard review is decided in 45 days; expedited urgent review in 72 hours. Fully-insured Massachusetts-licensed plans only.',
    citation: 'M.G.L. c. 176O, §14; 958 CMR 3.00; MA Health Policy Commission, Office of Patient Protection',
    stage: 'external',
    supersedes: 'state_external_review',
    evidence: ['Final internal denial (adverse determination) letter', 'OPP External Review Request Form', 'The $25 filing fee, or a hardship waiver request'],
  }],
  NY: [{ id: 'ny_dfs_external', supersedes: 'state_external_review', title: 'New York external appeal (DFS)', summary: 'New York runs a robust external appeal program through the Department of Financial Services for medical-necessity and experimental/investigational denials.', citation: 'NY Ins. Law Art. 49; NY DFS', stage: 'external', evidence: ['NY external appeal application'] }],
  TX: [{ id: 'tx_hb3459', title: 'Prior-authorization "gold card" (TX HB 3459)', summary: 'Physicians with a strong approval history are exempt from prior authorization for certain services; onerous prior-auth denials can be challenged on this basis.', citation: 'Texas HB 3459 (2021)', evidence: ['Evidence the service should be exempt or was improperly required'] }],
  IL: [{ id: 'il_clinical_peer', title: 'Clinical-peer review of medical-necessity denials', summary: 'Illinois requires a clinical peer to make adverse medical-necessity determinations; algorithms may not be the sole decision-maker.', citation: 'Illinois insurance regulations', evidence: ['Demand clinical-peer review'] }],
  WA: [{ id: 'wa_mhmda', title: 'My Health My Data (privacy)', summary: 'Washington provides strong consumer health-data privacy protections.', citation: 'WA My Health My Data Act (2023)', evidence: [] }],
};

const NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
  LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

function s(extra) { return [COMMON.externalReview, COMMON.stepTherapy, ...(extra || [])]; }

module.exports = Object.fromEntries(Object.keys(NAMES).map((code) => [code, s(SPECIFICS[code])]));
