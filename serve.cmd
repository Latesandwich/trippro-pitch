@echo off
rem Serves this folder at http://localhost:8000/ and opens it in the browser.
rem The speaker window needs http, not file://. Close this window to stop the server.
if "%~1"=="open" goto open
cd /d "%~dp0"
set "PY=py"
where py >nul 2>nul || set "PY=python"
start "" /b cmd /c ""%~f0" open"
%PY% -m http.server 8000
pause
exit /b

:open
rem Opens the browser once the server answers; Python can take a few seconds to start.
for /l %%i in (1,1,20) do (
  curl -s -o nul http://localhost:8000/ 2>nul && goto opened
  ping -n 2 127.0.0.1 >nul
)
:opened
start "" http://localhost:8000/
