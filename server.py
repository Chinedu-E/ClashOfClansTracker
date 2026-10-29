"""Local API server that proxies Clash of Clans requests for the dashboard."""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from dotenv import load_dotenv

from coc_api import CocApiError, fetch_battle_log, fetch_player, normalize_tag

HOST = "127.0.0.1"
PORT = 8787


class Handler(BaseHTTPRequestHandler):
    server_version = "CocTracker/1.0"

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self._json(200, {"ok": True})
            return

        token = os.getenv("API_KEY", "").strip()
        if not token:
            self._json(500, {"error": "Set API_KEY in .env before using the dashboard."})
            return

        query = parse_qs(parsed.query)
        raw_tag = (query.get("tag") or [None])[0]
        if not raw_tag:
            self._json(400, {"error": "Query parameter 'tag' is required."})
            return

        try:
            tag = normalize_tag(raw_tag)
        except ValueError as exc:
            self._json(400, {"error": str(exc)})
            return

        try:
            if parsed.path == "/api/player":
                self._json(200, fetch_player(tag, token))
                return
            if parsed.path == "/api/battlelog":
                self._json(200, fetch_battle_log(tag, token))
                return
        except CocApiError as exc:
            self._json(exc.status or 502, {"error": str(exc)})
            return

        self._json(404, {"error": "Not found."})

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        print(f"[api] {self.address_string()} {format % args}")

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status: int, payload) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    load_dotenv()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Clash tracker API listening on http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
