const { find, insert } = require('./db');
const { callClaude, callVision, available } = require('./llm');
const prompts = require('./prompts');
const verticals = require('./verticals');

const PROMPT_VERSION = 'v1';

// ---------------------------------------------------------------------------
// 1. Classifier — rules first; optional LLM refinement of free text.
// Vertical-specific reasons/deadlines come from the vertical registry.
// ---------------------------------------------------------------------------
async function classify(intake) {
  const vertical = verticals.getVertical(intake.vertical).key;
  const valid = verticals.validReasons(vertical);
  let reason = valid.includes(intake.reason) ? intake.reason : valid[0];
  const planType = verticals.getVertical(vertical).deadlines[intake.plan] ? intake.plan : 'commercial';

  if (available() && intake.notes && intake.notes.length > 20) {
    const out = await callClaude({
      model: process.env.CLASSIFY_MODEL,
      maxTokens: 20,
      system: prompts.classifySystem(valid),
      user: `Stated reason: ${intake.reason}; service: ${intake.service}; notes: ${intake.notes}`,
    });
    if (out) { const guess = out.trim().toLowerCase().replace(/[^a-z_]/g, ''); if (valid.includes(guess)) reason = guess; }
  }

  const d = verticals.deadline(vertical, planType);
  return {
    reason, planType, vertical,
    deadlineDays: d.days, deadlineText: d.text,
    needsMedicalNecessity: verticals.isMedicalNecessity(vertical, reason),
  };
}

// ---------------------------------------------------------------------------
// 2. Drafter — Claude if available, else template. Always run through linter.
// ---------------------------------------------------------------------------
async function draftAppeal(intake, cls) {
  let letter = null;
  if (available()) {
    letter = await callClaude({ system: prompts.DRAFT_SYSTEM, user: prompts.draftUser(intake, cls), maxTokens: 1400 });
  }
  if (!letter) letter = templateLetter(intake, cls);
  return lint(letter, cls);
}

function templateLetter(intake, cls) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const subject = (intake.service || '[service]') + (intake.drug ? ` (${intake.drug})` : '');
  return `${today}

${intake.insurer || '[Insurer]'}
Attn: Appeals Department

Re: Appeal of claim denial — ${subject}
Member: [Your name]   Member ID: [ID]   Claim #: [claim number]

To the Appeals Department:

I am writing to formally appeal your denial of coverage for ${subject}, and I request that you overturn this denial and cover the claim.

${verticals.reasonArg(cls.vertical, cls.reason)}
${verticals.citation(cls.vertical, cls.reason) ? '\n' + verticals.citation(cls.vertical, cls.reason) + '\n' : ''}
${intake.notes ? `Additional context:\n${intake.notes}\n` : ''}
I request a full and fair review of this appeal, including review by an appropriately qualified professional. Please provide a written explanation of your decision and the specific plan provisions relied upon.

Attached: (1) the denial letter, (2) my physician's supporting documentation, and (3) relevant medical records.

Sincerely,
[Your signature]
[Your name]
[Phone] · [Email]`;
}

// ---------------------------------------------------------------------------
// 3. Safety linter — strips guarantees / "lawyer" claims, appends disclaimer.
// ---------------------------------------------------------------------------
function lint(text, cls) {
  let t = text;
  const banned = [/\bwe guarantee\b/gi, /\bguaranteed\b/gi, /\bwill definitely win\b/gi, /\bas your (lawyer|attorney)\b/gi, /\brobot lawyer\b/gi];
  banned.forEach((re) => { t = t.replace(re, ''); });
  const disclaimer = '\n\n---\nPrepared with Overturn, a self-help document tool (not a law firm or medical provider; not legal or medical advice). You review, sign, and submit this appeal yourself.';
  if (!t.includes('self-help document tool')) t += disclaimer;
  return { letter: t.trim(), needsMedicalNecessity: cls.needsMedicalNecessity };
}

// ---------------------------------------------------------------------------
// 4. Medical-bill error / variance detection (contingency engine).
// ---------------------------------------------------------------------------
const BENCHMARK = { '99213': 120, '99214': 180, '99215': 250, '73721': 450, '80053': 45, '85025': 30, '36415': 12, '99284': 700, '99285': 1100, '70450': 900 };

function detectBillErrors(lineItems) {
  const findings = [];
  const seen = {};
  lineItems.forEach((li, idx) => {
    const code = String(li.code || '').trim();
    const amount = Number(li.amount) || 0;
    const units = Number(li.units) || 1;
    const key = code + '|' + amount;
    if (seen[key]) findings.push({ line: idx + 1, type: 'duplicate', code, desc: `Duplicate charge for ${code} (${li.desc || ''})`, saving: amount });
    seen[key] = true;
    const bench = BENCHMARK[code];
    if (bench && amount > bench * 1.5) findings.push({ line: idx + 1, type: 'above_benchmark', code, desc: `${code} billed at $${amount}, well above typical ~$${bench}`, saving: Math.round(amount - bench) });
    if (units > 1 && bench) {
      const expected = bench * units;
      if (amount > expected * 1.4) findings.push({ line: idx + 1, type: 'unit_overcharge', code, desc: `${units} units of ${code} billed at $${amount} vs expected ~$${expected}`, saving: Math.round(amount - expected) });
    }
    if (/level 5|comprehensive|highest/i.test(li.desc || '') && (code === '99215' || code === '99285')) {
      findings.push({ line: idx + 1, type: 'possible_upcoding', code, desc: `${code} is a highest-complexity code — verify the visit supports it`, saving: Math.round(amount * 0.4) });
    }
  });
  const estimatedSavings = findings.reduce((s, f) => s + (f.saving || 0), 0);
  return { findings, estimatedSavings };
}

function draftDisputeLetter(bill, findings) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const lines = findings.map((f) => `  • Line ${f.line} (${f.code}) — ${f.desc}. Requested adjustment: ~$${f.saving}.`).join('\n');
  const letter = `${today}

${bill.provider_name || '[Provider]'}
Attn: Billing Department

Re: Itemized bill review and dispute
Patient: [Your name]   Account #: [account number]   Total billed: $${bill.total_amount}

To the Billing Department:

I have reviewed the itemized statement for the above account and identified the following items I believe are billed in error. I request that they be corrected and the balance adjusted before any payment or collection activity proceeds:

${lines || '  • [No automated findings — attach itemized bill for manual review.]'}

Please send a corrected itemized statement reflecting these adjustments. I am happy to discuss, and I request that collection activity be paused while this dispute is reviewed.

Sincerely,
[Your signature]
[Your name]
[Phone] · [Email]

---
Prepared with Overturn, a self-help document tool. Not legal advice. You review, sign, and submit this dispute yourself.`;
  return letter;
}

// ---------------------------------------------------------------------------
// 5. Win-rate data flywheel (deidentified — the compounding moat).
// ---------------------------------------------------------------------------
async function recordOutcome({ insurer, planType, reason, outcome, vertical }) {
  await insert('winrate', { insurer, plan_type: planType, reason, outcome, vertical: vertical || 'health', prompt_version: PROMPT_VERSION });
}

// Extract intake fields from a photo/PDF of a denial letter (Claude vision; null if no key).
async function parseDenial(dataUrl) {
  if (!available() || !dataUrl) return null;
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  const out = await callVision({
    mediaType: m[1], base64: m[2],
    system: 'You extract structured fields from a US health-insurance denial letter. Output ONLY JSON.',
    prompt: `Return JSON with keys: insurer (string), plan (one of commercial|aca|ma|erisa or ""), reason (one of ${verticals.validReasons('health').join('|')} or ""), service (string), drug (string), notes (short summary string). Use "" if unknown.`,
  });
  if (!out) return null;
  try { const j = out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1); return JSON.parse(j); } catch (e) { return null; }
}

function externalReviewLetter(appeal) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `${today}

Independent Review Organization / State External Review
Re: Request for external review — ${appeal.service || '[service]'}${appeal.drug ? ` (${appeal.drug})` : ''}
Plan: ${appeal.insurer || '[Insurer]'}   Member: [Your name]   Claim #: [claim number]

To the Independent Reviewer:

My internal appeal for the above service was denied. I am requesting an independent external
review of that decision. The service is appropriate and covered for the reasons documented in my
internal appeal and my treating physician's records, which are attached.

I request that the denial be overturned and the claim paid.

Sincerely,
[Your signature]
[Your name]

---
Prepared with Overturn, a self-help document tool. Not legal or medical advice. You review, sign, and submit this request yourself.`;
}

async function winStats() {
  const rows = await find('winrate');
  const by = (keyFn) => {
    const m = {};
    rows.forEach((r) => {
      const k = keyFn(r);
      m[k] = m[k] || { won: 0, total: 0 };
      m[k].total++; if (r.outcome === 'won') m[k].won++;
    });
    return Object.entries(m).map(([k, v]) => ({ key: k, won: v.won, total: v.total, rate: v.total ? Math.round((v.won / v.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  };
  const overall = rows.length ? Math.round((rows.filter((r) => r.outcome === 'won').length / rows.length) * 100) : 0;
  return { overall, total: rows.length, byInsurer: by((r) => r.insurer), byReason: by((r) => r.reason) };
}

module.exports = { classify, draftAppeal, lint, detectBillErrors, draftDisputeLetter, recordOutcome, winStats, parseDenial, externalReviewLetter, PROMPT_VERSION };
