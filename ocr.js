// ocr.js — попередня обробка + Tesseract (ukr+eng), стійкий до фото боком
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

async function preprocess(inputPath) {
  const out = path.join('/tmp', 'prep_' + path.basename(inputPath));
  // auto-rotate по EXIF, збільшити розмір, прибрати шум, поріг
  await sharp(inputPath)
    .rotate()                // авто-поворот (боком/догори дриґом)
    .greyscale()
    .normalize()             // підтягує контраст
    .median(1)               // легке згладжування шуму
    .resize({ width: 2200, withoutEnlargement: false })
    .threshold(170)          // бінаризація -> чіткі літери
    .toFile(out);
  return out;
}

async function ocrImage(filePath) {
  try {
    const pre = await preprocess(filePath);
    const { data } = await Tesseract.recognize(pre, 'ukr+eng', {
      logger: () => {},
      tessedit_pageseg_mode: 6,     // psm 6: одна колонка тексту
      tessedit_char_blacklist: '',  // нічого не чорним списком
      preserve_interword_spaces: '1'
    });
    return data?.text || '';
  } catch (e) {
    console.error('Tesseract OCR error:', e);
    return '';
  }
}

module.exports = { ocrImage };
