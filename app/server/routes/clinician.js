const express = require('express');
const router = express.Router();
const { find, findOne, update } = require('../db');
const { requireAuth } = require('../auth');

// Clinician review queue. Appeals that turn on medical necessity are queued for a licensed
// reviewer to confirm the physician-evidence framing — a QA layer, not a gate on the patient.
router.get('/queue', requireAuth(['clinician']), async (req, res, next) => {
  try {
    const pending = await find('appeals', (a) => a.review_status === 'pending');
    const recent = (await find('appeals', (a) => a.review_status === 'approved' || a.review_status === 'changes'))
      .sort((a, b) => (b.reviewed_at || '').localeCompare(a.reviewed_at || '')).slice(0, 10);
    res.json({ pending, recent });
  } catch (e) { next(e); }
});

router.get('/appeal/:id', requireAuth(['clinician']), async (req, res, next) => {
  try {
    const a = await findOne('appeals', (x) => x.id === +req.params.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json({ appeal: a });
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
    res.json({ appeal: updated });
  } catch (e) { next(e); }
});

module.exports = router;
