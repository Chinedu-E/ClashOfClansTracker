"""Shared Clash of Clans API client."""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request

API_BASE = "https://api.clashofclans.com/v1"


class CocApiError(Exception):
    """Raised when the Clash of Clans API returns an error."""

    def __init__(self, message: str, *, status: int | None = None) -> None:
        super().__init__(message)
        self.status = status


def normalize_tag(tag: str) -> str:
    tag = tag.strip().upper().replace(" ", "")
    if not tag:
        raise ValueError("Player tag cannot be empty.")
    if not tag.startswith("#"):
        tag = f"#{tag}"
    return tag


def fetch_player(tag: str, token: str) -> dict:
    return _get(f"/players/{urllib.parse.quote(tag)}", token)


def fetch_battle_log(tag: str, token: str) -> list:
    payload = _get(f"/players/{urllib.parse.quote(tag)}/battlelog", token)
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        items = payload.get("items")
        if isinstance(items, list):
            return items
    return []


def _get(path: str, token: str):
    request = urllib.request.Request(
        f"{API_BASE}{path}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        detail = _error_detail(exc)
        if exc.code == 404:
            raise CocApiError("Player not found.", status=404) from exc
        if exc.code == 403:
            raise CocApiError(
                "The API rejected the request (403). "
                "Check that the API key is valid and that this machine's IP "
                "is on the key's allow list at developer.clashofclans.com."
                + (f" {detail}" if detail else ""),
                status=403,
            ) from exc
        raise CocApiError(
            f"Clash of Clans API returned HTTP {exc.code}."
            + (f" {detail}" if detail else ""),
            status=exc.code,
        ) from exc
    except urllib.error.URLError as exc:
        raise CocApiError(f"Could not reach the Clash of Clans API: {exc.reason}") from exc


def _error_detail(exc: urllib.error.HTTPError) -> str:
    try:
        payload = json.loads(exc.read().decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError, OSError):
        return ""
    reason = payload.get("reason") or payload.get("message")
    message = payload.get("message") if reason != payload.get("message") else None
    parts = [part for part in (reason, message) if part]
    return " ".join(parts)
