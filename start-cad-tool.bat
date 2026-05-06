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
start "CAD Wire Backend" cmd /k "cd backend && npm start"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo Starting Frontend Application...
start "CAD Wire Frontend" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo CAD Wire Label Tool is starting!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo The browser will open automatically in a few seconds...
echo.
echo To stop the application:
echo - Close both terminal windows
echo   OR
echo - Press Ctrl+C in each terminal window
echo.

REM Wait a bit then open browser
timeout /t 10 /nobreak >nul
start http://localhost:3000

exit
