@echo off
echo ========================================
echo Installing CAD Wire Label Tool Dependencies
echo ========================================
echo.

cd /d "%~dp0"

echo Installing Backend Dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Backend installation failed!
    pause
    exit /b 1
)

echo.
echo Installing Frontend Dependencies...
cd ../frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend installation failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo You can now run the application by double-clicking
echo the "CAD Wire Label Tool" icon on your desktop.
echo.
pause
