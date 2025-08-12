require('dotenv').config();
const { Telegraf } = require('telegraf');

const { syncAll } = require('./syncCatalog');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN (або BOT_TOKEN) не задано');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// на старті: гарантуємо polling (без вебхука) і логінимось
(async () => {
  try {
    await bot.telegram.deleteWebhook().catch(()=>{});
    const me = await bot.telegram.getMe();
    console.log(`🤖 Bot connected as @${me.username}`);
  } catch (e) {
    console.error('❌ Telegram init error:', e);
  }
})();

// прості команди
bot.command('ping', (ctx) => ctx.reply('pong'));
bot.start(async (ctx) => {
  await ctx.reply('Бот підключено. Використовуйте /sync для оновлення довідників.\nНадсилайте накладні як *Document* (файл), не як Photo.', { parse_mode: 'Markdown' });
});

// ручна синхронізація (не блокує бота)
bot.command('sync', async (ctx) => {
  try {
    await ctx.reply('🔄 Синхронізація довідників…');
    const res = await syncAll(ctx); // тут лише підсумки в чат
    await ctx.reply(`✅ Готово. Постачальників: ${res.suppliersCount}, Товарів: ${res.productsCount}`);
  } catch (e) {
    console.error('sync error:', e);
    await ctx.reply('❌ Помилка синхронізації: ' + e.message);
  }
});

// базовий лог усіх апдейтів (для діагностики)
bot.on('message', (ctx) => {
  const txt = ctx.message.text ? ('text: ' + ctx.message.text) : ctx.message.document ? 'document' : ctx.message.photo ? 'photo' : 'other';
  console.log('✉️ update from', ctx.chat.id, ctx.chat.type, '-', txt);
});

// запуск polling
bot.launch().then(() => {
  console.log('🚀 Polling started');
}).catch(err => {
  console.error('❌ bot.launch error:', err);
});

// graceful stop (Railway)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
