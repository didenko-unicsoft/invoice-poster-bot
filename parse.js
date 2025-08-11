function parseInvoiceText(text) {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const joined = lines.join(' ');

  // дата: dd.mm.yyyy або dd/mm/yyyy
  const dateMatch = joined.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/);
  const date = dateMatch ? dateMatch[1] : null;

  // номер: №12345
  const numMatch = joined.match(/№\s*([\w/-]+)/i);
  const number = numMatch ? numMatch[1] : null;

  // "Разом", "Итого", "Сума", "Итог"
  const totalMatch = joined.match(/(Разом|Итого|Итог|Сума|Всього)[^\d]*(\d+[\s\d.,]*)/i);
  const totalRaw = totalMatch ? totalMatch[2] : null;
  let total = null;
  if (totalRaw) {
    const cleaned = totalRaw.replace(/\s/g, '').replace(',', '.');
    const tryNum = parseFloat(cleaned);
    if (!Number.isNaN(tryNum)) total = tryNum;
  }

  return { date, number, total, items: [], text };
}

module.exports = { parseInvoiceText };
