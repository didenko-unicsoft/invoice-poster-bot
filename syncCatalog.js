// syncCatalog.js
const fs = require('fs');
const path = require('path');
const { posterGet } = require('./posterClient');

async function syncSuppliers(ctx) {
    ctx.reply('🔄 Синхронізація постачальників...');
    try {
        const suppliers = await paginate('storage.getSuppliers');
        
        // Зберігаємо у файл для відладки
        const suppliersFile = path.join(__dirname, 'suppliers.json');
        fs.writeFileSync(suppliersFile, JSON.stringify(suppliers, null, 2));

        ctx.reply(`✅ Синхронізовано постачальників: ${suppliers.length}`);
    } catch (err) {
        console.error('Помилка syncSuppliers:', err);
        ctx.reply(`❌ Помилка синхронізації постачальників: ${err.message}`);
    }
}

async function syncProducts(ctx) {
    ctx.reply('🔄 Синхронізація товарів...');
    try {
        const products = await paginate('menu.getProducts');
        
        // Зберігаємо у файл для відладки
        const productsFile = path.join(__dirname, 'products.json');
        fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));

        ctx.reply(`✅ Синхронізовано товари: ${products.length}`);
    } catch (err) {
        console.error('Помилка syncProducts:', err);
        ctx.reply(`❌ Помилка синхронізації товарів: ${err.message}`);
    }
}

async function paginate(method) {
    let page = 1;
    let results = [];

    while (true) {
        const data = await posterGet(method, { page });
        if (!data || data.length === 0) break;

        results = results.concat(data);
        page++;
    }

    return results;
}

async function syncAll(ctx) {
    await syncSuppliers(ctx);
    await syncProducts(ctx);
}

module.exports = { syncSuppliers, syncProducts, syncAll };
