try { require('fs').readFileSync(require('path').join(__dirname, '..', '.env'), 'utf8').split('\n').forEach((l) => { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }); } catch (e) {}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const { init, backend } = require('./db');
const payments = require('./payments');
const { startReminders } = require('./reminders');
const email = require('./email');

const app = express();
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
// Stripe webhook needs the raw body for signature verification — mount BEFORE express.json.
app.post('/api/billing/webhook', express.raw({ type: '*/*' }), require('./routes/webhook'));
app.use(express.json({ limit: '8mb' }));
app.use(cookieParser());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.AUTH_RATE_MAX) || 100, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts, please try again later.' } });

app.use('/api/public', require('./routes/public'));
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/appeals', require('./routes/appeals'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/org', require('./routes/org'));
app.use('/api/clinician', require('./routes/clinician'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ ok: true, backend: backend(), llm: !!process.env.ANTHROPIC_API_KEY, stripe: payments.enabled(), email: email.enabled() }));

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
    console.log(`Email: ${email.enabled() ? 'Resend (ENABLED)' : 'dev console (set RESEND_API_KEY)'}`);
    console.log('Demo: patient@ / provider@ / pharma@ / employer@ / clinician@ / admin@overturn.dev — pw demo1234 (admin admin123)');
    startReminders();
  });
}).catch((e) => { console.error('Failed to start:', e); process.exit(1); });
