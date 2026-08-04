import os
import json
import re

LOCALES_DIR = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'src', 'locales')

def clean_string(s):
    if not isinstance(s, str):
        return s
    s = re.sub(r'\[[A-Z]{2,3}\]\s*', '', s)
    s = re.sub(r'\s*\[[A-Z]{2,3}\]', '', s)
    return s.strip()

def clean_object(obj):
    if isinstance(obj, str):
        return clean_string(obj)
    elif isinstance(obj, list):
        return [clean_object(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: clean_object(v) for k, v in obj.items()}
    return obj

def main():
    if not os.path.exists(LOCALES_DIR):
        print(f"Directory {LOCALES_DIR} does not exist.", flush=True)
        return
        
    for filename in os.listdir(LOCALES_DIR):
        if filename.endswith('.json'):
            filepath = os.path.join(LOCALES_DIR, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                cleaned_data = clean_object(data)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(cleaned_data, f, indent=2, ensure_ascii=False)
                print(f"Cleaned {filename}", flush=True)
            except Exception as e:
                print(f"Error processing {filename}: {e}", flush=True)

if __name__ == '__main__':
    main()
