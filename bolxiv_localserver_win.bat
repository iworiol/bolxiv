@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0bolxiv_localserver_win.ps1" -OpenBrowser %*
if errorlevel 1 pause
