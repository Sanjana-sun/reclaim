// Access log. security.html tells patients "access is scoped and logged", so this is the
// thing that makes that sentence true. Every time a non-owner (clinician, admin) reads or
// acts on patient data, we write a row here.
//
// Deliberately records WHO touched WHAT and WHEN, never the data itself: no names, no member
// IDs, no letter text. An access log that copies the PII it is auditing is a second breach
// surface, not a control.
const { insert, find } = require('./db');

async function record({ actor, action, resource, resourceId, meta }) {
  try {
    await insert('audit', {
      actor_user_id: actor ? actor.id : null,
      actor_role: actor ? actor.role : 'anonymous',
      action,                       // e.g. 'read', 'review'
      resource,                     // e.g. 'appeal', 'queue', 'admin_metrics'
      resource_id: resourceId != null ? resourceId : null,
      meta: meta || null,           // small non-PII facts only, e.g. { count: 3 }
      at: new Date().toISOString(),
    });
  } catch (e) {
    // Never fail a request because the audit write failed, but make it loud in the logs.
    console.error('AUDIT WRITE FAILED', action, resource, resourceId, e.message);
  }
}

// Express helper: log after the handler succeeds.
function logAccess(action, resource, idFrom) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      record({ actor: req.user, action, resource, resourceId: idFrom ? idFrom(req) : null });
    });
    next();
  };
}

async function trail({ resourceId, actorId } = {}) {
  return (await find('audit', (a) => (resourceId == null || a.resource_id === resourceId)
    && (actorId == null || a.actor_user_id === actorId)))
    .sort((a, b) => (b.at || '').localeCompare(a.at || ''));
}

module.exports = { record, logAccess, trail };
