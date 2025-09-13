import re

LM_BASE = "http://127.0.0.1:1234/v1"

THINK_RE = re.compile(r"(?is)<think>.*?</think>\s*")

def _clean_content_from_response(obj: dict) -> str:
    """Достаёт text и чистит <think>…</think>."""
    content = (obj.get("choices") or [{}])[0].get("message", {}).get("content", "")
    content = THINK_RE.sub("", content).strip()
    # прибираем возможные лишние пустые строки
    content = re.sub(r"\n{3,}", "\n\n", content)
    return content