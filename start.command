#!/bin/bash
# Double-click to start Clash Village Tracker (macOS).
cd "$(dirname "$0")"

if [ ! -d "web/dist" ]; then
  echo "Missing web/dist. Build first: cd web && npm install && npm run build"
  read -r -p "Press Enter to close…"
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "Optional: create .env with API_KEY=... for official API features."
  echo "Village export works without it."
  echo
fi

# Prefer project venv, then python3, then python
if [ -x ".venv/bin/python" ]; then
  PY=".venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PY="python3"
elif command -v python >/dev/null 2>&1; then
  PY="python"
else
  echo "Python 3 is required. Install from https://www.python.org/downloads/"
  read -r -p "Press Enter to close…"
  exit 1
fi

"$PY" -c "import dotenv" 2>/dev/null || "$PY" -m pip install --user python-dotenv
exec "$PY" server.py --open
