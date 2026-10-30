# Clash Village Tracker

Personal Clash of Clans dashboard: paste your village export, sync the official API, and plan upgrades.

<p align="center">
  <img src="docs/screenshots/dashboard.jpeg" alt="Dashboard" width="800"/>
</p>

## Features

- **Village export** — building levels, builder timers, progress rings
- **Upgrade recommendations** — sort by time, cost, or heroes & lab
- **Builder blocks** — six manual queues with path-to-max cost/time and live matching
- **Heroes** — tap a hero for cost/time to TH max
- **Global discounts** — cost & builder-time % for events/passes
- **Battle log & analytics** — loot, armies, attack patterns
- **Official API** — player profile + battle history (local proxy)

<p align="center">
  <img src="docs/screenshots/timeline.jpg" alt="Timeline" width="800"/>
  <img src="docs/screenshots/rec.jpg" alt="Builder blocks" width="800"/>
  <img src="docs/screenshots/battle-log.jpg" alt="Battle log" width="800"/>
  <img src="docs/screenshots/battle-lytics.jpg" alt="Battle analytics" width="800"/>
</p>

## Run (no Node required)

Needs **Python 3.10+**.

1. Download or clone this repo
2. Optional — for official API features, create a `.env` file:

   ```
   API_KEY=your_token_here
   ```

   Get a key at [developer.clashofclans.com](https://developer.clashofclans.com/) and allowlist your public IP. Village export works without a key.

3. Start the app:
   - **macOS:** double-click `start.command` (right-click → Open the first time if macOS blocks it)
   - **Windows:** double-click `start.bat`
   - **Or terminal:** `python3 server.py --open`

Opens **http://127.0.0.1:8787**. Leave the terminal window open while using the dashboard.

## Usage

1. In-game: **Settings → More Settings → Data Export → Copy**
2. Paste into the dashboard
3. (Optional) enter current storages so “affordable” badges work
4. Re-paste after starting/finishing upgrades so timers stay accurate

## Develop

For live UI reload you still need Node 18+:

```bash
# Terminal 1 — API + static (or API only)
python3 server.py

# Terminal 2 — Vite
cd web && npm install && npm run dev
```

Open **http://127.0.0.1:5173**. After UI changes, rebuild for the one-click app:

```bash
cd web && npm run build
```

Optional — refresh upgrade costs after a game update:

```bash
python3 scripts/sync_game_data.py
```

## Notes

The official API does not expose storages or builder queues — the export fills those gaps. Icons via [ClashKing Assets](https://assets.clashk.ing); costs from [clash-of-clans-data](https://www.npmjs.com/package/clash-of-clans-data).
