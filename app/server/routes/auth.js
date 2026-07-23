const express = require('express');
const router = express.Router();
const { insert, findOne, update, remove } = require('../db');
const { hash, verify, sign, requireAuth } = require('../auth');

const ROLE_BY_CODE = { PHARMA: 'pharma', PROVIDER: 'provider', EMPLOYER: 'employer', CLINICIAN: 'clinician' };

router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name, orgCode } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (await findOne('users', (u) => u.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ error: 'Email already registered' });

    let role = 'consumer', org_id = null;
    if (orgCode) {
      const org = await findOne('orgs', (o) => o.code.toLowerCase() === String(orgCode).toLowerCase());
      if (!org) return res.status(400).json({ error: 'Invalid organization code' });
      role = ROLE_BY_CODE[org.code.toUpperCase()] || 'consumer';
      org_id = org.id;
    }
    const user = await insert('users', { email, password_hash: hash(password), role, org_id, name: name || email.split('@')[0] });
    res.json({ token: sign(user), user: safe(user) });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const user = await findOne('users', (u) => u.email.toLowerCase() === String(email || '').toLowerCase());
    if (!user || !verify(password || '', user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: sign(user), user: safe(user) });
  } catch (e) { next(e); }
});

router.get('/me', requireAuth(), (req, res) => res.json({ user: safe(req.user) }));

router.put('/me', requireAuth(), async (req, res, next) => {
  try {
    const patch = {};
    if (req.body.name != null) patch.name = String(req.body.name).slice(0, 120);
    const updated = await update('users', req.user.id, patch);
    res.json({ user: safe(updated) });
  } catch (e) { next(e); }
});

router.post('/change-password', requireAuth(), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    if (!verify(currentPassword || '', req.user.password_hash)) return res.status(403).json({ error: 'Current password is incorrect' });
    await update('users', req.user.id, { password_hash: hash(newPassword) });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/change-email', requireAuth(), async (req, res, next) => {
  try {
    const { password, newEmail } = req.body || {};
    if (!newEmail || !/.+@.+\..+/.test(newEmail)) return res.status(400).json({ error: 'Enter a valid email' });
    if (!verify(password || '', req.user.password_hash)) return res.status(403).json({ error: 'Password is incorrect' });
    if (await findOne('users', (u) => u.email.toLowerCase() === newEmail.toLowerCase() && u.id !== req.user.id)) return res.status(409).json({ error: 'Email already in use' });
    const updated = await update('users', req.user.id, { email: newEmail });
    res.json({ user: safe(updated) });
  } catch (e) { next(e); }
});

// Delete account + all associated data (right-to-delete).
router.delete('/me', requireAuth(), async (req, res, next) => {
  try {
    const uid = req.user.id;
    await remove('appeals', (a) => a.user_id === uid);
    await remove('bills', (b) => b.user_id === uid);
    await remove('payments', (p) => p.user_id === uid);
    await remove('subscriptions', (s) => s.user_id === uid);
    await remove('users', (u) => u.id === uid);
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

function safe(u) { return { id: u.id, email: u.email, role: u.role, org_id: u.org_id, name: u.name }; }

module.exports = router;
