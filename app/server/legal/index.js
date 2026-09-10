// Legal rights retrieval. Given a denial context, returns the applicable federal + state
// rights (each with a citation), an evidence checklist, and any CARC-code guidance.
// This is a curated knowledge base, not legal advice — have counsel review before production.
const FEDERAL = require('./federal');
const STATES = require('./states');
const CARC = require('./denialCodes');

function uniq(arr) { return [...new Set(arr)]; }

function retrieve({ reason, planType, state, denialCode, service, notes } = {}) {
  const ctx = { reason, planType, state, denialCode, service, notes };

  const federal = FEDERAL.filter((r) => { try { return r.applies(ctx); } catch (e) { return false; } });

  // State rights apply to fully-insured plans (not self-funded/ERISA). An entry may carry its
  // own `applies()` predicate; entries without one are treated as universally applicable.
  const inState = (planType !== 'erisa' && state && STATES[state]) ? STATES[state] : [];
  const applicable = inState.filter((r) => {
    if (typeof r.applies !== 'function') return true;
    try { return r.applies(ctx); } catch (e) { return false; }
  });
  // A verified state-specific right can supersede a generic one. Massachusetts, for example,
  // runs external review through the Office of Patient Protection rather than the Division of
  // Insurance, so citing the generic "through your state DOI" entry alongside it would be both
  // redundant and wrong.
  const superseded = new Set(applicable.map((r) => r.supersedes).filter(Boolean));
  const stateRights = applicable.filter((r) => !superseded.has(r.id));

  // Normalize e.g. "CO-197" -> "197", "B7" -> "B7", strip group-code prefixes and separators.
  const key = denialCode ? String(denialCode).toUpperCase().replace(/^(CO|PR|OA|PI|CR)[-\s]?/, '').replace(/[^0-9A-Z]/g, '') : '';
  const code = key ? CARC[key] : null;

  const rights = [...federal, ...stateRights].map((r) => ({ id: r.id, title: r.title, summary: r.summary, citation: r.citation }));
  // Only gather evidence for the stage the patient is actually at. Rights marked
  // stage: 'external' are still cited, but their paperwork belongs to the external-review step.
  const evidence = uniq([...federal, ...stateRights].filter((r) => r.stage !== 'external').flatMap((r) => r.evidence || []));

  return { rights, evidence, codeGuidance: code || null };
}

function listStates() { return Object.keys(STATES); }

module.exports = { retrieve, listStates };
