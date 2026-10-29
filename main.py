import argparse
import os
import sys

from dotenv import load_dotenv

from coc_api import CocApiError, fetch_player, normalize_tag


def _line(label: str, value) -> str:
    if value is None or value == "":
        return ""
    return f"  {label:<22} {value}"


def display_player(player: dict) -> None:
    clan = player.get("clan") or {}
    league = player.get("league") or {}
    builder_league = player.get("builderBaseLeague") or {}
    legends = player.get("legendStatistics") or {}
    best_season = legends.get("bestSeason") or {}

    print(f"{player.get('name', 'Unknown')}  ({player.get('tag', '')})")
    print("-" * 48)

    rows = [
        _line("Town Hall", _town_hall(player)),
        _line("Experience", player.get("expLevel")),
        _line("Trophies", _trophies(player.get("trophies"), player.get("bestTrophies"))),
        _line("League", league.get("name")),
        _line("War stars", player.get("warStars")),
        _line("Attack wins", player.get("attackWins")),
        _line("Defense wins", player.get("defenseWins")),
        _line("Donations", _donations(player)),
        _line("War preference", player.get("warPreference")),
        _line("Clan", _clan(clan)),
        _line("Clan role", _role(player.get("role"))),
        _line("Capital gold", player.get("clanCapitalContributions")),
        _line("Builder Hall", player.get("builderHallLevel")),
        _line(
            "Builder trophies",
            _trophies(
                player.get("builderBaseTrophies"),
                player.get("bestBuilderBaseTrophies"),
            ),
        ),
        _line("Builder league", builder_league.get("name")),
        _line("Legend trophies", legends.get("legendTrophies")),
        _line("Best season", _season(best_season)),
    ]
    print("\n".join(row for row in rows if row))

    heroes = player.get("heroes") or []
    if heroes:
        print("\nHeroes")
        for hero in heroes:
            village = hero.get("village", "home")
            print(f"  {hero.get('name', 'Hero'):<22} level {hero.get('level', '?')}  ({village})")

    troops = [troop for troop in player.get("troops") or [] if troop.get("village") == "home"]
    if troops:
        print("\nHome troops")
        for troop in troops:
            print(
                f"  {troop.get('name', 'Troop'):<22} "
                f"level {troop.get('level', '?')}/{troop.get('maxLevel', '?')}"
            )

    spells = player.get("spells") or []
    if spells:
        print("\nSpells")
        for spell in spells:
            print(
                f"  {spell.get('name', 'Spell'):<22} "
                f"level {spell.get('level', '?')}/{spell.get('maxLevel', '?')}"
            )


def _town_hall(player: dict) -> str | None:
    level = player.get("townHallLevel")
    if level is None:
        return None
    weapon = player.get("townHallWeaponLevel")
    if weapon:
        return f"{level} (weapon {weapon})"
    return str(level)


def _trophies(current, best) -> str | None:
    if current is None and best is None:
        return None
    if best is None:
        return str(current)
    return f"{current}  (best {best})"


def _donations(player: dict) -> str | None:
    given = player.get("donations")
    received = player.get("donationsReceived")
    if given is None and received is None:
        return None
    return f"{given} given, {received} received"


def _clan(clan: dict) -> str | None:
    if not clan:
        return "No clan"
    level = clan.get("clanLevel")
    level_text = f"  (level {level})" if level is not None else ""
    return f"{clan.get('name', 'Unknown')} {clan.get('tag', '')}{level_text}"


def _role(role: str | None) -> str | None:
    labels = {
        "leader": "Leader",
        "coLeader": "Co-leader",
        "admin": "Elder",
        "member": "Member",
    }
    if role is None:
        return None
    return labels.get(role, role)


def _season(season: dict) -> str | None:
    if not season:
        return None
    parts = []
    if season.get("id"):
        parts.append(str(season["id"]))
    if season.get("trophies") is not None:
        parts.append(f"{season['trophies']} trophies")
    if season.get("rank") is not None:
        parts.append(f"rank {season['rank']}")
    return ", ".join(parts) or None


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(
        description="Look up a Clash of Clans player by tag."
    )
    parser.add_argument(
        "tag",
        nargs="?",
        help="Player tag, with or without the leading # (example: #2PP)",
    )
    args = parser.parse_args()

    token = os.getenv("API_KEY", "").strip()
    if not token:
        raise SystemExit("Set API_KEY in .env before looking up a player.")

    raw_tag = args.tag
    if not raw_tag:
        try:
            raw_tag = input("Player tag: ")
        except EOFError:
            raise SystemExit("Pass a player tag, for example: python main.py #2PP") from None

    try:
        tag = normalize_tag(raw_tag)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc

    try:
        display_player(fetch_player(tag, token))
    except CocApiError as exc:
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
