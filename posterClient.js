const fetch = require('node-fetch');
const BASE = process.env.POSTER_API_BASE || 'https://api.joinposter.com';
const TOKEN = process.env.POSTER_API_TOKEN;

function qs(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) p.append(k, String(v));
  return p.toString();
}

async function posterGet(path, params = {}) {
  if (!TOKEN) throw new Error('POSTER_API_TOKEN missing');
  const url = `${BASE}/${path}?${qs({ token: TOKEN, ...params })}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Poster GET ${path} ${r.status}`);
  const data = await r.json();
  if (!data.response) throw new Error(`Poster error: ${JSON.stringify(data)}`);
  return data.response;
}

async function posterPost(path, body = {}) {
  if (!TOKEN) throw new Error('POSTER_API_TOKEN missing');
  const url = `${BASE}/${path}`;
  const fd = new URLSearchParams({ token: TOKEN });
  for (const [k, v] of Object.entries(body)) {
    fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: fd });
  const data = await r.json();
  if (!data.response) throw new Error(`Poster error: ${JSON.stringify(data)}`);
  return data.response;
}

async function paginate(path, pageSize = 100) {
  const all = [];
  let page = 1;
  while (true) {
    const chunk = await posterGet(path, { page, count: pageSize });
    if (!chunk.length) break;
    all.push(...chunk);
    if (chunk.length < pageSize) break;
    page++;
  }
  return all;
}

module.exports = { posterGet, posterPost, paginate };
