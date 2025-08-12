// posterClient.js
const fetch = require('node-fetch');

const POSTER_API_BASE = process.env.POSTER_API_BASE || 'https://vfm.joinposter.com/api';
const POSTER_API_TOKEN = process.env.POSTER_API_TOKEN;

if (!POSTER_API_TOKEN) {
    console.error('❌ POSTER_API_TOKEN не задано у .env');
    process.exit(1);
}

/**
 * Виконує GET-запит до Poster API
 * @param {string} method - назва методу API, наприклад "menu.getProducts"
 * @param {object} params - додаткові параметри запиту
 */
async function posterGet(method, params = {}) {
    const url = new URL(`${POSTER_API_BASE}/${method}`);
    url.searchParams.set('token', POSTER_API_TOKEN);

    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }

    console.log(`🌐 Запит до Poster API: ${url}`);

    const res = await fetch(url.toString());
    if (!res.ok) {
        throw new Error(`Poster GET ${method} ${res.status}`);
    }

    const json = await res.json();

    if (json.error) {
        throw new Error(`Poster API error: ${json.error}`);
    }

    return json.response || [];
}

module.exports = { posterGet };
