from flask import Flask, Response, jsonify, request, stream_with_context, send_from_directory
import requests

from config import SYSTEM_PROMPT
from lm_client import detect_first_responsive_model
from utils import _clean_content_from_response, LM_BASE

app = Flask(__name__)

@app.get("/")
def index():
    return send_from_directory("static", "index.html")

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

@app.post("/api/ask")
def api_ask():
    """
    Клиент присылает только { "prompt": "...", "stream": false } (stream опционален).
    Если model не передан — автоматически ищем «рабочую» модель.
    """
    try:
        body = request.get_json(force=True, silent=False)
    except Exception:
        return jsonify({"error": "invalid_json"}), 400
    if not isinstance(body, dict):
        return jsonify({"error": "invalid_payload"}), 400

    prompt = body.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip():
        return jsonify({"error": "prompt_required"}), 400

    model = body.get("model")  # опционально
    if not model:
        model = detect_first_responsive_model()
        if not model:
            return jsonify({
                "error": "no_responsive_model",
                "message": "Не найдено ни одной модели, которая отвечает. Запустите LM Studio Server и загрузите модель."
            }), 503

    stream = bool(body.get("stream", False))
    temperature = body.get("temperature", 0.7)
    max_tokens = body.get("max_tokens", 2048)

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": stream,
    }

    headers = {"Content-Type": "application/json"}
    if stream:
        headers["Accept"] = "text/event-stream"

    try:
        upstream = requests.post(
            f"{LM_BASE}/chat/completions",
            json=payload,
            headers=headers,
            stream=stream,
            timeout=(5, 300),
        )
    except requests.exceptions.ConnectTimeout:
        return jsonify({"error": "upstream_connect_timeout"}), 504
    except requests.exceptions.ReadTimeout:
        return jsonify({"error": "upstream_read_timeout"}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "upstream_unreachable"}), 503
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "upstream_error", "message": str(e)}), 502

    if not stream:
        try:
            obj = upstream.json()
            cleaned = _clean_content_from_response(obj)
            return jsonify({"content": cleaned}), upstream.status_code
        except Exception:
            return Response(
                upstream.content,
                status=upstream.status_code,
                content_type=upstream.headers.get("Content-Type", "application/json"),
            )

    # stream=true — прозрачная проксировка SSE (клиент фильтрует <think>)
    if upstream.status_code != 200:
        return Response(
            upstream.content,
            status=upstream.status_code,
            content_type=upstream.headers.get("Content-Type", "application/json"),
        )

    def generate():
        try:
            for line in upstream.iter_lines(chunk_size=1024, decode_unicode=False):
                if line:
                    yield line + b"\n"
            yield b"\n"
        finally:
            upstream.close()

    resp = Response(
        stream_with_context(generate()),
        status=upstream.status_code,
        content_type="text/event-stream",
    )
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"
    return resp


if __name__ == "__main__":
    app.run(port=5000)