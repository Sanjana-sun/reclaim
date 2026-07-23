try { require('fs').readFileSync(require('path').join(__dirname, '..', '.env'), 'utf8').split('\n').forEach((l) => { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }); } catch (e) {}

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { init, backend } = require('./db');
const payments = require('./payments');

const app = express();
app.use(cors());
// Stripe webhook needs the raw body for signature verification — mount BEFORE express.json.
app.post('/api/billing/webhook', express.raw({ type: '*/*' }), require('./routes/webhook'));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/appeals', require('./routes/appeals'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/org', require('./routes/org'));
app.use('/api/clinician', require('./routes/clinician'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ ok: true, backend: backend(), llm: !!process.env.ANTHROPIC_API_KEY, stripe: payments.enabled() }));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });

const PORT = process.env.PORT || 3000;
init().then((be) => {
  app.listen(PORT, () => {
    console.log(`Overturn running on http://localhost:${PORT}`);
    console.log(`Data backend: ${be.toUpperCase()}${be === 'json' ? ' (set DATABASE_URL for Postgres)' : ''}`);
    console.log(`LLM drafting: ${process.env.ANTHROPIC_API_KEY ? 'Claude (ENABLED)' : 'template fallback (set ANTHROPIC_API_KEY)'}`);
    console.log(`Payments: ${payments.enabled() ? 'Stripe (ENABLED)' : 'stub (set STRIPE_SECRET_KEY)'}`);
    console.log('Demo: patient@ / provider@ / pharma@ / employer@ / admin@overturn.dev — pw demo1234 (admin admin123)');
  });
}).catch((e) => { console.error('Failed to start:', e); process.exit(1); });
