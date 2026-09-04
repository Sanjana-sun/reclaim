const express = require('express');
const router = express.Router();
const { insert, find, findOne, update } = require('../db');
const { requireAuth } = require('../auth');
const { detectBillErrors, draftDisputeLetter, fillDetails } = require('../algorithm');
const { buildPDF } = require('../pdfdoc');

router.post('/', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const { providerName, lineItems, patientName, accountNumber } = req.body || {};
    const items = Array.isArray(lineItems) ? lineItems : [];
    const total = items.reduce((s, li) => s + (Number(li.amount) || 0), 0);
    const { findings, estimatedSavings } = detectBillErrors(items);
    const rate = Number(process.env.CONTINGENCY_RATE) || 0.25;
    const bill = await insert('bills', {
      user_id: req.user.id, provider_name: providerName || null, total_amount: total,
      line_items: items, findings, estimated_savings: estimatedSavings,
      dispute_letter: null, status: 'reviewed', contingency_rate: rate, amount_saved: 0, fee_charged: 0,
    });
    const letter = fillDetails(draftDisputeLetter(bill, findings), { name: patientName, accountNumber, provider: providerName });
    const updated = await update('bills', bill.id, { dispute_letter: letter });
    res.json({ bill: updated });
  } catch (e) { next(e); }
});

// Download the dispute letter as a PDF (free — bill disputes monetize on realized savings).
router.get('/:id/download', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const b = await findOne('bills', (x) => x.id === +req.params.id && x.user_id === req.user.id);
    if (!b) return res.status(404).json({ error: 'Not found' });
    const pdf = await buildPDF(b.dispute_letter || '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Reclaim-bill-dispute-${b.id}.pdf"`);
    res.send(pdf);
  } catch (e) { next(e); }
});

router.get('/', requireAuth(['consumer']), async (req, res, next) => {
  try { res.json({ bills: await find('bills', (b) => b.user_id === req.user.id) }); } catch (e) { next(e); }
});

router.get('/:id', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const b = await findOne('bills', (x) => x.id === +req.params.id && x.user_id === req.user.id);
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json({ bill: b });
  } catch (e) { next(e); }
});

// Fee charged only AFTER savings are realized (CROA-safe).
router.post('/:id/outcome', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const b = await findOne('bills', (x) => x.id === +req.params.id && x.user_id === req.user.id);
    if (!b) return res.status(404).json({ error: 'Not found' });
    const saved = Number(req.body.amountSaved) || 0;
    const fee = Math.round(saved * b.contingency_rate);
    const updated = await update('bills', b.id, { amount_saved: saved, fee_charged: fee, status: 'resolved', resolved_at: new Date().toISOString() });
    await insert('payments', { user_id: req.user.id, ref_type: 'bill', ref_id: b.id, engine: 'contingency', amount: fee, status: 'succeeded' });
    res.json({ bill: updated, fee });
  } catch (e) { next(e); }
});

module.exports = router;
