const fetch = require('node-fetch');

const POSTER_API_BASE = process.env.POSTER_API_BASE; // напр. https://vfm.joinposter.com/api
const POSTER_API_TOKEN = process.env.POSTER_API_TOKEN; // твій токен

async function posterGet(path, params = {}) {
    const searchParams = new URLSearchParams({
        token: POSTER_API_TOKEN,
        ...params
    });

    const url = `${POSTER_API_BASE}/${path}?${searchParams.toString()}`;
    console.log(`[Poster API] GET: ${url}`);

    const res = await fetch(url);

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Poster GET ${path} returned non-JSON: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    if (data.error) {
        throw new Error(`Poster GET ${path} error: ${JSON.stringify(data)}`);
    }

    return data.response || [];
}

async function paginate(path, limit = 500) {
    let results = [];
    let offset = 0;

    while (true) {
        const chunk = await posterGet(path, { limit, offset });
        if (!Array.isArray(chunk) || chunk.length === 0) break;

        results = results.concat(chunk);
        offset += limit;
        console.log(`[Poster API] ${path}: fetched ${results.length} items so far`);

        if (chunk.length < limit) break; // більше немає даних
    }

    return results;
}

module.exports = { posterGet, paginate };
