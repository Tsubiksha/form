import urllib.request
import urllib.error
import json

url = "http://127.0.0.1:8000/admin/settings"
print(f"Testing {url} ...")

try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as res:
        print("Status:", res.status)
        print("Body:", res.read().decode())
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code)
    print("Body:", e.read().decode())
except Exception as e:
    print("Error:", e)
