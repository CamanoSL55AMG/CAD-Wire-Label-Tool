@echo off
echo ========================================
echo CAD Wire Label Tool - Starting...
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Get the directory where this script is located
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo Starting Backend Server...
start "CAD Wire Backend" cmd /c "cd backend && npm start"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo Starting Frontend Application...
start "CAD Wire Frontend" cmd /c "cd frontend && set BROWSER=none && npm start"

echo.
echo ========================================
echo CAD Wire Label Tool is starting!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Browser will open automatically in a few seconds...
echo Close this window to STOP both servers.
echo.

REM Wait for servers to be ready then open browser
timeout /t 10 /nobreak >nul
start http://localhost:3000

echo.
echo Press any key to shut down both servers...
pause >nul

REM Kill both servers on close
echo Shutting down servers...
taskkill /F /FI "WINDOWTITLE eq CAD Wire Backend" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq CAD Wire Frontend" >nul 2>&1
taskkill /F /IM node.exe /FI "MEMUSAGE gt 1" >nul 2>&1
echo Done. Goodbye!
timeout /t 2 /nobreak >nul
exit
