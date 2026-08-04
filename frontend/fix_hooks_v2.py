import os
import glob
import re

files = glob.glob('c:/Users/Subiksha/OneDrive/Documents/lowcode-form-platform/frontend/src/**/*.jsx', recursive=True)
files = [f for f in files if 'node_modules' not in f]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        lines = file.readlines()
        
    changed = False
    new_lines = []
    for i, line in enumerate(lines):
        if 'const { t } = useTranslation();' in line:
            prev = lines[i-1].strip() if i > 0 else ""
            
            is_valid = False
            
            # Match function Name
            if re.search(r'function\s+([A-Z]\w*)', prev):
                is_valid = True
                
            # Match const Name = 
            if re.search(r'(?:const|let|var)\s+([A-Z]\w*)\s*=', prev):
                is_valid = True
                
            if not is_valid:
                # Remove it
                line = line.replace('const { t } = useTranslation();', '').strip()
                if line == '':
                    changed = True
                    continue # skip empty line
                line = '  ' + line + '\n' # add some indent back
                changed = True
                
        new_lines.append(line)
        
    if changed:
        with open(f, 'w', encoding='utf-8') as file:
            file.writelines(new_lines)

print("Done fixing hooks!")
