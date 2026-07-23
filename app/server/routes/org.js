const express = require('express');
const router = express.Router();
const { find, findOne, update } = require('../db');
const { requireAuth } = require('../auth');
const { winStats } = require('../algorithm');

router.get('/overview', requireAuth(['pharma', 'provider', 'employer']), async (req, res, next) => {
  try {
    const org = await findOne('orgs', (o) => o.id === req.user.org_id);
    if (!org) return res.status(404).json({ error: 'Org not found' });

    if (org.type === 'pharma') {
      const sponsored = await find('appeals', (a) => a.sponsor_org_id === org.id);
      const programs = (org.meta.sponsored_programs || []).map((p) => {
        const forDrug = sponsored.filter((a) => (a.drug || '').toLowerCase() === p.drug.toLowerCase());
        const won = forDrug.filter((a) => a.status === 'won').length;
        return { ...p, appeals: forDrug.length, won, winRate: forDrug.length ? Math.round((won / forDrug.length) * 100) : 0, scriptsUnlocked: won };
      });
      const spend = programs.reduce((s, p) => s + p.appeals * p.rate, 0);
      return res.json({ type: 'pharma', org: pub(org), programs, totalSponsored: sponsored.length, spend });
    }
    if (org.type === 'provider') {
      const appeals = await find('appeals', (a) => a.provider_org_id === org.id);
      const recovered = appeals.reduce((s, a) => s + (a.amount_recovered || 0), 0);
      const won = appeals.filter((a) => a.status === 'won').length;
      return res.json({ type: 'provider', org: pub(org), acv: org.meta.acv, appeals: appeals.length, won, winRate: appeals.length ? Math.round((won / appeals.length) * 100) : 0, recovered, stats: await winStats() });
    }
    const lives = org.meta.covered_lives, pmpm = org.meta.pmpm;
    return res.json({ type: 'employer', org: pub(org), coveredLives: lives, pmpm, annualRevenue: Math.round(lives * pmpm * 12), stats: await winStats() });
  } catch (e) { next(e); }
});

router.post('/sponsored-programs', requireAuth(['pharma']), async (req, res, next) => {
  try {
    const org = await findOne('orgs', (o) => o.id === req.user.org_id && o.type === 'pharma');
    if (!org) return res.status(403).json({ error: 'Forbidden' });
    const { drug, budget, rate } = req.body || {};
    if (!drug) return res.status(400).json({ error: 'Drug required' });
    org.meta.sponsored_programs = org.meta.sponsored_programs || [];
    const existing = org.meta.sponsored_programs.find((p) => p.drug.toLowerCase() === String(drug).toLowerCase());
    if (existing) { existing.budget = Number(budget) || existing.budget; existing.rate = Number(rate) || existing.rate; }
    else org.meta.sponsored_programs.push({ drug, budget: Number(budget) || 100000, spent: 0, rate: Number(rate) || 75 });
    const updated = await update('orgs', org.id, { meta: org.meta });
    res.json({ programs: updated.meta.sponsored_programs });
  } catch (e) { next(e); }
});

function pub(o) { return { id: o.id, name: o.name, type: o.type, code: o.code }; }
module.exports = router;
