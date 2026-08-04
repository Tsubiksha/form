import json
import glob
import os

def fix_str(s):
    try:
        return s.encode('cp1252').decode('utf-8')
    except:
        return s

def fix_dict(d):
    for k, v in d.items():
        if isinstance(v, str):
            d[k] = fix_str(v)
        elif isinstance(v, dict):
            fix_dict(v)
    return d

for file in glob.glob('src/locales/*.json'):
    if 'en.json' in file: continue
    
    with open(file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    fixed = fix_dict(data)
    
    with open(file, 'w', encoding='utf-8') as f:
        json.dump(fixed, f, ensure_ascii=False, indent=2)

print('Fixed encoding for all locale files')
