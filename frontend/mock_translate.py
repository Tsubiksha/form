import json
import glob

with open('src/locales/en.json', 'r', encoding='utf-8') as f:
    en_data = json.load(f)

def transform_dict(d, prefix):
    new_d = {}
    for k, v in d.items():
        if isinstance(v, str):
            new_d[k] = f"[{prefix}] {v}"
        elif isinstance(v, dict):
            new_d[k] = transform_dict(v, prefix)
        else:
            new_d[k] = v
    return new_d

for lang in ['fr', 'de', 'es', 'ja', 'zh', 'ta', 'te', 'kn', 'ml', 'hi', 'mr', 'ko']:
    file = f'src/locales/{lang}.json'
    prefix = lang.upper()
    
    new_data = transform_dict(en_data, prefix)
    
    with open(file, 'w', encoding='utf-8') as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)

print('Successfully generated mock translations.')
