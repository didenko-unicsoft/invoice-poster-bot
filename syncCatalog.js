const fs = require('fs');
const path = require('path');
const { fetchAll } = require('./posterClient');

const SUPPLIERS_PATH = process.env.POSTER_SUPPLIERS_PATH || 'storage.getSuppliers';
const PRODUCTS_PATH  = process.env.POSTER_PRODUCTS_PATH  || 'menu.getProducts';

function send(ctx, msg) {
  if (ctx && ctx.reply) return ctx.reply(msg);
  console.log(msg);
}

async function syncSuppliers(ctx) {
  send(ctx, '🔄 Синхронізую постачальників…');
  const list = await fetchAll(SUPPLIERS_PATH, 500);
  // лог у файл для відладки (не шлемо у Telegram, щоб не словити 4096-ліміт)
  try { fs.writeFileSync(path.join(__dirname, 'suppliers.json'), JSON.stringify(list, null, 2)); } catch {}
  send(ctx, `✅ Постачальників: ${list.length}`);
  return list.length;
}

async function syncProducts(ctx) {
  send(ctx, '🔄 Синхронізую товари…');
  const list = await fetchAll(PRODUCTS_PATH, 500);
  try { fs.writeFileSync(path.join(__dirname, 'products.json'), JSON.stringify(list, null, 2)); } catch {}
  send(ctx, `✅ Товарів: ${list.length}`);
  return list.length;
}

async function syncAll(ctx) {
  const suppliersCount = await syncSuppliers(ctx);
  const productsCount  = await syncProducts(ctx);
  return { suppliersCount, productsCount };
}

module.exports = { syncAll, syncSuppliers, syncProducts };
