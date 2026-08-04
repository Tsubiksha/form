import json
import os
import time
from deep_translator import GoogleTranslator
from concurrent.futures import ThreadPoolExecutor

LANGUAGES = {
    'ta': 'tamil',
    'te': 'telugu',
    'kn': 'kannada',
    'ml': 'malayalam',
    'hi': 'hindi',
    'mr': 'marathi',
    'fr': 'french',
    'de': 'german',
    'es': 'spanish',
    'ja': 'japanese',
    'zh': 'zh-CN',
    'ko': 'korean'
}

LOCALES_DIR = os.path.join(os.path.dirname(__file__), 'src', 'locales')
EN_FILE = os.path.join(LOCALES_DIR, 'en.json')

def flatten_dict(d, parent_key='', sep='.'):
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

def unflatten_dict(d, sep='.'):
    result = {}
    for k, v in d.items():
        keys = k.split(sep)
        d_ref = result
        for key in keys[:-1]:
            if key not in d_ref:
                d_ref[key] = {}
            d_ref = d_ref[key]
        d_ref[keys[-1]] = v
    return result

def translate_text(text, target_lang):
    if not text or not isinstance(text, str): return text
    # Preserve placeholders like {{name}}
    # Deep-translator sometimes messes up {{name}} so we'll do simple translate
    try:
        translated = GoogleTranslator(source='en', target=target_lang).translate(text)
        return translated
    except Exception as e:
        print(f"Error translating '{text}' to {target_lang}: {e}")
        return text

def process_language(lang_code, lang_name, flat_en):
    print(f"Translating for {lang_code} ({lang_name})...")
    
    out_file = os.path.join(LOCALES_DIR, f"{lang_code}.json")
    
    # Load existing to skip already translated if we want, but let's just do a fresh translation
    # to ensure NO placeholders are left.
    translated_flat = {}
    
    # We will do this serially per language to avoid Google Translate rate limits 
    # as much as possible, or slightly parallel
    
    def translate_key(k_v):
        k, v = k_v
        # skip translating if it's a structural or numeric value
        if not isinstance(v, str) or len(v.strip()) == 0:
            return (k, v)
        # if value is just English placeholder code or tag, ignore it and translate the real one
        if "[EN]" in v or "[FR]" in v: 
            v = v.replace("[EN]", "").replace("[FR]", "").strip()
            
        trans = translate_text(v, lang_name)
        time.sleep(0.1) # rate limit protection
        return (k, trans)

    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(translate_key, flat_en.items()))
        
    for k, v in results:
        translated_flat[k] = v
        
    # Unflatten and save
    final_dict = unflatten_dict(translated_flat)
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(final_dict, f, ensure_ascii=False, indent=2)
    
    print(f"Finished {lang_code}.json")

if __name__ == '__main__':
    with open(EN_FILE, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
        
    flat_en = flatten_dict(en_data)
    
    # Save a flattened version of EN as well just to be consistent
    final_en = unflatten_dict(flat_en)
    with open(EN_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_en, f, ensure_ascii=False, indent=2)
    
    print(f"Loaded {len(flat_en)} keys from en.json")
    
    for code, name in LANGUAGES.items():
        process_language(code, name, flat_en)
        
    print("All translations complete!")
