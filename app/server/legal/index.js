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

  // State rights apply to fully-insured plans (not self-funded/ERISA).
  const stateRights = (planType !== 'erisa' && state && STATES[state]) ? STATES[state] : [];

  // Normalize e.g. "CO-197" -> "197", "B7" -> "B7", strip group-code prefixes and separators.
  const key = denialCode ? String(denialCode).toUpperCase().replace(/^(CO|PR|OA|PI|CR)[-\s]?/, '').replace(/[^0-9A-Z]/g, '') : '';
  const code = key ? CARC[key] : null;

  const rights = [...federal, ...stateRights].map((r) => ({ id: r.id, title: r.title, summary: r.summary, citation: r.citation }));
  const evidence = uniq([...federal, ...stateRights].flatMap((r) => r.evidence || []));

  return { rights, evidence, codeGuidance: code || null };
}

function listStates() { return Object.keys(STATES); }

module.exports = { retrieve, listStates };
