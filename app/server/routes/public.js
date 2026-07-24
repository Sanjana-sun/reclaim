const express = require('express');
const router = express.Router();
const { findOne } = require('../db');
const legal = require('../legal');

router.get('/states', (req, res) => res.json({ states: legal.listStates() }));

// PII-free "win" data for a shared appeal (the viral share loop).
router.get('/win/:token', async (req, res, next) => {
  try {
    const a = await findOne('appeals', (x) => x.share_token === req.params.token);
    if (!a) return res.status(404).json({ error: 'Not found' });
    res.json({ win: { service: a.service, insurer: a.insurer, reason: a.reason, amount_recovered: a.amount_recovered } });
  } catch (e) { next(e); }
});

// Public config for the frontend (e.g. analytics).
router.get('/config', (req, res) => res.json({
  analyticsDomain: process.env.ANALYTICS_DOMAIN || null,
  analyticsSrc: process.env.ANALYTICS_SRC || null,
}));

module.exports = router;
