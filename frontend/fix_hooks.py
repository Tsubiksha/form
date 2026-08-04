import os
import glob
import re

files = glob.glob('c:/Users/Subiksha/OneDrive/Documents/lowcode-form-platform/frontend/src/**/*.jsx', recursive=True)

# Filter out node_modules just in case, though src/ should not have it, but just to be sure
files = [f for f in files if 'node_modules' not in f]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if 'useTranslation' not in content:
        continue
    
    # Simple replace
    new_lines = []
    for line in content.split('\n'):
        if 'const { t } = useTranslation();' in line:
            line = line.replace('const { t } = useTranslation();', '')
        new_lines.append(line)
        
    content = '\n'.join(new_lines)
    
    # insert at the top of components
    def repl(m):
        return m.group(1) + '\n  const { t } = useTranslation();\n'

    content = re.sub(r'(export default function [A-Z]\w*\([^)]*\)\s*\{)', repl, content)
    content = re.sub(r'(export function [A-Z]\w*\([^)]*\)\s*\{)', repl, content)
    content = re.sub(r'(^|\s)(function [A-Z]\w*\([^)]*\)\s*\{)', repl, content)
    content = re.sub(r'(const [A-Z]\w*\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>\s*\{)', repl, content)
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

print('Successfully fixed hooks in all JSX files.')
