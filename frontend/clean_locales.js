import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCALES_DIR = path.join(__dirname, 'src', 'locales');

function cleanString(str) {
  if (typeof str !== 'string') return str;
  // Remove like "[JA] " or " [JA]" or "[JA]"
  return str.replace(/\[[A-Z]{2,3}\]\s*/g, '').replace(/\s*\[[A-Z]{2,3}\]/g, '').trim();
}

function cleanObject(obj) {
  if (typeof obj === 'string') {
    return cleanString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObject(item));
  }
  if (typeof obj === 'object' && obj !== null) {
    const cleaned = {};
    for (const key in obj) {
      cleaned[key] = cleanObject(obj[key]);
    }
    return cleaned;
  }
  return obj;
}

const files = fs.readdirSync(LOCALES_DIR);

files.forEach(file => {
  if (file.endsWith('.json')) {
    const filePath = path.join(LOCALES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    try {
      const data = JSON.parse(content);
      const cleanedData = cleanObject(data);
      fs.writeFileSync(filePath, JSON.stringify(cleanedData, null, 2), 'utf8');
      console.log(`Cleaned ${file}`);
    } catch (e) {
      console.error(`Error processing ${file}: ${e.message}`);
    }
  }
});
