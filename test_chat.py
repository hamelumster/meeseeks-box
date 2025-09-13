# test_chat.py
import requests, json, re

URL = "http://127.0.0.1:5000/api/chat"
MODEL = "qwen/qwen3-8b"
PROMPT = "сколько букв r в слове Raspberry?"

def strip_think(text: str) -> str:
    # удаляем <think>...</think> и всё, что внутри, возвращаем только текст самого ответа 
    return re.sub(r"(?is)<think>.*?</think>\s*", "", text)

payload = {
    "model": MODEL,
    "messages": [{"role": "user", "content": PROMPT}],
    "stream": False
}

r = requests.post(URL, json=payload, timeout=500)
print("HTTP", r.status_code)

try:
    data = r.json()
    content = data["choices"][0]["message"]["content"]
    print("\nAssistant:", strip_think(content))
except Exception:
    # если вдруг не JSON — покажем «как есть»
    print(r.text)
