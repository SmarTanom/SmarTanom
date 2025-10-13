@echo off
REM Start Production Preview Server
cd /d "%~dp0frontend"
echo Starting production preview server...
echo Service worker will be enabled for push notifications
echo.
echo Open: http://localhost:4173
echo.
call npm run preview
