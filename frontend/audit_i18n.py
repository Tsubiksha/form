import os
import re

SRC_DIR = os.path.join(os.path.dirname(__file__), 'src')

def audit():
    crashing_files = []
    
    for root, dirs, files in os.walk(SRC_DIR):
        for file in files:
            if file.endswith('.jsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    has_t_call = re.search(r'\bt\(', content)
                    has_t_def = re.search(r'const\s+\{\s*t\s*\}\s*=\s*useTranslation', content)
                    has_import = re.search(r'import\s+\{\s*useTranslation\s*\}\s+from\s+[\'"]react-i18next[\'"]', content)
                    
                    if has_t_call and not (has_t_def and has_import):
                        crashing_files.append((path, bool(has_t_def), bool(has_import)))
                        
    print("Files missing 't' definition or import:")
    for f, has_def, has_imp in crashing_files:
        print(f"{f} - has_def: {has_def}, has_imp: {has_imp}")

if __name__ == '__main__':
    audit()
