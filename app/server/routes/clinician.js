const express = require('express');
const router = express.Router();
const { find, findOne, update } = require('../db');
const { requireAuth } = require('../auth');
const { clinicianView } = require('../redact');
const audit = require('../audit');

// Clinician review queue. Appeals that turn on medical necessity are queued for a licensed
// reviewer to confirm the physician-evidence framing — a QA layer, not a gate on the patient.
//
// Reviewers see a minimum-necessary view: the clinical story and the argument, with the
// patient's name, address, member ID, claim number, phone and email stripped from both the
// record and the letter body (see ../redact.js). Every read is written to the access log.
router.get('/queue', requireAuth(['clinician']), async (req, res, next) => {
  try {
    const pending = await find('appeals', (a) => a.review_status === 'pending');
    const recent = (await find('appeals', (a) => a.review_status === 'approved' || a.review_status === 'changes'))
      .sort((a, b) => (b.reviewed_at || '').localeCompare(a.reviewed_at || '')).slice(0, 10);
    await audit.record({ actor: req.user, action: 'read', resource: 'clinician_queue', meta: { pending: pending.length, recent: recent.length } });
    res.json({ pending: pending.map(clinicianView), recent: recent.map(clinicianView) });
  } catch (e) { next(e); }
});

router.get('/appeal/:id', requireAuth(['clinician']), async (req, res, next) => {
  try {
    const a = await findOne('appeals', (x) => x.id === +req.params.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    await audit.record({ actor: req.user, action: 'read', resource: 'appeal', resourceId: a.id });
    res.json({ appeal: clinicianView(a) });
  } catch (e) { next(e); }
});

router.post('/:id/review', requireAuth(['clinician']), async (req, res, next) => {
  try {
    const a = await findOne('appeals', (x) => x.id === +req.params.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    const decision = req.body.decision === 'approved' ? 'approved' : 'changes';
    const updated = await update('appeals', a.id, {
      review_status: decision, reviewer_note: req.body.note || null,
      reviewed_by: req.user.name || req.user.email, reviewed_at: new Date().toISOString(),
    });
    await audit.record({ actor: req.user, action: 'review', resource: 'appeal', resourceId: a.id, meta: { decision } });
    res.json({ appeal: clinicianView(updated) });
  } catch (e) { next(e); }
});

module.exports = router;
