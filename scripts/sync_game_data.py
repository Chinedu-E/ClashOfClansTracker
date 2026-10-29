#!/usr/bin/env python3
"""Download clash-of-clans-data home/builder JSON into web/src/game-data."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

VERSION = "0.19.0"
CDN = f"https://cdn.jsdelivr.net/npm/clash-of-clans-data@{VERSION}/data"
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "web" / "src" / "game-data"
MANIFEST_URL = f"https://data.jsdelivr.com/v1/packages/npm/clash-of-clans-data@{VERSION}"

HOME_CATEGORIES = {
    "defenses",
    "traps",
    "walls",
    "troops",
    "spells",
    "siege-machines",
    "heroes",
    "hero-equipment",
    "pets",
    "resource-buildings",
    "army-buildings",
    "guardians",
    "town-hall",
}

BUILDER_CATEGORIES = {
    "defenses",
    "traps",
    "walls",
    "troops",
    "heroes",
    "resource-buildings",
    "army-buildings",
    "builder-hall",
    "other",
}


def download(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "coc-tracker/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def collect_json_files(node: dict, prefix: str = "") -> list[str]:
    files: list[str] = []
    name = node.get("name", "")
    path = f"{prefix}/{name}".strip("/") if name else prefix
    if node.get("type") == "file" and name.endswith(".json"):
        files.append(path)
        return files
    for child in node.get("files") or []:
        files.extend(collect_json_files(child, path))
    return files


def category_for(path: str) -> str | None:
    # path like "data/home/defenses/cannon.json"
    parts = path.split("/")
    if len(parts) < 4 or parts[0] != "data":
        return None
    base = parts[1]
    category = parts[2]
    if base == "home" and category in HOME_CATEGORIES:
        return "home"
    if base == "builder" and category in BUILDER_CATEGORIES:
        return "builder"
    return None


def build_index(entities: list[dict]) -> dict:
    by_id: dict[str, dict] = {}
    for entity in entities:
        data_id = entity.get("dataId")
        if data_id is None:
            continue
        levels = []
        for level in entity.get("levels") or []:
            build_time = (
                level.get("buildTime")
                or level.get("upgradeTime")
                or level.get("researchTime")
                or {}
            )
            seconds = (
                int(build_time.get("days") or 0) * 86400
                + int(build_time.get("hours") or 0) * 3600
                + int(build_time.get("minutes") or 0) * 60
                + int(build_time.get("seconds") or 0)
            )
            cost = level.get("buildCost")
            if cost is None:
                cost = level.get("upgradeCost")
            if cost is None:
                cost = level.get("researchCost")
            resource = (
                level.get("buildCostResource")
                or level.get("upgradeCostResource")
                or level.get("researchCostResource")
            )
            images = level.get("images") or entity.get("images") or {}
            image = (
                images.get("normal")
                or images.get("icon")
                or next((v for v in images.values() if isinstance(v, str)), None)
            )
            levels.append(
                {
                    "level": level.get("level"),
                    "cost": cost,
                    "resource": resource,
                    "timeSeconds": seconds,
                    "townHallRequired": level.get("townHallRequired")
                    or level.get("builderHallRequired"),
                    "labRequired": level.get("laboratoryRequired"),
                    "heroHallRequired": level.get("heroHallLevelRequired"),
                    "petHouseRequired": level.get("petHouseLevelRequired"),
                    "blacksmithRequired": level.get("blacksmithLevelRequired"),
                    "image": image,
                }
            )

        available = entity.get("availablePerTownHall") or entity.get("availablePerBuilderHall") or []
        max_by_hall: dict[str, int] = {}

        # Prefer deriving from per-level town/builder hall requirements.
        has_hall_req = any(level.get("townHallRequired") is not None for level in levels)
        if has_hall_req:
            for hall in range(1, 19):
                max_level = 0
                for level in levels:
                    required = level.get("townHallRequired")
                    if required is not None and required <= hall:
                        max_level = max(max_level, level.get("level") or 0)
                if max_level:
                    max_by_hall[str(hall)] = max_level
        elif available:
            for row in available:
                hall = row.get("townHallLevel") or row.get("builderHallLevel")
                if hall is None:
                    continue
                max_level = 0
                for level in levels:
                    required = level.get("townHallRequired") or 1
                    if required <= hall:
                        max_level = max(max_level, level.get("level") or 0)
                max_by_hall[str(hall)] = max_level

        by_id[str(data_id)] = {
            "id": entity.get("id"),
            "dataId": data_id,
            "name": entity.get("name"),
            "base": entity.get("base"),
            "category": entity.get("category"),
            "levels": levels,
            "maxLevelByHall": max_by_hall,
            "countByHall": {
                str(row.get("townHallLevel") or row.get("builderHallLevel")): row.get("count")
                for row in available
                if (row.get("townHallLevel") or row.get("builderHallLevel")) is not None
            },
        }
    return by_id


def main() -> None:
    print(f"Fetching package file list for clash-of-clans-data@{VERSION}…")
    try:
        manifest = json.loads(download(MANIFEST_URL))
    except urllib.error.URLError as exc:
        raise SystemExit(f"Could not fetch package manifest: {exc}") from exc

    data_node = next((f for f in manifest.get("files") or [] if f.get("name") == "data"), None)
    if not data_node:
        raise SystemExit("Package manifest has no data/ directory.")

    all_files = collect_json_files(data_node)
    # Paths look like "data/home/defenses/cannon.json"
    targets = [path for path in all_files if category_for(path)]
    if not targets:
        raise SystemExit("No home/builder JSON files found in package manifest.")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    entities: list[dict] = []
    for path in sorted(targets):
        # path is "data/home/..." — CDN already ends at /data
        relative = "/".join(path.split("/")[1:])
        url = f"{CDN}/{relative}"
        print(f"  {relative}")
        try:
            entity = json.loads(download(url))
        except urllib.error.HTTPError as exc:
            print(f"    skip ({exc.code})", file=sys.stderr)
            continue
        entities.append(entity)

    index = build_index(entities)
    out_path = OUT_DIR / "index.json"
    out_path.write_text(json.dumps(index, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(index)} entities to {out_path.relative_to(ROOT)}")

    # Sanity check: Cannon
    cannon = index.get("1000008")
    if not cannon or cannon.get("name") != "Cannon":
        raise SystemExit("Sanity check failed: expected Cannon at dataId 1000008")
    print("Sanity check passed: Cannon (1000008)")


if __name__ == "__main__":
    main()
