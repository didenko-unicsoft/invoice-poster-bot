// posterClient.js — простий клієнт Poster + безпечна пагінація
const fetch = require('node-fetch');

const BASE  = process.env.POSTER_API_BASE;   // напр. https://vfm.joinposter.com/api
const TOKEN = process.env.POSTER_API_TOKEN;

if (!BASE || !TOKEN) {
  console.error('❌ POSTER_API_BASE або POSTER_API_TOKEN не задано');
  process.exit(1);
}

async function posterGet(method, params = {}) {
  const url = new URL(`${BASE}/${method}`);
  url.searchParams.set('token', TOKEN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString());
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    const txt = await res.text().catch(()=> '');
    throw new Error(`Poster GET ${method} ${res.status} ${txt.slice(0,200)}`);
  }
  if (!ct.includes('application/json')) {
    const txt = await res.text().catch(()=> '');
    throw new Error(`Poster GET ${method} non-JSON: ${txt.slice(0,200)}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(`Poster API error: ${JSON.stringify(data.error)}`);
  return data.response || [];
}

/** Тягне ВСЕ з методів Poster, порціями limit/offset, повертає один масив */
async function fetchAll(method, limit = 500) {
  let offset = 0;
  const all = [];
  while (true) {
    const chunk = await posterGet(method, { limit, offset });
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    all.push(...chunk);
    offset += limit;
    if (chunk.length < limit) break;
  }
  return all;
}

module.exports = { posterGet, fetchAll };
