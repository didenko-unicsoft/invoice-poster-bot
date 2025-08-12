const fetch = require('node-fetch');

const BASE = process.env.POSTER_API_BASE;            // напр. https://vfm.joinposter.com/api
const TOKEN = process.env.POSTER_API_TOKEN;

if (!BASE || !TOKEN) {
  console.error('❌ Вкажіть POSTER_API_BASE і POSTER_API_TOKEN у змінних середовища');
  process.exit(1);
}

async function posterGet(method, params = {}) {
  const url = new URL(`${BASE}/${method}`);
  url.searchParams.set('token', TOKEN);
  for (const [k,v] of Object.entries(params)) url.searchParams.set(k, String(v));

  console.log('🌐 Запит до Poster API:', url.toString());

  const res = await fetch(url.toString());
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    const text = await res.text().catch(()=> '');
    throw new Error(`Poster GET ${method} ${res.status} ${text.slice(0,200)}`);
  }
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(()=> '');
    throw new Error(`Poster GET ${method} non-JSON: ${text.slice(0,200)}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(`Poster API error: ${JSON.stringify(data.error)}`);
  return data.response || [];
}

// надійна пагінація з limit/offset
async function paginate(method, limit = 500) {
  let offset = 0;
  let total = 0;
  while (true) {
    const chunk = await posterGet(method, { limit, offset });
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    total += chunk.length;
    yield* chunk;                // генератор: віддаємо по мірі отримання
    offset += limit;
    if (chunk.length < limit) break;
  }
}

// зручний хелпер: збирає все у масив (для невеликих обсягів)
async function fetchAll(method, limit = 500) {
  const out = [];
  for await (const item of paginate(method, limit)) out.push(item);
  return out;
}

module.exports = { posterGet, paginate, fetchAll };
