@echo off
echo === CAD Wire Converter - Current Version ===
echo Starting the web application (React frontend + Node.js backend)
echo.

REM Kill any existing Node.js processes to free up ports
echo Terminating any existing Node.js processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Create required directories if they don't exist
if not exist backend\downloads mkdir backend\downloads
if not exist backend\uploads mkdir backend\uploads
if not exist temp_uploads mkdir temp_uploads

REM Start the backend server
echo Starting backend server...
start "CAD Wire Converter Backend" cmd /c "cd /d %~dp0backend && npm start"

REM Wait for backend to initialize
echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

REM Start the frontend server
echo Starting frontend server...
start "CAD Wire Converter Frontend" cmd /c "cd /d %~dp0frontend && npm start"

REM Wait for frontend to start
echo Waiting for frontend to start...
timeout /t 10 /nobreak >nul

REM Open browser
echo Opening browser...
start http://localhost:3000

echo.
echo The CAD Wire Converter web application should now be running:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:5000
echo.
echo Press any key to exit this window (the application will continue running)...
pause >nul
