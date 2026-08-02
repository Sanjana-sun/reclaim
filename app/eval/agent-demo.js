// Demo + smoke test for the RAG retriever and the tool-use drafting agent.
//   node eval/agent-demo.js
// The retrieval half runs with no API key (BM25 is local). The agent half runs only if
// ANTHROPIC_API_KEY is set, and prints the plan → tool-call → citation trace.
const rag = require('../server/rag');
const { buildCorpus } = require('../server/legal/corpus');
const agent = require('../server/agent');
const { classify, draftAppeal } = require('../server/algorithm');

const QUERIES = [
  'prior authorization was an emergency, retroactive',
  'mental health therapy denied as not medically necessary',
  'out of network emergency room balance billing',
  'step therapy failed methotrexate biologic',
];

async function main() {
  const corpus = buildCorpus();
  console.log(`\nRAG retriever — ${corpus.length} legal passages indexed (federal, state, CARC)\n`);

  for (const q of QUERIES) {
    console.log(`  query: "${q}"`);
    for (const hit of rag.search(q, 3)) {
      console.log(`    ${hit.score.toFixed(3)}  [${hit.citation}]  ${hit.title}`);
    }
    console.log('');
  }

  // Tool smoke test — each tool returns something sensible without the model.
  console.log('Tool checks:');
  console.log('  lookup_denial_code(CO-197):', (await agent.execute('lookup_denial_code', { code: 'CO-197' })).slice(0, 90));
  console.log('  get_state_rules(CA):', (await agent.execute('get_state_rules', { state: 'CA' })).split('\n')[0].slice(0, 90));
  console.log('  check_bill_benchmark(99285,$2200):', (await agent.execute('check_bill_benchmark', { code: '99285', amount: 2200 })).slice(0, 90));

  const intake = { insurer: 'Aetna', plan: 'commercial', reason: 'prior_auth', service: 'CT scan', notes: 'It was an emergency; no time for precert.', state: 'CA', denialCode: 'CO-197' };
  const cls = await classify(intake);
  const mode = process.env.ANTHROPIC_API_KEY ? 'Claude tool-use agent' : 'free deterministic RAG drafter (no key)';
  console.log(`\nDrafting a sample appeal via the ${mode}...\n`);
  const { letter, citations, agentTrace } = await draftAppeal(intake, cls);
  console.log('Tools run (plan → retrieve):');
  (agentTrace || []).forEach((s) => console.log(`  → ${s.tool}(${JSON.stringify(s.input)})`));
  console.log('\nCitations grounded from retrieval:');
  (citations || []).forEach((c) => console.log(`  • ${c.title} [${c.citation}]`));
  console.log('\n--- letter (first 700 chars) ---\n' + letter.slice(0, 700) + '\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
