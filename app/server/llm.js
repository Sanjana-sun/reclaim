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

function available() { return !!process.env.ANTHROPIC_API_KEY; }

module.exports = { callClaude, available };
