// syncCatalog.js (drop-in)
const { db } = require('./db');
const { paginate, posterGet } = require('./posterClient');

async function pickFirstWorking(paths) {
  for (const p of paths) {
    try {
      const res = await posterGet(p, { page: 1, count: 1 });
      if (Array.isArray(res)) return p;
    } catch {}
  }
  throw new Error('No working API path found from list: ' + paths.join(', '));
}

async function resolvePath(kind) {
  const env = process.env[kind];
  if (env && env !== 'auto') return env;
  if (kind === 'POSTER_SUPPLIERS_PATH') {
    return await pickFirstWorking(['storage.getSuppliers', 'suppliers.getList']);
  } else {
    return await pickFirstWorking(['menu.getProducts', 'products.getList']);
  }
}

async function syncSuppliers() {
  const path = await resolvePath('POSTER_SUPPLIERS_PATH');
  const list = await paginate(path);
  const up = db.prepare(`INSERT INTO suppliers (id,name,raw,updated_at)
                         VALUES (@id,@name,@raw,@ts)
                         ON CONFLICT(id) DO UPDATE SET name=@name, raw=@raw, updated_at=@ts`);
  const ts = new Date().toISOString();
  const tx = db.transaction((arr) => {
    for (const s of arr) {
      up.run({
        id: Number(s.supplier_id ?? s.id),
        name: String(s.name ?? s.supplier_name),
        raw: JSON.stringify(s),
        ts
      });
    }
  });
  tx(list);
  return list.length;
}

async function syncProducts() {
  const path = await resolvePath('POSTER_PRODUCTS_PATH');
  const list = await paginate(path);
  const up = db.prepare(`INSERT INTO products (id,name,sku,unit,active,raw,updated_at)
                         VALUES (@id,@name,@sku,@unit,@active,@raw,@ts)
                         ON CONFLICT(id) DO UPDATE SET name=@name, sku=@sku, unit=@unit, active=@active, raw=@raw, updated_at=@ts`);
  const ts = new Date().toISOString();
  const tx = db.transaction((arr) => {
    for (const p of arr) {
      up.run({
        id: Number(p.product_id ?? p.id),
        name: String(p.product_name ?? p.name),
        sku: p.sku ? String(p.sku) : null,
        unit: p.unit ? String(p.unit) : null,
        active: p.active === false ? 0 : 1,
        raw: JSON.stringify(p),
        ts
      });
    }
  });
  tx(list);
  return list.length;
}

async function syncAll() {
  const s = await syncSuppliers();
  const p = await syncProducts();
  return { suppliers: s, products: p };
}

module.exports = { syncAll, syncProducts, syncSuppliers };
