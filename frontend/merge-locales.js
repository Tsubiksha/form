import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localesDir = path.join(__dirname, 'src', 'locales');

const extractedPath = path.join(localesDir, 'extractedEn.json');
if (!fs.existsSync(extractedPath)) {
  console.log('No extracted keys found.');
  process.exit(0);
}

const extractedKeys = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'extractedEn.json');

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

files.forEach(file => {
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
  console.log(`Merged ${added} keys into ${file}`);
});

console.log('Merge complete!');
