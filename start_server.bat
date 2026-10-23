@echo off
setlocal
echo ============================================
echo   Revenue Intelligence Inbox
echo   Flask + Supabase Cloud Server
echo ============================================
echo.

set "PY_EXE=%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe"
if not exist "%PY_EXE%" (
    set "PY_EXE=python"
)

echo Starting Flask server with: %PY_EXE%
echo.
echo  Open your browser at: http://localhost:5000
echo  Press Ctrl+C to stop the server.
echo.
"%PY_EXE%" backend\app.py
pause
