import re

THINK_RE = re.compile(r"(?is)<think>.*?</think>\s*")

def _clean_content_from_response(obj: dict) -> str:
    """Достаёт text и чистит <think>…</think>."""
    content = (obj.get("choices") or [{}])[0].get("message", {}).get("content", "")
    content = THINK_RE.sub("", content).strip()
    # прибираем возможные лишние пустые строки
    content = re.sub(r"\n{3,}", "\n\n", content)
    return content