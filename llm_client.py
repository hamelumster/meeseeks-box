import requests
from flask import Response, jsonify

from app import LM_BASE


@app.get("/api/models")
def api_models():
    r = requests.get(f"{LM_BASE}/models", timeout=10)
    return Response(r.content,
                    status=r.status_code,
                    content_type=r.headers.get("Content-Type", "application/json"))

@app.get("/api/health")
def api_health():
    try:
        r = requests.get(f"{LM_BASE}/models", timeout=5)
        return jsonify({"ok": r.status_code == 200})
    except Exception:
        return jsonify({"ok": False}), 503

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

@app.get("/api/active_model")
def api_active_model():
    """Эндпоинт, который ищет «рабочую» модель и сообщает её id."""
    mid = detect_first_responsive_model()
    if not mid:
        return jsonify({
            "error": "no_responsive_model",
            "message": "Не найдено ни одной модели, которая отвечает на /chat/completions. Проверьте, что LM Studio Server запущен и загружена чат-модель."
        }), 503
    return jsonify({"model": mid})