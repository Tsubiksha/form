import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, 'src');
const localesDir = path.join(__dirname, 'src', 'locales');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getFiles(fullPath, files);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getFiles(SRC_DIR);
const extractedKeys = {};

// Extract t('key', 'default value') using regex
// Handles t('ui.key', `value`) or t('ui.key', 'value') or t("ui.key", "value")
const regex = /t\(\s*['"](ui\.[^'"]+)['"]\s*,\s*[`'"](.*?[^\\])[`'"]\s*\)/g;
const regex2 = /t\(\s*['"]([^'"]+)['"]\s*,\s*[`'"](.*?[^\\])[`'"]\s*\)/g; // capture all t()

files.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = regex2.exec(code)) !== null) {
    const key = match[1];
    let val = match[2];
    // basic unescaping
    val = val.replace(/\\`/g, '`').replace(/\\'/g, "'").replace(/\\"/g, '"');
    extractedKeys[key] = val;
  }
});

console.log(`Extracted ${Object.keys(extractedKeys).length} keys from source files.`);

// Merge into locales
const langPrefixes = {
  'ta': '[தமிழ்] ',
  'te': '[తెలుగు] ',
  'kn': '[ಕನ್ನಡ] ',
  'ml': '[മലയാളം] ',
  'hi': '[हिन्दी] ',
  'mr': '[मराठी] ',
  'fr': '[FR] ',
  'de': '[DE] ',
  'es': '[ES] ',
  'ja': '[JA] ',
  'zh': '[ZH] ',
  'ko': '[KO] ',
  'en': ''
};

const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'extractedEn.json');

localeFiles.forEach(file => {
  const langCode = file.replace('.json', '');
  const prefix = langPrefixes[langCode] || `[${langCode.toUpperCase()}] `;
  
  const filePath = path.join(localesDir, file);
  let currentKeys = {};
  try {
    currentKeys = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    currentKeys = {};
  }
  
  let added = 0;
  for (const [key, englishValue] of Object.entries(extractedKeys)) {
    if (!currentKeys[key]) {
      currentKeys[key] = prefix + englishValue;
      added++;
    }
  }
  
  fs.writeFileSync(filePath, JSON.stringify(currentKeys, null, 2), 'utf8');
  console.log(`Merged ${added} new keys into ${file}`);
});
