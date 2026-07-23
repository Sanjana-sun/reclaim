// Payment abstraction. STRIPE_SECRET_KEY set -> real Stripe PaymentIntents; else a stub
// that auto-succeeds so local/dev flows work end-to-end without keys.
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try { stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); } catch (e) { stripe = null; }
}

function enabled() { return !!stripe; }
function publishableKey() { return process.env.STRIPE_PUBLISHABLE_KEY || null; }

// Returns { provider, status, clientSecret?, id? }.
// stub: status 'succeeded' (safe to mark paid). stripe: a PaymentIntent whose clientSecret
// the frontend confirms; the webhook then flips the record to paid.
async function createCharge({ amountUsd, description, metadata }) {
  if (!stripe) return { provider: 'stub', status: 'succeeded' };
  const pi = await stripe.paymentIntents.create({
    amount: Math.round(amountUsd * 100),
    currency: 'usd',
    description,
    metadata: metadata || {},
    automatic_payment_methods: { enabled: true },
  });
  return { provider: 'stripe', status: pi.status, clientSecret: pi.client_secret, id: pi.id };
}

// Stripe Billing subscription checkout. Requires STRIPE_PRICE_ID. Returns { url } to redirect
// the customer to Stripe-hosted checkout; a webhook activates the subscription on completion.
async function createSubscriptionCheckout({ email, userId, successUrl, cancelUrl }) {
  if (!stripe || !process.env.STRIPE_PRICE_ID) return null;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    customer_email: email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { user_id: String(userId) },
    subscription_data: { metadata: { user_id: String(userId) } },
  });
  return { url: session.url, id: session.id };
}

// Verifies a Stripe webhook signature against the raw request body. Throws on bad signature.
function constructEvent(rawBody, signature) {
  if (!stripe) throw new Error('Stripe not configured');
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

module.exports = { enabled, publishableKey, createCharge, createSubscriptionCheckout, constructEvent };
