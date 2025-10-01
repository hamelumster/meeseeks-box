# desktop.py
import logging
import os
import socket
import threading
import time
import requests

from werkzeug.serving import make_server
import webview

from app import create_app

APP_NAME = "Meeseeks box"
HOST = "127.0.0.1"
PORT_START = 5000
PORT_TRIES = 25
HEALTH_PATH = "/api/health"
HEALTH_TIMEOUT_S = 10
HEALTH_POLL_MS = 150


def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s"
    )


def find_free_port(start=PORT_START, tries=PORT_TRIES):
    port = start
    for _ in range(tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind((HOST, port))
                return port
            except OSError:
                port += 1
    raise RuntimeError("No free port found")


class FlaskServerThread(threading.Thread):
    def __init__(self, app, host, port):
        super().__init__(daemon=True)
        self.server = make_server(host, port, app)

    def run(self):
        self.server.serve_forever()

    def shutdown(self):
        self.server.shutdown()


def wait_until_healthy(url, timeout_s=HEALTH_TIMEOUT_S, poll_ms=HEALTH_POLL_MS):
    deadline = time.time() + timeout_s
    last_err = None
    while time.time() < deadline:
        try:
            r = requests.get(url, timeout=1.5)
            if r.ok and r.json().get("ok"):
                return True
        except Exception as e:
            last_err = e
        time.sleep(poll_ms / 1000.0)
    logging.warning("Healthcheck failed: %s", last_err)
    return False


def main():
    setup_logging()

    app = create_app()
    port = find_free_port()
    url = f"http://{HOST}:{port}/"
    health_url = f"http://{HOST}:{port}{HEALTH_PATH}"

    logging.info("Starting Flask on %s", url)
    srv = FlaskServerThread(app, HOST, port)
    srv.start()

    if not wait_until_healthy(health_url):
        logging.error("Server failed healthcheck, exiting.")
        webview.create_window(APP_NAME, html="<h3>Failed to start server</h3>")
        webview.start()
        return

    window = webview.create_window(
        APP_NAME,
        url=url,
        width=1024,
        height=1000,
        resizable=True,
        confirm_close=True,
        text_select=True,
        min_size=(960, 720)
    )

    def on_closing():
        logging.info("Window closed, shutting down server...")
        try:
            srv.shutdown()
        except Exception as e:
            logging.exception("Error on server shutdown: %s", e)

    window.events.closing += on_closing

    logging.info("Opening app window")
    webview.start()

    logging.info("Exited")


if __name__ == "__main__":
    main()
