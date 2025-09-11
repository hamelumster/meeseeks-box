from flask import Flask, Response, jsonify
import requests

app = Flask(__name__)

# @app.route("/")
# def hello():
#     return "Hello, World!"

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


if __name__ == "__main__":
    app.run(port=5000)