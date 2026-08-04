import os
import glob
import re

files = glob.glob('c:/Users/Subiksha/OneDrive/Documents/lowcode-form-platform/frontend/src/**/*.jsx', recursive=True)
files = [f for f in files if 'node_modules' not in f]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        
    changed = False
    
    # We want to find ALL component definitions.
    # Components are defined as:
    # 1. export default function Name(...) {
    # 2. export function Name(...) {
    # 3. function Name(...) {
    # 4. const Name = (...) => {
    
    # We will use regex to find all matches, then check if they contain a `t(` call before the next component.
    # Actually, the simplest fix is to just ensure every function starting with Capital letter has `const { t } = useTranslation();` at the start of its body, IF it contains `t(` somewhere inside.
    
    # Let's just blindly add `const { t } = useTranslation();` to ALL components that don't have it, but only if they need it. Or just add it to all components, it doesn't hurt.
    
    def repl(m):
        func_def = m.group(1)
        # Check if the body already has useTranslation
        # To avoid complex parsing, we just always insert it if not present right after the bracket
        return func_def + '\n  const { t } = useTranslation();'
        
    # Find all components:
    # 1. function Name
    new_content = re.sub(r'(function\s+[A-Z]\w*\s*\([^)]*\)\s*\{)(?!\s*const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\);)', repl, content)
    # 2. const Name = (...) => {
    new_content = re.sub(r'((?:const|let|var)\s+[A-Z]\w*\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>\s*\{)(?!\s*const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\);)', repl, content)
    
    # Also, we need to ensure `import { useTranslation } from "react-i18next";` is at the top of the file if `t(` is used.
    if new_content != content:
        changed = True
        
    if changed:
        if 'useTranslation' not in new_content:
            new_content = 'import { useTranslation } from "react-i18next";\n' + new_content
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)

print("Added missing hooks!")
