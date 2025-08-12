const { paginate } = require('./posterClient');

async function syncSuppliers() {
    console.log('=== Синхронізація постачальників ===');
    const suppliers = await paginate(process.env.POSTER_SUPPLIERS_PATH);
    console.log(`Отримано ${suppliers.length} постачальників`);
    return suppliers;
}

async function syncProducts() {
    console.log('=== Синхронізація товарів ===');
    const products = await paginate(process.env.POSTER_PRODUCTS_PATH);
    console.log(`Отримано ${products.length} товарів`);
    return products;
}

async function syncAll() {
    try {
        const suppliers = await syncSuppliers();
        const products = await syncProducts();

        // Тут можна зберегти у БД чи кеш
        console.log('Синхронізація завершена успішно!');
        return { suppliers, products };
    } catch (err) {
        console.error('❌ Помилка синхронізації:', err.message);
    }
}

module.exports = { syncAll };
