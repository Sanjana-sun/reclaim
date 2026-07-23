const express = require('express');
const router = express.Router();
const { insert, find, findOne, update } = require('../db');
const { requireAuth } = require('../auth');
const { classify, draftAppeal, recordOutcome } = require('../algorithm');

router.post('/', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const { insurer, plan, reason, service, drug, notes, providerCode } = req.body || {};
    const intake = { insurer, plan, reason, service, drug, notes };
    const cls = await classify(intake);
    const { letter, needsMedicalNecessity } = await draftAppeal(intake, cls);

    let sponsor = null;
    if (drug) {
      for (const org of await find('orgs', (o) => o.type === 'pharma')) {
        const prog = (org.meta.sponsored_programs || []).find((p) => p.drug.toLowerCase() === String(drug).toLowerCase() && p.spent < p.budget);
        if (prog) { sponsor = { org_id: org.id, rate: prog.rate }; break; }
      }
    }
    let provider_org_id = null;
    if (providerCode) { const org = await findOne('orgs', (o) => o.type === 'provider' && o.code.toLowerCase() === String(providerCode).toLowerCase()); if (org) provider_org_id = org.id; }

    const deadline = new Date(Date.now() + cls.deadlineDays * 86400000).toISOString();
    const appeal = await insert('appeals', {
      user_id: req.user.id, insurer, plan_type: cls.planType, reason: cls.reason, service, drug: drug || null,
      notes: notes || null, letter, status: 'draft', deadline, deadline_text: cls.deadlineText,
      needs_medical_necessity: needsMedicalNecessity, sponsor_org_id: sponsor ? sponsor.org_id : null,
      sponsor_rate: sponsor ? sponsor.rate : null, provider_org_id, amount_recovered: 0, paid: !!sponsor,
      review_status: needsMedicalNecessity ? 'pending' : 'not_required', reviewer_note: null,
    });
    res.json({ appeal, sponsored: !!sponsor });
  } catch (e) { next(e); }
});

router.get('/', requireAuth(['consumer']), async (req, res, next) => {
  try { res.json({ appeals: await find('appeals', (a) => a.user_id === req.user.id) }); } catch (e) { next(e); }
});

router.get('/:id', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const a = await findOne('appeals', (x) => x.id === +req.params.id && x.user_id === req.user.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json({ appeal: a });
  } catch (e) { next(e); }
});

router.put('/:id', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const a = await findOne('appeals', (x) => x.id === +req.params.id && x.user_id === req.user.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    const updated = await update('appeals', a.id, { letter: req.body.letter != null ? req.body.letter : a.letter });
    res.json({ appeal: updated });
  } catch (e) { next(e); }
});

router.post('/:id/submit', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const a = await findOne('appeals', (x) => x.id === +req.params.id && x.user_id === req.user.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    if (!a.paid) return res.status(402).json({ error: 'Payment required before submitting' });
    const updated = await update('appeals', a.id, { status: 'submitted', submitted_at: new Date().toISOString() });
    res.json({ appeal: updated });
  } catch (e) { next(e); }
});

router.post('/:id/outcome', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const a = await findOne('appeals', (x) => x.id === +req.params.id && x.user_id === req.user.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    const outcome = req.body.outcome === 'won' ? 'won' : 'lost';
    const amount = outcome === 'won' ? (Number(req.body.amountRecovered) || 0) : 0;
    const updated = await update('appeals', a.id, { status: outcome, amount_recovered: amount, outcome_at: new Date().toISOString() });
    await recordOutcome({ insurer: a.insurer, planType: a.plan_type, reason: a.reason, outcome });
    res.json({ appeal: updated });
  } catch (e) { next(e); }
});

module.exports = router;
