const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { insert, find, findOne, update } = require('../db');
const { requireAuth } = require('../auth');
const { classify, draftAppeal, recordOutcome, parseDenial, externalReviewLetter, fillDetails } = require('../algorithm');
const { buildPDF } = require('../pdfdoc');

// Extract intake fields from an uploaded denial letter (image/PDF as a data URL).
router.post('/parse', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const fields = await parseDenial((req.body || {}).file);
    res.json({ extracted: fields });
  } catch (e) { next(e); }
});

router.post('/', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const { insurer, plan, reason, service, drug, notes, providerCode, state, denialCode, name, address, memberId, claimNumber, phone, email } = req.body || {};
    const intake = { insurer, plan, reason, service, drug, notes, state, denialCode };
    const cls = await classify(intake);
    const drafted = await draftAppeal(intake, cls);
    const { needsMedicalNecessity, rights, evidence, codeGuidance } = drafted;
    const details = { name, address, memberId, claimNumber, phone, email };
    const letter = fillDetails(drafted.letter, details);

    let sponsor = null;
    if (drug) {
      for (const org of await find('orgs', (o) => o.type === 'pharma')) {
        const prog = (org.meta.sponsored_programs || []).find((p) => p.drug.toLowerCase() === String(drug).toLowerCase() && p.spent < p.budget);
        if (prog) { sponsor = { org_id: org.id, rate: prog.rate }; break; }
      }
    }
    let provider_org_id = null;
    if (providerCode) { const org = await findOne('orgs', (o) => o.type === 'provider' && o.code.toLowerCase() === String(providerCode).toLowerCase()); if (org) provider_org_id = org.id; }

    // Everyone's first appeal is free; sponsored appeals are always free to the patient.
    const priorAppeals = (await find('appeals', (a) => a.user_id === req.user.id)).length;
    const firstFree = priorAppeals === 0;

    const deadline = new Date(Date.now() + cls.deadlineDays * 86400000).toISOString();
    const appeal = await insert('appeals', {
      user_id: req.user.id, vertical: cls.vertical, insurer, plan_type: cls.planType, reason: cls.reason, service, drug: drug || null,
      state: state || null, denial_code: denialCode || null, notes: notes || null, letter, details, status: 'draft',
      deadline, deadline_text: cls.deadlineText, rights: rights || [], evidence: evidence || [], code_guidance: codeGuidance || null,
      needs_medical_necessity: needsMedicalNecessity, sponsor_org_id: sponsor ? sponsor.org_id : null,
      sponsor_rate: sponsor ? sponsor.rate : null, provider_org_id, amount_recovered: 0,
      paid: !!sponsor || firstFree, free_first: firstFree,
      review_status: needsMedicalNecessity ? 'pending' : 'not_required', reviewer_note: null,
    });
    res.json({ appeal, sponsored: !!sponsor, firstFree });
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

// Download the finished, filled-in appeal as a PDF. Gated on payment (first appeal is free).
router.get('/:id/download', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const a = await findOne('appeals', (x) => x.id === +req.params.id && x.user_id === req.user.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    if (!a.paid) return res.status(402).json({ error: 'Payment required to download your finished appeal' });
    const pdf = await buildPDF(a.letter);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Overturn-appeal-${a.id}.pdf"`);
    res.send(pdf);
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
    await recordOutcome({ insurer: a.insurer, planType: a.plan_type, reason: a.reason, outcome, vertical: a.vertical });
    res.json({ appeal: updated });
  } catch (e) { next(e); }
});

// After a lost internal appeal, request an independent external review.
router.post('/:id/external-review', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const a = await findOne('appeals', (x) => x.id === +req.params.id && x.user_id === req.user.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    if (a.status !== 'lost') return res.status(400).json({ error: 'External review is available after an internal appeal is denied' });
    const deadline = new Date(Date.now() + 120 * 86400000).toISOString();
    const updated = await update('appeals', a.id, { status: 'external_review', external_letter: externalReviewLetter(a), external_deadline: deadline });
    res.json({ appeal: updated });
  } catch (e) { next(e); }
});

// Generate a public, PII-free share link for a won appeal (the viral loop).
router.post('/:id/share', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const a = await findOne('appeals', (x) => x.id === +req.params.id && x.user_id === req.user.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    if (a.status !== 'won') return res.status(400).json({ error: 'You can share once an appeal is overturned' });
    let token = a.share_token;
    if (!token) { token = crypto.randomBytes(9).toString('hex'); await update('appeals', a.id, { share_token: token }); }
    res.json({ token, url: `${req.body.origin || ''}/win.html?t=${token}` });
  } catch (e) { next(e); }
});

module.exports = router;
