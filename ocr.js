const Tesseract = require('tesseract.js');

async function ocrImage(filePath) {
  // Мова: українська + англійська (можна додати 'rus' при потребі)
  const langs = 'ukr+eng';
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, langs);
    return text || '';
  } catch (e) {
    console.error('Tesseract OCR error:', e);
    return '';
  }
}

module.exports = { ocrImage };
