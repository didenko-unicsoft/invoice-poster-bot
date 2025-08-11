const Database = require('better-sqlite3');
const db = new Database('data.sqlite');
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  raw TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT,
  unit TEXT,
  active INTEGER DEFAULT 1,
  raw TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chats (
  chat_id TEXT PRIMARY KEY,
  title TEXT,
  is_group INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  supplier_id INTEGER,
  total_amount REAL,
  currency TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS usage_month (
  chat_id TEXT NOT NULL,
  ym TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (chat_id, ym)
);
`);

module.exports = { db };
