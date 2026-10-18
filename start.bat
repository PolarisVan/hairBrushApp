@echo off
cd /d "%~dp0"
start "" cmd /c "timeout /t 1 >nul & start http://localhost:5173"
node server.js
