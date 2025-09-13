import requests, re, json

URL = "http://127.0.0.1:5000/api/ask"
PROMPT = "сколько букв r в слове Raspberry?"

THINK_RE = re.compile(r"(?is)<think>.*?</think>\s*")

r = requests.post(URL, json={"prompt": PROMPT, "stream": False}, timeout=60)
print("HTTP", r.status_code)
try:
    data = r.json()
    content = data["choices"][0]["message"]["content"]
    print("Assistant:", THINK_RE.sub("", content))
except Exception:
    print(r.text)
