from flask import Flask, Response, jsonify, request
import requests

app = Flask(__name__)

LM_BASE = "http://127.0.0.1:1234/v1"

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

@app.post("/api/chat")
def api_chat():
    try:
        payload = request.get_json(force=True, silent=False)
    except Exception:
        return jsonify({"error": "invalid_json"}), 400

    if not isinstance(payload, dict):
        return jsonify({"error": "invalid_payload"}), 400

    if "model" not in payload or "messages" not in payload:
        return jsonify({"error": "model_and_messages_required"}), 400

    try:
        r = requests.post(f"{LM_BASE}/chat/completions", json=payload, timeout=500)
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "upstream_error", "message": str(e)}), 502

    return Response(
        r.content,
        status=r.status_code,
        content_type=r.headers.get("Content-Type", "application/json"),
    )



if __name__ == "__main__":
    app.run(port=5000)