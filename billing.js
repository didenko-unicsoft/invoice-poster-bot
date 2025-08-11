const { db } = require('./db');

function ymNow() {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
}

function incDocCounter(chat_id) {
  const ym = ymNow();
  const stmt = db.prepare('INSERT INTO usage_month (chat_id, ym, count) VALUES (?,?,1) ON CONFLICT(chat_id,ym) DO UPDATE SET count=count+1');
  stmt.run(chat_id, ym);
  return db.prepare('SELECT count FROM usage_month WHERE chat_id=? AND ym=?').get(chat_id, ym).count;
}

function currentCharges(chat_id) {
  const ym = ymNow();
  const countRow = db.prepare('SELECT count FROM usage_month WHERE chat_id=? AND ym=?').get(chat_id, ym) || { count: 0 };
  const count = countRow.count;
  const minUsd = Number(process.env.BILLING_MIN_MONTH_USD || 15);
  const included = Number(process.env.BILLING_INCLUDED_DOCS || 150);
  const extraPriceUah = Number(process.env.BILLING_EXTRA_PRICE_UAH || 3);
  const extras = Math.max(0, count - included);
  const extraCostUah = extras * extraPriceUah;
  return { ym, count, minUsd, included, extras, extraCostUah };
}

module.exports = { incDocCounter, currentCharges };
