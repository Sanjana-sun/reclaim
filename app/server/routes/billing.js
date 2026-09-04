const express = require('express');
const router = express.Router();
const { insert, findOne, update, find } = require('../db');
const { requireAuth } = require('../auth');
const payments = require('../payments');

router.get('/config', (req, res) => res.json({ stripeEnabled: payments.enabled(), publishableKey: payments.publishableKey(), appealPrice: Number(process.env.APPEAL_PRICE) || 10 }));

router.post('/pay-appeal/:id', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const a = await findOne('appeals', (x) => x.id === +req.params.id && x.user_id === req.user.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    if (a.paid) return res.json({ appeal: a, alreadyPaid: true });
    const price = Number(process.env.APPEAL_PRICE) || 10;
    const charge = await payments.createCharge({ amountUsd: price, description: 'Overturn appeal ' + a.id, metadata: { appeal_id: a.id, user_id: req.user.id } });
    await insert('payments', { user_id: req.user.id, engine: 'consumer', amount: price, status: charge.status, provider: charge.provider, ref_type: 'appeal', ref_id: a.id, provider_ref: charge.id || null });
    // Stub (no Stripe key) succeeds immediately. With Stripe, the client confirms the
    // clientSecret and a webhook flips `paid` in production.
    let appeal = a;
    if (charge.status === 'succeeded') appeal = await update('appeals', a.id, { paid: true });
    res.json({ appeal, charged: price, provider: charge.provider, clientSecret: charge.clientSecret || null });
  } catch (e) { next(e); }
});

router.post('/subscribe', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const existing = await findOne('subscriptions', (s) => s.user_id === req.user.id && s.status === 'active');
    if (existing) return res.json({ subscription: existing });
    const origin = req.body.origin || `http://localhost:${process.env.PORT || 3000}`;
    // Stripe Billing path: hosted checkout, activated by the webhook.
    const checkout = await payments.createSubscriptionCheckout({
      email: req.user.email, userId: req.user.id,
      successUrl: `${origin}/dashboard.html?sub=success`, cancelUrl: `${origin}/dashboard.html?sub=cancel`,
    });
    if (checkout) return res.json({ checkoutUrl: checkout.url });
    // Stub path (no Stripe): activate immediately.
    const sub = await insert('subscriptions', { user_id: req.user.id, status: 'active', plan: 'unlimited', price: 12, current_period_end: new Date(Date.now() + 30 * 86400000).toISOString() });
    await insert('payments', { user_id: req.user.id, engine: 'consumer', amount: 12, status: 'succeeded', provider: 'stub', ref_type: 'subscription', ref_id: sub.id });
    res.json({ subscription: sub });
  } catch (e) { next(e); }
});

router.post('/cancel', requireAuth(['consumer']), async (req, res, next) => {
  try {
    const sub = await findOne('subscriptions', (s) => s.user_id === req.user.id && s.status === 'active');
    if (!sub) return res.status(404).json({ error: 'No active subscription' });
    const updated = await update('subscriptions', sub.id, { status: 'canceled', canceled_at: new Date().toISOString() });
    res.json({ subscription: updated });
  } catch (e) { next(e); }
});

router.get('/mine', requireAuth(['consumer']), async (req, res, next) => {
  try {
    res.json({
      payments: await find('payments', (p) => p.user_id === req.user.id),
      subscription: (await findOne('subscriptions', (s) => s.user_id === req.user.id && s.status === 'active')) || null,
      stripeEnabled: payments.enabled(),
    });
  } catch (e) { next(e); }
});

module.exports = router;
