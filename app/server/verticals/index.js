// Vertical registry. Add new insurance lines here; everything else reads through getVertical().
const health = require('./health');

const registry = { health };
const DEFAULT = 'health';

function getVertical(key) { return registry[key] || registry[DEFAULT]; }
function validReasons(key) { return Object.keys(getVertical(key).reasons); }
function isMedicalNecessity(key, reason) { const r = getVertical(key).reasons[reason]; return !!(r && r.mn); }
function reasonArg(key, reason) { const r = getVertical(key).reasons[reason]; return r ? r.arg : ''; }
function citation(key, reason) { const r = getVertical(key).reasons[reason]; return r ? r.citation : null; }
function deadline(key, plan) { const d = getVertical(key).deadlines; return d[plan] || d.commercial; }
function list() { return Object.values(registry).map((v) => ({ key: v.key, label: v.label })); }

module.exports = { getVertical, validReasons, isMedicalNecessity, reasonArg, citation, deadline, list, DEFAULT };
