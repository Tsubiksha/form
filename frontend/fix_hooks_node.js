const fs = require('fs');
const glob = require('glob');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      walk(p, callback);
    } else if (p.endsWith('.jsx')) {
      callback(p);
    }
  });
}

let count = 0;
walk('src', (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;

  // Find all function components and add useTranslation if they use t(
  // We match: function Name(...) {
  // Or: const Name = (...) => {
  // Or: const Name = function(...) {
  
  // A robust regex for function Name(...) {
  const funcRegex = /((?:export\s+default\s+|export\s+)?function\s+[A-Z]\w*\s*\([\s\S]*?\)\s*\{)/g;
  
  content = content.replace(funcRegex, (match) => {
    // Check if useTranslation is already right after
    // But we don't care, we can just check if it's there. Actually we can just check if `const { t } = useTranslation();` is in the function body? It's hard.
    // Let's just blindly add it if the file contains `t(` and the match doesn't seem to have it immediately after.
    
    // Instead of regex, let's just insert it safely
    // We'll just replace all components and then remove duplicates
    return match + '\n  const { t } = useTranslation();';
  });

  // A robust regex for const Name = (...) => {
  const arrowRegex = /((?:export\s+default\s+|export\s+)?(?:const|let|var)\s+[A-Z]\w*\s*=\s*(?:\([\s\S]*?\)|[a-zA-Z0-9_]+)\s*=>\s*\{)/g;
  
  content = content.replace(arrowRegex, (match) => {
    return match + '\n  const { t } = useTranslation();';
  });

  if (content !== original) {
    // Deduplicate `const { t } = useTranslation();`
    // If a function had it already, now it has it twice:
    // const { t } = useTranslation();
    // const { t } = useTranslation();
    // We can fix this by collapsing multiple adjacent or nearby hooks
    content = content.replace(/(const\s+\{\s*t\s*\}\s*=\s*useTranslation\(\);\s*)+/g, 'const { t } = useTranslation();\n  ');
    
    // Also add import if missing
    if (!content.includes('import { useTranslation }')) {
      content = 'import { useTranslation } from "react-i18next";\n' + content;
    }
    
    fs.writeFileSync(filepath, content, 'utf8');
    count++;
  }
});

console.log(`Updated ${count} files.`);
