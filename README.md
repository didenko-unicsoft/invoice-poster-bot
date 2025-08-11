# Invoice → Poster Bot (Telegram, Tesseract OCR, Poster API, Billing)

**MVP** для автоматичного внесення накладних у Poster із фото/PDF із Telegram-груп.

## Швидкий старт на Railway (безкоштовно)
1) Створіть бота в Telegram через **@BotFather** → `/newbot` → скопіюйте Bot Token.
   - `/setprivacy` → **Disable**
   - `/setjoingroups` → **Enable**
2) Отримайте **Poster API Token** у кабінеті Poster → Налаштування → API.
3) Створіть приватний GitHub‑репозиторій та завантажте сюди файли з цього архіву.
4) У Railway: **New Project → Deploy from GitHub** → виберіть репозиторій → додайте змінні з `.env.example` → Deploy.
5) Додайте бота у групу бухгалтерії, напишіть `/start`, потім `/sync`. Надішліть накладні як **Document (File)**.

> Цей шаблон використовує **Tesseract OCR (tesseract.js)** — жодних ключів Google не потрібно.
> За замовчуванням **DRY_RUN=true** (показує прев'ю без запису у Poster). Після перевірки змініть на `DRY_RUN=false`.

## .env приклад
```
TELEGRAM_BOT_TOKEN=
POSTER_API_TOKEN=
POSTER_API_BASE=https://api.joinposter.com
TZ=Europe/Kyiv

# Мапінг і тарифи
MATCH_THRESHOLD=0.78
BILLING_MIN_MONTH_USD=15
BILLING_INCLUDED_DOCS=150
BILLING_EXTRA_PRICE_UAH=3

DRY_RUN=true
POSTER_INVOICE_CREATE_PATH=storage.incoming.create
```

## Команди в Telegram
- `/start` — підключення групи.
- `/sync` — синхронізація постачальників і товарів із Poster.
- Надішліть файл/фото — бот розпізнає, підготує накладну (у DRY_RUN лише прев'ю).

## Файли
- `index.js` — Telegram‑бот, обробка повідомлень, крон‑синк.
- `posterClient.js` — клієнт до Poster API.
- `syncCatalog.js` — щоденний/ручний синк suppliers/products → SQLite.
- `match.js` — нормалізація, Levenshtein‑подібна схожість.
- `ocr.js` — **tesseract.js** розпізнавання (ukr+eng).
- `parse.js` — грубий парсер накладних (дата/№/сума).
- `billing.js` — лічильник документів і розрахунок тарифу.
- `db.js` — SQLite схеми.

## Примітка щодо Poster API
У різних версіях можуть відрізнятися назви методів. Читання зазвичай `suppliers.getList` і `products.getList`. 
Створення приходу/накладної задайте через `POSTER_INVOICE_CREATE_PATH` (наприклад, `storage.incoming.create`) — перевірте у вашій документації.
