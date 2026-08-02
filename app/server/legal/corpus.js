// Retrieval corpus. Flattens the curated legal modules (federal rights, per-state rights,
// CARC denial codes) into a flat list of retrievable documents so the RAG retriever
// (../rag.js) can rank passages by relevance to a specific denial. Each document carries a
// real citation so the drafting agent can ground its appeal instead of inventing law.
//
// This is a retrieval index over the SAME curated knowledge the rules engine uses — not a
// new source of legal claims. Nothing here is legal advice; verify against current law.
const FEDERAL = require('./federal');
const STATES = require('./states');
const CARC = require('./denialCodes');

// Denial-reason phrasing that helps free-text notes match the right federal/state passages.
const REASON_HINTS = {
  medical_necessity: 'medical necessity not medically necessary clinical criteria treating physician',
  experimental: 'experimental investigational not proven guidelines standard of care',
  prior_auth: 'prior authorization precertification precert auth required retro emergency',
  step_therapy: 'step therapy fail first tried failed contraindicated override exception',
  out_of_network: 'out of network balance billing surprise emergency in-network cost sharing',
  not_covered: 'not covered exclusion benefit plan contract non-covered',
  coding: 'coding error correctable bundling upcoding duplicate resubmit',
};

let CACHE = null;

// Build the document list once. Returns [{ id, source, title, text, citation, tags[] }].
function buildCorpus() {
  if (CACHE) return CACHE;
  const docs = [];

  // Federal appeal rights.
  for (const r of FEDERAL) {
    docs.push({
      id: `federal:${r.id}`,
      source: 'federal',
      title: r.title,
      text: `${r.title}. ${r.summary} Evidence: ${(r.evidence || []).join('; ')}.`,
      citation: r.citation,
      tags: ['federal'],
    });
  }

  // State rights — dedupe by right id across states, tagging each with the states it covers.
  const stateDocs = new Map();
  for (const [code, rights] of Object.entries(STATES)) {
    for (const r of rights) {
      const existing = stateDocs.get(r.id);
      if (existing) { existing._states.add(code); continue; }
      stateDocs.set(r.id, {
        id: `state:${r.id}`,
        source: 'state',
        title: r.title,
        text: `${r.title}. ${r.summary} Evidence: ${(r.evidence || []).join('; ')}.`,
        citation: r.citation,
        tags: ['state'],
        _states: new Set([code]),
      });
    }
  }
  for (const d of stateDocs.values()) {
    const states = [...d._states];
    delete d._states;
    // A right present in every state is a general (near-universal) protection.
    d.tags = states.length >= Object.keys(STATES).length ? ['state', 'general'] : ['state', ...states.map((s) => `state:${s}`)];
    d.states = states;
    docs.push(d);
  }

  // CARC denial codes — one document per code so `search "precertification absent"` finds 197.
  for (const [code, meta] of Object.entries(CARC)) {
    const hint = REASON_HINTS[meta.reason] || '';
    docs.push({
      id: `carc:${code}`,
      source: 'carc',
      title: `CARC ${code} — ${meta.reason.replace(/_/g, ' ')}`,
      text: `Claim Adjustment Reason Code ${code}. ${meta.note} ${hint}`,
      citation: `X12 CARC ${code}`,
      tags: ['carc', `reason:${meta.reason}`],
      code,
      reason: meta.reason,
    });
  }

  CACHE = docs;
  return docs;
}

module.exports = { buildCorpus, REASON_HINTS };
