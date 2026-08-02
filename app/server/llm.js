// Thin Anthropic wrapper. Returns null on any failure so callers fall back to templates.
const API_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude({ model, system, user, maxTokens = 1500 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || process.env.DRAFT_MODEL || 'claude-opus-4-8',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.content && data.content[0] && data.content[0].text) || null;
  } catch (e) {
    return null;
  }
}

// Vision/document extraction: pass a base64 image or PDF plus a prompt.
async function callVision({ model, system, prompt, base64, mediaType, maxTokens = 500 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const block = mediaType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: model || process.env.DRAFT_MODEL || 'claude-opus-4-8',
        max_tokens: maxTokens, system,
        messages: [{ role: 'user', content: [block, { type: 'text', text: prompt }] }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.content && data.content[0] && data.content[0].text) || null;
  } catch (e) { return null; }
}

// Agentic tool-use loop. Claude plans, calls the provided tools, reads the results, and
// repeats until it produces a final answer (or hits maxIters). `tools` are Anthropic tool
// definitions; `execute(name, input)` runs one tool and returns a string result. Returns
// { text, trace } on success, or null on any failure so callers fall back to a simpler path.
async function callClaudeTools({ model, system, user, tools, execute, maxTokens = 1600, maxIters = 6 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const messages = [{ role: 'user', content: user }];
  const trace = [];
  try {
    for (let i = 0; i < maxIters; i++) {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: model || process.env.DRAFT_MODEL || 'claude-opus-4-8',
          max_tokens: maxTokens, system, tools, messages,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const content = data.content || [];
      messages.push({ role: 'assistant', content });

      if (data.stop_reason !== 'tool_use') {
        const text = content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
        return { text, trace };
      }

      const results = [];
      for (const block of content) {
        if (block.type !== 'tool_use') continue;
        let out;
        try { out = await execute(block.name, block.input || {}); }
        catch (e) { out = `Tool error: ${e.message}`; }
        trace.push({ tool: block.name, input: block.input || {} });
        results.push({ type: 'tool_result', tool_use_id: block.id, content: String(out) });
      }
      messages.push({ role: 'user', content: results });
    }
    return null; // ran out of iterations without a final answer
  } catch (e) {
    return null;
  }
}

function available() { return !!process.env.ANTHROPIC_API_KEY; }

module.exports = { callClaude, callVision, callClaudeTools, available };
