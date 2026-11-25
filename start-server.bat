@echo off
title VYOMA Atmospheric Intelligence Server
cd /d "%~dp0"
echo Starting VYOMA Atmospheric Intelligence on http://localhost:3000 ...
powershell -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
pause
