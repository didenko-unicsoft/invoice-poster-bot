const { db } = require('./db');

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s%.-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  const dp = Array.from({ length: al + 1 }, () => Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) dp[i][0] = i;
  for (let j = 0; j <= bl; j++) dp[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[al][bl];
}

function similarity(a, b) {
  const A = norm(a), B = norm(b);
  const maxLen = Math.max(A.length, B.length) || 1;
  const dist = levenshtein(A, B);
  return 1 - dist / maxLen;
}

function findBestProduct(nameFromInvoice, threshold = Number(process.env.MATCH_THRESHOLD || 0.78)) {
  const rows = db.prepare('SELECT id, name, sku FROM products WHERE active=1').all();
  let best = null;
  for (const r of rows) {
    const s = similarity(nameFromInvoice, r.name);
    if (!best || s > best.score) best = { id: r.id, name: r.name, sku: r.sku, score: s };
  }
  if (best && best.score >= threshold) return best;
  return null;
}

function findBestSupplier(nameFromInvoice, threshold = 0.7) {
  const rows = db.prepare('SELECT id, name FROM suppliers').all();
  let best = null;
  for (const r of rows) {
    const s = similarity(nameFromInvoice, r.name);
    if (!best || s > best.score) best = { id: r.id, name: r.name, score: s };
  }
  if (best && best.score >= threshold) return best;
  return null;
}

module.exports = { findBestProduct, findBestSupplier, similarity, norm };
