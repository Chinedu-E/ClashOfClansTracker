@echo off
REM Double-click to start Clash Village Tracker (Windows).
cd /d "%~dp0"

if not exist "web\dist\" (
  echo Missing web\dist. Build first: cd web ^&^& npm install ^&^& npm run build
  pause
  exit /b 1
)

if not exist ".env" (
  echo Optional: create .env with API_KEY=... for official API features.
  echo Village export works without it.
  echo.
)

set "PY="
if exist ".venv\Scripts\python.exe" set "PY=.venv\Scripts\python.exe"
if not defined PY where python >nul 2>&1 && set "PY=python"
if not defined PY where python3 >nul 2>&1 && set "PY=python3"
if not defined PY (
  echo Python 3 is required. Install from https://www.python.org/downloads/
  pause
  exit /b 1
)

%PY% -c "import dotenv" 2>nul || %PY% -m pip install --user python-dotenv
%PY% server.py --open
pause
