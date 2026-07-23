// Stripe webhook. Mounted with a RAW body parser in index.js (before express.json) so the
// signature can be verified. On payment_intent.succeeded we flip the matching record to paid.
const { findOne, update } = require('../db');
const payments = require('../payments');

module.exports = async function webhook(req, res) {
  if (!payments.enabled()) return res.json({ received: true, note: 'stripe disabled' });
  let event;
  try {
    event = payments.constructEvent(req.body, req.headers['stripe-signature']);
  } catch (e) {
    return res.status(400).send(`Webhook signature verification failed: ${e.message}`);
  }
  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const payment = await findOne('payments', (p) => p.provider_ref === pi.id);
      if (payment) {
        await update('payments', payment.id, { status: 'succeeded' });
        if (payment.ref_type === 'appeal') await update('appeals', payment.ref_id, { paid: true });
      }
    } else if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      const userId = Number(s.metadata && s.metadata.user_id);
      if (userId && s.mode === 'subscription') {
        const { insert } = require('../db');
        const existing = await findOne('subscriptions', (x) => x.user_id === userId && x.status === 'active');
        if (!existing) await insert('subscriptions', { user_id: userId, status: 'active', plan: 'unlimited', price: 12, stripe_customer: s.customer, stripe_subscription: s.subscription, current_period_end: new Date(Date.now() + 30 * 86400000).toISOString() });
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const rec = await findOne('subscriptions', (x) => x.stripe_subscription === sub.id);
      if (rec) await update('subscriptions', rec.id, { status: 'canceled' });
    }
    res.json({ received: true });
  } catch (e) {
    console.error('webhook handler error', e);
    res.status(500).json({ error: 'handler failed' });
  }
};
