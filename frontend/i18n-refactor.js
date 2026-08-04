import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as babelParser from '@babel/parser';
import * as traverseModule from '@babel/traverse';

const parser = babelParser.default || babelParser;
const traverse = traverseModule.default || traverseModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, 'src');

const extractedKeys = {};
let totalComponentsUpdated = 0;
let totalStringsReplaced = 0;

function generateKey(text) {
  let key = text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 40).replace(/_$/, '');
  if (!key) return 'empty_key';
  return key;
}

function isValidText(text) {
  if (!text || text.trim().length === 0) return false;
  if (/^[^a-zA-Z]+$/.test(text)) return false; 
  if (text.trim().startsWith('{') && text.trim().endsWith('}')) return false;
  return true;
}

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getFiles(fullPath, files);
    } else if (fullPath.endsWith('.jsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getFiles(SRC_DIR);

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  let ast;
  
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    });
  } catch (e) {
    console.error(`Error parsing ${file}:`, e.message);
    return;
  }

  const replacements = [];

  traverse(ast, {
    JSXText(pathNode) {
      const text = pathNode.node.value;
      if (isValidText(text)) {
        const trimmed = text.trim();
        const key = `ui.${generateKey(trimmed)}`;
        extractedKeys[key] = trimmed;
        
        // Because it's JSXText, we replace the whole node
        replacements.push({
          start: pathNode.node.start,
          end: pathNode.node.end,
          text: `{t('${key}', \`${trimmed.replace(/`/g, "\\`")}\`)}`
        });
      }
    },
    StringLiteral(pathNode) {
      const parent = pathNode.parent;
      if (parent.type === 'JSXAttribute') {
        const name = parent.name.name;
        if (['placeholder', 'title', 'label'].includes(name)) {
           const text = pathNode.node.value;
           if (isValidText(text)) {
             const key = `ui.${generateKey(text)}`;
             extractedKeys[key] = text;
             
             // For JSXAttribute StringLiteral, we replace "text" with {t('key', `text`)}
             replacements.push({
               start: pathNode.node.start,
               end: pathNode.node.end,
               text: `{t('${key}', \`${text.replace(/`/g, "\\`")}\`)}`
             });
           }
        }
      }
    }
  });

  if (replacements.length > 0) {
    // Sort descending by start position to replace from bottom up
    replacements.sort((a, b) => b.start - a.start);
    
    for (const rep of replacements) {
      code = code.substring(0, rep.start) + rep.text + code.substring(rep.end);
    }

    if (!code.includes('useTranslation')) {
       code = `import { useTranslation } from "react-i18next";\n` + code;
       code = code.replace(/(export default function \w+\([^)]*\)\s*\{)/, '$1\n  const { t } = useTranslation();');
       code = code.replace(/(export function \w+\([^)]*\)\s*\{)/, '$1\n  const { t } = useTranslation();');
       code = code.replace(/(const \w+ = \([^)]*\)\s*=>\s*\{)/, '$1\n  const { t } = useTranslation();');
    }

    fs.writeFileSync(file, code, 'utf8');
    totalComponentsUpdated++;
    totalStringsReplaced += replacements.length;
    console.log(`Refactored ${file}`);
  }
});

const localesDir = path.join(__dirname, 'src', 'locales');
if (!fs.existsSync(localesDir)) fs.mkdirSync(localesDir);

fs.writeFileSync(path.join(localesDir, 'extractedEn.json'), JSON.stringify(extractedKeys, null, 2));

console.log('\n=========================================================');
console.log('REFACTORING COMPLETE');
console.log('=========================================================');
console.log(`1. Total number of components updated: ${totalComponentsUpdated}`);
console.log(`2. Total number of hardcoded strings replaced: ${totalStringsReplaced}`);
console.log(`3. Total translation keys added: ${Object.keys(extractedKeys).length}`);
console.log('=========================================================');
