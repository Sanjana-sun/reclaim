// Eval harness for the appeal drafter + bill detector.
// Runs against server/algorithm.js. With no ANTHROPIC_API_KEY it validates the template +
// safety-linter guardrails; with a key it validates real Claude output the same way.
// Usage: npm run eval   (exit code 1 if any case fails)
const { classify, draftAppeal, detectBillErrors } = require('../server/algorithm');

const BANNED = [/\bguarantee\b/i, /\brobot lawyer\b/i, /\bas your (lawyer|attorney)\b/i, /\bwe will win\b/i];

const CASES = [
  { name: 'medical necessity → cites physician', intake: { insurer: 'Aetna', plan: 'commercial', reason: 'medical_necessity', service: 'MRI lumbar spine', notes: 'Surgeon ordered it.' },
    checks: { mustInclude: ['appeal', 'Appeals Department', 'physician'], needsMN: true } },
  { name: 'step therapy → exception framing', intake: { insurer: 'Cigna', plan: 'aca', reason: 'step_therapy', service: 'biologic', drug: 'Humira', notes: 'Failed methotrexate.' },
    checks: { mustInclude: ['appeal', 'exception'], needsMN: true } },
  { name: 'prior auth → merits review', intake: { insurer: 'UnitedHealthcare', plan: 'ma', reason: 'prior_auth', service: 'CT scan', notes: 'Was an emergency.' },
    checks: { mustInclude: ['appeal', 'merits'], needsMN: false } },
  { name: 'out of network → in-network rate', intake: { insurer: 'Anthem', plan: 'erisa', reason: 'out_of_network', service: 'ER visit', notes: 'No in-network ER nearby.' },
    checks: { mustInclude: ['appeal', 'in-network'], needsMN: false } },
  { name: 'experimental → guidelines', intake: { insurer: 'Aetna', plan: 'commercial', reason: 'experimental', service: 'proton therapy', notes: 'Oncologist recommended.' },
    checks: { mustInclude: ['appeal', 'guidelines'], needsMN: true } },
];

async function run() {
  let pass = 0, fail = 0;
  console.log(`\nOverturn eval — LLM ${process.env.ANTHROPIC_API_KEY ? 'ENABLED' : 'template mode'}\n`);
  for (const c of CASES) {
    const cls = await classify(c.intake);
    const { letter, needsMedicalNecessity } = await draftAppeal(c.intake, cls);
    const errs = [];
    (c.checks.mustInclude || []).forEach((s) => { if (!new RegExp(s, 'i').test(letter)) errs.push(`missing "${s}"`); });
    BANNED.forEach((re) => { if (re.test(letter)) errs.push(`banned phrase ${re}`); });
    if (!/self-help document tool/i.test(letter)) errs.push('missing disclaimer');
    if (c.checks.needsMN && !needsMedicalNecessity) errs.push('should flag medical necessity');
    if (!cls.deadlineText) errs.push('missing deadline');
    if (errs.length) { fail++; console.log(`  ✗ ${c.name}\n      ${errs.join('; ')}`); }
    else { pass++; console.log(`  ✓ ${c.name}`); }
  }

  // Bill detector checks
  const bill = detectBillErrors([
    { code: '99285', desc: 'ER visit level 5', amount: 2200, units: 1 },
    { code: '73721', desc: 'MRI knee', amount: 1800, units: 1 },
    { code: '73721', desc: 'MRI knee', amount: 1800, units: 1 },
  ]);
  const dupFound = bill.findings.some((f) => f.type === 'duplicate');
  const savings = bill.estimatedSavings > 0;
  if (dupFound && savings) { pass++; console.log('  ✓ bill detector finds duplicate + savings'); }
  else { fail++; console.log('  ✗ bill detector missed duplicate/savings'); }

  const total = pass + fail;
  console.log(`\n${pass}/${total} passed (${Math.round((pass / total) * 100)}%)\n`);
  process.exit(fail ? 1 : 0);
}
run().catch((e) => { console.error(e); process.exit(1); });
