@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "WRANGLER_LOG_PATH=.wrangler\wrangler.log"
start "" "%~dp0index.html"
endlocal
exit /b %errorlevel%
