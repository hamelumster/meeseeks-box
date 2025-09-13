import requests

from utils import LM_BASE


def detect_first_responsive_model() -> str | None:
    """Возвращает id первой модели, успешно отвечающей на /chat/completions, иначе None."""
    try:
        r = requests.get(f"{LM_BASE}/models", timeout=5)
        r.raise_for_status()
        models = [m.get("id") for m in r.json().get("data", []) if isinstance(m, dict)]
    except Exception:
        return None

    probe_template = {
        "model": None,  # подставим в цикле
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 1,
        "temperature": 0.0,
        "stream": False,
    }

    for mid in models:
        if not mid:
            continue
        try:
            payload = dict(probe_template)
            payload["model"] = mid
            resp = requests.post(
                f"{LM_BASE}/chat/completions",
                json=payload,
                timeout=(3, 8),  # (connect, read) — короткие таймауты для пробы
            )
            if resp.status_code == 200:
                return mid
        except requests.exceptions.RequestException:
            # просто пробуем следующую
            continue
    return None