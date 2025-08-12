require('dotenv').config();
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const { db } = require('./db');
const { syncAll } = require('./syncCatalog');
const { ocrImage } = require('./ocr');
const { parseInvoiceText } = require('./parse');
const { findBestProduct, findBestSupplier } = require('./match');
const { incDocCounter, currentCharges } = require('./billing');
const { posterPost } = require('./posterClient');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN missing');
const DRY_RUN = String(process.env.DRY_RUN || 'true') === 'true';
const CREATE_PATH = process.env.POSTER_INVOICE_CREATE_PATH || 'storage.incoming.create';

const bot = new Telegraf(BOT_TOKEN);

bot.telegram.deleteWebhook().catch(()=>{});
bot.telegram.getMe().then(me => console.log(`🤖 Bot connected as @${me.username}`));

function ensureChat(chat) {
  try {
    db.prepare('INSERT OR IGNORE INTO chats (chat_id, title, is_group, created_at) VALUES (?,?,?,?)')
      .run(String(chat.id), chat.title || (chat.username ? '@'+chat.username : ''), chat.type !== 'private' ? 1 : 0, new Date().toISOString());
  } catch {}
}

bot.start(async (ctx) => {
  ensureChat(ctx.chat);
  await ctx.reply('Бот підключено. Використовуйте /sync для оновлення довідників. Надсилайте накладні як *Document* (файл), не як Photo.', { parse_mode: 'Markdown' });
});

bot.command('sync', async (ctx) => {
  try {
    ensureChat(ctx.chat);
    await ctx.reply('Синхронізація довідників…');
    const res = await syncAll();
    await ctx.reply(`✅ Suppliers: ${res.suppliers}, Products: ${res.products}`);
  } catch (e) {
    console.error(e);
    await ctx.reply('❌ Помилка синхронізації: ' + e.message);
  }
});

async function downloadTelegramFile(fileId) {
  const tgApi = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`;
  const r1 = await fetch(tgApi);
  const j = await r1.json();
  if (!j.ok) throw new Error('getFile failed');
  const filePath = j.result.file_path;
  const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  const r2 = await fetch(url);
  if (!r2.ok) throw new Error('file download failed');
  const tmp = path.join('/tmp', path.basename(filePath));
  const buf = await r2.buffer();
  fs.writeFileSync(tmp, buf);
  return tmp;
}

async function handleFileMessage(ctx, file) {
  ensureChat(ctx.chat);
  try {
    await ctx.reply('📄 Отримав файл. Обробляю OCR…');
    const localPath = await downloadTelegramFile(file.file_id);
    const text = await ocrImage(localPath);
    if (!text) {
      await ctx.reply('⚠️ OCR не повернув текст. Надішліть, будь ласка, файл як *Document* з якісним зображенням або PDF.', { parse_mode: 'Markdown' });
      return;
    }
    const parsed = parseInvoiceText(text);

    // Спроба вгадати постачальника з перших рядків
    const firstLine = text.split(/\r?\n/).find(Boolean) || '';
    const supplierGuess = findBestSupplier(firstLine) || findBestSupplier(text.slice(0, 200));

    const total = parsed.total;

    await ctx.replyWithMarkdown(`
**Попередній розбір накладної**  
Постачальник: *${supplierGuess ? supplierGuess.name + ' (id ' + supplierGuess.id + ')' : 'не визначено'}*  
Дата/№: *${parsed.date || '—'}* / *${parsed.number || '—'}*  
Разом: *${total != null ? total : '—'}*
DRY_RUN: *${DRY_RUN ? 'так' : 'ні'}*
`.trim());

    // Лічильник і білінг
    const cnt = incDocCounter(String(ctx.chat.id));
    const charges = currentCharges(String(ctx.chat.id));
    await ctx.reply(`Лічильник у цьому місяці: ${cnt} документ(и). Включено в тариф: ${charges.included}. Понад: ${charges.extras} × ${charges.extraCostUah/Math.max(1,charges.extras)} грн = ${charges.extraCostUah} грн.`);

    if (DRY_RUN) {
      await ctx.reply('🧪 DRY_RUN: запис у Poster вимкнено. Перевірте прев’ю. Коли будете готові — встановіть DRY_RUN=false.');
      return;
    }

    // Спроба створити накладну в Poster (схема параметрів може відрізнятися)
    try {
      const created = await posterPost(CREATE_PATH, {
        supplier_id: supplierGuess?.id,
        date: parsed.date || new Date().toISOString().slice(0,10),
        comment: parsed.number ? `№${parsed.number}` : 'from telegram bot',
        total: total || 0
      });
      await ctx.reply('✅ Додано в Poster: ' + JSON.stringify(created));
    } catch (e) {
      console.error('Poster create error:', e);
      await ctx.reply('⚠️ Не вдалося створити накладну в Poster. Перевірте POSTER_INVOICE_CREATE_PATH та права токена. Деталі в логах.');
    }

  } catch (e) {
    console.error(e);
    await ctx.reply('❌ Помилка: ' + e.message);
  }
}

bot.on('document', async (ctx) => {
  const doc = ctx.message.document;
  await handleFileMessage(ctx, doc);
});

bot.on('photo', async (ctx) => {
  const photos = ctx.message.photo;
  const best = photos[photos.length - 1];
  await handleFileMessage(ctx, best);
});

// Нічний крон для синхронізації довідників (03:00 за TZ)
cron.schedule('0 3 * * *', async () => {
  try {
    const res = await syncAll();
    console.log('Cron sync:', res);
  } catch (e) {
    console.error('Cron sync error', e);
  }
}, { timezone: process.env.TZ || 'Europe/Kyiv' });

bot.launch().then(() => {
  console.log('Bot connected.');
}).catch(err => {
  console.error('Bot launch error:', err);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
