// Retrieval layer for the appeal drafter. Ranks the legal corpus (legal/corpus.js) against a
// query with BM25 — a standard lexical IR ranking function — so the drafting agent retrieves
// the few passages actually relevant to a denial instead of stuffing the whole knowledge base
// into the prompt. This is the "retrieval" in retrieval-augmented generation; the agent
// (agent.js) is the "generation" that grounds its letter on what comes back.
const { buildCorpus } = require('./legal/corpus');

const STOP = new Set(('a an the and or of to in for on at by with from as is are be your you it that this ' +
  'not no any may must can will shall its their our whose which who').split(' '));

// Lowercase, split on non-word chars, drop stopwords + very short tokens, light plural stemming.
function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOP.has(t))
    .map((t) => (t.length > 4 && t.endsWith('s') ? t.slice(0, -1) : t));
}

// Build an inverted-index view over the corpus: per-doc term frequencies, doc length, doc
// frequency per term, and the average length for BM25 length normalization.
function buildIndex(docs = buildCorpus()) {
  const df = new Map();
  const postings = docs.map((doc) => {
    const tf = new Map();
    const terms = tokenize(`${doc.title} ${doc.text}`);
    for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    return { doc, tf, len: terms.length };
  });
  const avgdl = postings.reduce((s, p) => s + p.len, 0) / (postings.length || 1);
  return { postings, df, avgdl, N: postings.length };
}

// BM25 scoring. k1 controls term-frequency saturation; b controls length normalization.
function score(index, queryTerms, k1 = 1.5, b = 0.75) {
  const { postings, df, avgdl, N } = index;
  return postings.map(({ doc, tf, len }) => {
    let s = 0;
    for (const t of queryTerms) {
      const f = tf.get(t);
      if (!f) continue;
      const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
      s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * (len / avgdl)));
    }
    return { doc, score: s };
  });
}

// Retrieve the top-k passages for a free-text query. Returns [{ id, title, citation, source,
// score }] — never the internal tf maps.
function search(query, k = 4, index = defaultIndex()) {
  const terms = tokenize(query);
  if (!terms.length) return [];
  return score(index, terms)
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((r) => ({
      id: r.doc.id,
      title: r.doc.title,
      citation: r.doc.citation,
      source: r.doc.source,
      text: r.doc.text,
      score: Math.round(r.score * 1000) / 1000,
    }));
}

let INDEX = null;
function defaultIndex() { if (!INDEX) INDEX = buildIndex(); return INDEX; }

module.exports = { tokenize, buildIndex, search, defaultIndex };
