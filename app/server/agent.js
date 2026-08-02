// Agentic drafter. Instead of a single prompt, Claude runs a plan → retrieve → draft loop:
// it decides which legal facts it needs, pulls them from the knowledge base through tools
// (RAG search over the corpus, plus targeted lookups), then writes an appeal grounded on the
// citations it actually retrieved. This is the reasoning-and-action / tool-use / RAG layer.
//
// It degrades safely: if there is no API key, the tool call fails, or the loop stalls, the
// caller (algorithm.js) falls back to the existing single-shot drafter and then the template.
const { callClaudeTools } = require('./llm');
const rag = require('./rag');
const legal = require('./legal');
const CARC = require('./legal/denialCodes');
const STATES = require('./legal/states');
const { REASON_HINTS } = require('./legal/corpus');
const verticals = require('./verticals');
const prompts = require('./prompts');

const TOOLS = [
  {
    name: 'search_legal_kb',
    description: 'Search the legal knowledge base (federal appeal rights, state protections, and CARC denial codes) for passages relevant to a denial. Use it to ground arguments in real citations before drafting. Returns ranked passages, each with a citation.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'What to look for, e.g. "prior authorization emergency retroactive" or "mental health parity".' } },
      required: ['query'],
    },
  },
  {
    name: 'lookup_denial_code',
    description: 'Look up a Claim Adjustment Reason Code (CARC) from the EOB, e.g. "197" or "CO-50", to get its meaning and the counter-argument.',
    input_schema: {
      type: 'object',
      properties: { code: { type: 'string', description: 'The CARC code, with or without a group prefix.' } },
      required: ['code'],
    },
  },
  {
    name: 'get_state_rules',
    description: 'Get the state-specific appeal rights (external review, step-therapy override, and any statute-level specifics) for a fully-insured plan in a US state.',
    input_schema: {
      type: 'object',
      properties: { state: { type: 'string', description: 'Two-letter state code, e.g. "CA".' } },
      required: ['state'],
    },
  },
  {
    name: 'get_federal_rights',
    description: 'Get the federal appeal rights that apply to a specific plan type and denial reason (ACA/ERISA review, No Surprises Act, mental-health parity, Medicare Advantage, etc.).',
    input_schema: {
      type: 'object',
      properties: {
        planType: { type: 'string', description: 'commercial | aca | erisa | ma' },
        reason: { type: 'string', description: 'The denial reason, e.g. medical_necessity, prior_auth, out_of_network.' },
        service: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['planType', 'reason'],
    },
  },
  {
    name: 'check_bill_benchmark',
    description: 'Check a billed CPT/HCPCS charge against typical benchmark amounts to see whether it looks overcharged, duplicated, or upcoded. Useful when the denial is really a billing dispute.',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The CPT/HCPCS code.' },
        amount: { type: 'number' },
        units: { type: 'number' },
      },
      required: ['code', 'amount'],
    },
  },
];

function normalizeCode(code) {
  return String(code || '').toUpperCase().replace(/^(CO|PR|OA|PI|CR)[-\s]?/, '').replace(/[^0-9A-Z]/g, '');
}

// Run one tool and return a compact string (the model reads these back as tool_result).
async function execute(name, input) {
  if (name === 'search_legal_kb') {
    const hits = rag.search(input.query || '', 4);
    if (!hits.length) return 'No matching passages found.';
    return hits.map((h) => `[${h.citation}] ${h.title}: ${h.text} (relevance ${h.score})`).join('\n');
  }
  if (name === 'lookup_denial_code') {
    const key = normalizeCode(input.code);
    const meta = CARC[key];
    if (!meta) return `No CARC entry for "${input.code}". Ask the patient to confirm the code from their EOB.`;
    return `CARC ${key} → reason "${meta.reason}". ${meta.note}`;
  }
  if (name === 'get_state_rules') {
    const st = String(input.state || '').toUpperCase().slice(0, 2);
    const rights = STATES[st];
    if (!rights) return `No state rules on file for "${input.state}".`;
    return rights.map((r) => `[${r.citation}] ${r.title}: ${r.summary}`).join('\n');
  }
  if (name === 'get_federal_rights') {
    const ctx = legal.retrieve({ planType: input.planType, reason: input.reason, service: input.service, notes: input.notes });
    const fed = ctx.rights.filter((r) => !/external review through the department/i.test(r.title));
    if (!fed.length) return 'No specific federal rights matched; rely on the general internal-appeal right.';
    return fed.map((r) => `[${r.citation}] ${r.title}: ${r.summary}`).join('\n');
  }
  if (name === 'check_bill_benchmark') {
    const { detectBillErrors } = require('./algorithm'); // lazy require avoids a circular init
    const { findings } = detectBillErrors([{ code: input.code, amount: input.amount, units: input.units || 1, desc: '' }]);
    if (!findings.length) return `No benchmark issue detected for ${input.code} at $${input.amount}.`;
    return findings.map((f) => `${f.type}: ${f.desc} (potential adjustment ~$${f.saving})`).join('\n');
  }
  return `Unknown tool "${name}".`;
}

const AGENT_SYSTEM = [
  prompts.DRAFT_SYSTEM,
  '',
  'WORKFLOW: Before writing, gather the facts you need with the tools. Plan which are relevant to THIS denial:',
  '- Look up the denial (CARC) code if the patient gave one.',
  '- Get the federal rights for the plan type and reason, and the state rules if a state is provided.',
  '- Use search_legal_kb for anything the specific facts raise (parity, surprise billing, step-therapy, etc.).',
  'Only cite rights and citations that the tools actually returned — never invent a statute, regulation, or case. If a tool returns nothing, do not cite it.',
  'When you have enough grounded material, write the appeal letter. Then STOP — output only the letter text.',
].join('\n');

// Draft an appeal via the tool-use agent. Returns { letter, citations, trace } or null.
async function draftWithRag(intake, cls) {
  const user = [
    prompts.draftUser(intake, cls),
    intake.denialCode ? `Denial (CARC) code on the EOB: ${intake.denialCode}` : '',
    cls.state ? `Patient state: ${cls.state}` : '',
    '',
    'Use the tools to gather the applicable rights and citations, then draft the internal appeal.',
  ].filter(Boolean).join('\n');

  const out = await callClaudeTools({ system: AGENT_SYSTEM, user, tools: TOOLS, execute, maxTokens: 1800 });
  if (!out || !out.text) return null;

  // Surface the citations the agent pulled from search results so the UI/record can show its sources.
  const citations = [];
  const seen = new Set();
  for (const step of out.trace) {
    if (step.tool !== 'search_legal_kb') continue;
    for (const h of rag.search(step.input.query || '', 4)) {
      if (seen.has(h.citation)) continue;
      seen.add(h.citation);
      citations.push({ title: h.title, citation: h.citation, source: h.source });
    }
  }
  return { letter: out.text, citations, trace: out.trace };
}

// ---------------------------------------------------------------------------
// Free, no-key path. Same retrieval + tools, but a deterministic planner runs them
// and assembles a grounded, cited appeal — no LLM, no API, always works offline.
// This is retrieval-augmented drafting: the citations come from what was retrieved.
// ---------------------------------------------------------------------------
function draftGrounded(intake, cls) {
  const trace = [];

  // Structured (predicate) retrieval — high-precision federal + state rights, code guidance, evidence.
  const ctx = legal.retrieve({ reason: cls.reason, planType: cls.planType, state: cls.state, denialCode: cls.denialCode, service: intake.service, notes: intake.notes });
  trace.push({ tool: 'get_federal_rights', input: { planType: cls.planType, reason: cls.reason } });
  if (cls.state) trace.push({ tool: 'get_state_rules', input: { state: cls.state } });
  if (cls.denialCode) trace.push({ tool: 'lookup_denial_code', input: { code: cls.denialCode } });

  // Lexical (BM25) retrieval — recall over the full corpus from the free-text facts.
  const query = [cls.reason, intake.service, intake.notes, REASON_HINTS[cls.reason] || ''].filter(Boolean).join(' ');
  const hits = rag.search(query, 5);
  trace.push({ tool: 'search_legal_kb', input: { query } });

  // Merge citations: predicate rights first, then any retrieved passages not already covered.
  const citations = [];
  const seen = new Set();
  for (const r of ctx.rights) { if (seen.has(r.citation)) continue; seen.add(r.citation); citations.push({ title: r.title, citation: r.citation, source: 'rights' }); }
  for (const h of hits) { if (seen.has(h.citation)) continue; seen.add(h.citation); citations.push({ title: h.title, citation: h.citation, source: h.source }); }

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const subject = (intake.service || '[service]') + (intake.drug ? ` (${intake.drug})` : '');
  const rightsBlock = ctx.rights.length
    ? '\nThe following appeal rights and protections apply to this request:\n' + ctx.rights.map((r) => `  • ${r.title} — ${r.citation}`).join('\n') + '\n'
    : '';
  const codeLine = ctx.codeGuidance ? `\nThe denial code on my EOB corresponds to: ${ctx.codeGuidance.note}\n` : '';
  const reasonArg = verticals.reasonArg(cls.vertical, cls.reason);
  const reasonCite = verticals.citation(cls.vertical, cls.reason);
  const mnLine = cls.needsMedicalNecessity
    ? '\nMy treating physician has determined that this service is medically necessary; their supporting statement and records are attached and should be reviewed by an appropriately qualified clinician.\n'
    : '';
  const evidence = (ctx.evidence && ctx.evidence.length)
    ? ctx.evidence.map((e, i) => `  (${i + 1}) ${e}`).join('\n')
    : '  (1) the denial letter, (2) my physician’s supporting documentation, (3) relevant medical records';

  const letter = `${today}

${intake.insurer || '[Insurer]'}
Attn: Appeals Department

Re: Appeal of claim denial — ${subject}
Member: [Your name]   Member ID: [Member ID]   Claim #: [claim number]${cls.denialCode ? `   Denial code: ${cls.denialCode}` : ''}

To the Appeals Department:

I am writing to formally appeal your denial of coverage for ${subject}, and I request that you overturn this denial and cover the claim.

${reasonArg}${reasonCite ? '\n' + reasonCite + '\n' : ''}${codeLine}${intake.notes ? `\nAdditional context:\n${intake.notes}\n` : ''}${rightsBlock}${mnLine}
I request a full and fair review of this appeal, including review by an appropriately qualified professional, and a written explanation of the decision citing the specific plan provisions relied upon.

Attached:
${evidence}

Sincerely,
[Your signature]
[Your name]
[Phone] · [Email]`;

  return { letter, citations, trace };
}

module.exports = { draftWithRag, draftGrounded, execute, TOOLS };
