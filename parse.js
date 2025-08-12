// parse.js — витягуємо №, дату (з цифрами або з українським місяцем) і "Разом/Всього"
const MONTHS = {
  'січня':1,'лютого':2,'березня':3,'квітня':4,'травня':5,'червня':6,
  'липня':7,'серпня':8,'вересня':9,'жовтня':10,'листопада':11,'грудня':12
};

function toNumberUA(s) {
  if (!s) return null;
  const cleaned = s.replace(/\s/g,'').replace(/,/g,'.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(text) {
  // 11.08.2025 або 11/08/2025
  const m1 = text.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})/);
  if (m1) {
    const [_, d, m, y] = m1;
    const yyyy = (y.length === 2 ? ('20' + y) : y);
    return `${yyyy}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  // 11 серпня 2025
  const m2 = text.match(/(\d{1,2})\s+(січня|лютого|березня|квітня|травня|червня|липня|серпня|вересня|жовтня|листопада|грудня)\s+(\d{4})/i);
  if (m2) {
    const d = m2[1], mon = MONTHS[m2[2].toLowerCase()], y = m2[3];
    return `${y}-${String(mon).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  // "від 11 серпня 2025" або "від 11.08.2025"
  const m3 = text.match(/від\s+([^\n]+?)(?:\s|$)/i);
  if (m3) return parseDate(m3[1]);
  return null;
}

function parseNumber(text) {
  // захоплюємо найбільше число з кінця для "Разом"/"Всього на суму"
  const rx = /(разом|всього(?:\s+на\s+суму)?|итого|итог)[^\d\-]*(-?\d[\d\s.,]*)/i;
  const m = text.match(rx);
  return m ? toNumberUA(m[2]) : null;
}

function parseNumberDoc(text) {
  // "Видаткова накладна № 4936 від ..."
  const m = text.match(/видаткова\s+накладна\s*№?\s*([^\s,]+)(?:\s+від|\s)/i);
  return m ? m[1] : null;
}

function parseInvoiceText(text) {
  const t = text.replace(/\u00A0/g,' ').replace(/[|]+/g,' ').replace(/\s{2,}/g,' ');
  const number = parseNumberDoc(t);
  const date   = parseDate(t);
  const total  = parseNumber(t);
  return { date, number, total, items: [], text };
}

module.exports = { parseInvoiceText };
