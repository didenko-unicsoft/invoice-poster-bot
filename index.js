require('dotenv').config();
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const { syncAll } = require('./syncCatalog');
const { ocrImage } = require('./ocr');
const { parseInvoiceText } = require('./parse');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN (або BOT_TOKEN) не задано');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// гарантуємо polling
(async () => {
  try {
    await bot.telegram.deleteWebhook().catch(()=>{});
    const me = await bot.telegram.getMe();
    console.log(`🤖 Bot connected as @${me.username}`);
  } catch (e) {
    console.error('❌ Telegram init error:', e);
  }
})();

// утиліта: завантажити файл з Telegram
async function downloadTelegramFile(fileId) {
  const getUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`;
  const r1 = await fetch(getUrl);
  const j = await r1.json();
  if (!j.ok) throw new Error('getFile failed');
  const filePath = j.result.file_path; // e.g. documents/file_123.pdf
  const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  const r2 = await fetch(url);
  if (!r2.ok) throw new Error('file download failed');
  const tmp = path.join('/tmp', path.basename(filePath));
  const buf = await r2.buffer();
  fs.writeFileSync(tmp, buf);
  return tmp;
}

// команди
bot.command('ping', (ctx) => ctx.reply('pong'));

bot.start(async (ctx) => {
  await ctx.reply(
    'Бот підключено. Використовуйте /sync для оновлення довідників.\n' +
    'Надсилайте накладні як *Document* (файл), не як Photo.',
    { parse_mode: 'Markdown' }
  );
});

bot.command('sync', async (ctx) => {
  try {
    await ctx.reply('🔄 Синхронізація довідників…');
    const res = await syncAll(ctx);
    await ctx.reply(`✅ Готово. Постачальників: ${res.suppliersCount}, Товарів: ${res.productsCount}`);
  } catch (e) {
    console.error('sync error:', e);
    await ctx.reply('❌ Помилка синхронізації: ' + e.message);
  }
});

// обробка документів (PDF/зображення як файл)
bot.on('document', async (ctx) => {
  try {
    await ctx.reply('📄 Отримав файл. Обробляю OCR…');
    const file = ctx.message.document;
    const localPath = await downloadTelegramFile(file.file_id);
    const text = await ocrImage(localPath);
    if (!text) {
      await ctx.reply('⚠️ OCR не повернув текст. Надішліть, будь ласка, у хорошій якості як *Document* (file).', { parse_mode: 'Markdown' });
      return;
    }
    const parsed = parseInvoiceText(text);
    await ctx.reply(
      [
        '🧾 *Попередній розбір накладної*',
        `Дата / №: *${parsed.date || '—'}* / *${parsed.number || '—'}*`,
        `Разом: *${parsed.total != null ? parsed.total : '—'}*`
      ].join('\n'),
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    console.error('document handler error:', e);
    await ctx.reply('❌ Помилка обробки файлу: ' + e.message);
  }
});

// обробка фото (якщо прислали як photo)
bot.on('photo', async (ctx) => {
  try {
    await ctx.reply('🖼️ Отримав фото. Обробляю OCR…');
    const photos = ctx.message.photo;
    const best = photos[photos.length - 1]; // найбільша роздільна здатність
    const localPath = await downloadTelegramFile(best.file_id);
    const text = await ocrImage(localPath);
    if (!text) {
      await ctx.reply('⚠️ OCR не повернув текст. Надішліть, будь ласка, як *Document* (file).', { parse_mode: 'Markdown' });
      return;
    }
    const parsed = parseInvoiceText(text);
    await ctx.reply(
      [
        '🧾 *Попередній розбір накладної*',
        `Дата / №: *${parsed.date || '—'}* / *${parsed.number || '—'}*`,
        `Разом: *${parsed.total != null ? parsed.total : '—'}*`
      ].join('\n'),
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    console.error('photo handler error:', e);
    await ctx.reply('❌ Помилка обробки фото: ' + e.message);
  }
});

// діагностика: логувати всі апдейти
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

// graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
