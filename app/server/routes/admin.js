const express = require('express');
const router = express.Router();
const { find } = require('../db');
const { requireAuth } = require('../auth');
const { winStats } = require('../algorithm');
const audit = require('../audit');

router.get('/metrics', requireAuth(['admin']), async (req, res, next) => {
  try {
    const payments = await find('payments');
    const appeals = await find('appeals');
    const bills = await find('bills');
    const orgs = await find('orgs');
    const users = await find('users');

    const byEngine = { consumer: 0, contingency: 0, b2b2c: 0 };
    payments.forEach((p) => {
      if (p.engine === 'consumer') byEngine.consumer += p.amount;
      else if (p.engine === 'contingency') byEngine.contingency += p.amount;
      else byEngine.b2b2c += p.amount;
    });
    orgs.filter((o) => o.type === 'pharma').forEach((o) => {
      appeals.filter((a) => a.sponsor_org_id === o.id).forEach((a) => { byEngine.b2b2c += a.sponsor_rate || 0; });
    });
    orgs.filter((o) => o.type === 'provider').forEach((o) => { byEngine.b2b2c += (o.meta.acv || 0); });
    orgs.filter((o) => o.type === 'employer').forEach((o) => { byEngine.b2b2c += Math.round((o.meta.covered_lives || 0) * (o.meta.pmpm || 0) * 12); });

    await audit.record({ actor: req.user, action: 'read', resource: 'admin_metrics' });
    res.json({
      users: users.length, appeals: appeals.length, bills: bills.length, orgs: orgs.length,
      revenueByEngine: byEngine,
      totalRevenue: byEngine.consumer + byEngine.contingency + byEngine.b2b2c,
      winStats: await winStats(),
    });
  } catch (e) { next(e); }
});

// The access log, newest first. Read-only, and itself audited.
router.get('/audit', requireAuth(['admin']), async (req, res, next) => {
  try {
    const rows = await audit.trail({});
    await audit.record({ actor: req.user, action: 'read', resource: 'audit_log', meta: { rows: rows.length } });
    res.json({ audit: rows.slice(0, 500) });
  } catch (e) { next(e); }
});

module.exports = router;
