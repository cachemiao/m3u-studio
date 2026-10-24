@echo off
setlocal
cd /d "%~dp0"
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
  "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" "%~dp0demo-server.py"
  goto :finished
)
py -3 -c "import sys;raise SystemExit(sys.version_info<(3,9))" >nul 2>&1
if not errorlevel 1 (
  py -3 "%~dp0demo-server.py"
  goto :finished
)
python -c "import sys;raise SystemExit(sys.version_info<(3,9))" >nul 2>&1
if not errorlevel 1 (
  python "%~dp0demo-server.py"
  goto :finished
)
echo Python 3.9 or newer is required. Your existing Python 3.12 works.
echo Install if needed: winget install -e --id Python.Python.3.12 --source winget
pause
exit /b 1
:finished
if errorlevel 1 pause
endlocal
