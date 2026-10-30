"""Local server: Clash of Clans API proxy + dashboard static files."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from dotenv import load_dotenv

from coc_api import CocApiError, fetch_battle_log, fetch_player, normalize_tag

HOST = "127.0.0.1"
PORT = 8787
ROOT = Path(__file__).resolve().parent
DIST = ROOT / "web" / "dist"


class Handler(BaseHTTPRequestHandler):
    server_version = "CocTracker/1.0"

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/"):
            self._handle_api(parsed)
            return

        self._serve_static(path)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        print(f"[server] {self.address_string()} {format % args}")

    def _handle_api(self, parsed) -> None:
        if parsed.path == "/api/health":
            self._json(200, {"ok": True, "ui": DIST.is_dir()})
            return

        token = os.getenv("API_KEY", "").strip()
        if not token:
            self._json(500, {"error": "Set API_KEY in .env before using the official API."})
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

    def _serve_static(self, path: str) -> None:
        if not DIST.is_dir():
            self._text(
                503,
                "Dashboard not built. From the project folder run:\n"
                "  cd web && npm install && npm run build\n",
            )
            return

        rel = unquote(path.lstrip("/")) or "index.html"
        candidate = (DIST / rel).resolve()
        try:
            candidate.relative_to(DIST.resolve())
        except ValueError:
            self._text(403, "Forbidden")
            return

        if candidate.is_dir():
            candidate = candidate / "index.html"

        if not candidate.is_file():
            # SPA fallback
            candidate = DIST / "index.html"
            if not candidate.is_file():
                self._text(404, "Not found")
                return

        content_type, _ = mimetypes.guess_type(str(candidate))
        data = candidate.read_bytes()
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", content_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

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

    def _text(self, status: int, message: str) -> None:
        body = message.encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Clash Village Tracker local server")
    parser.add_argument(
        "--open",
        action="store_true",
        help="Open the dashboard in your browser",
    )
    args = parser.parse_args(argv)

    load_dotenv(ROOT / ".env")
    url = f"http://{HOST}:{PORT}"
    server = ThreadingHTTPServer((HOST, PORT), Handler)

    if DIST.is_dir():
        print(f"Clash Village Tracker → {url}")
    else:
        print(f"API only (no web/dist) → {url}")
        print("Build the UI with: cd web && npm install && npm run build")

    if args.open and DIST.is_dir():
        webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
