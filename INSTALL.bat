@echo off
SETLOCAL EnableDelayedExpansion

echo =========================================================
echo    CAD Wire Label Tool - ONE-CLICK INSTALLER
echo =========================================================
echo.

REM Get the directory where this script is located
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo [1/5] Checking prerequisites...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is NOT installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo After installing Node.js, run this installer again.
    echo.
    pause
    exit /b 1
)

REM Get Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js detected: %NODE_VERSION%
echo.

echo [2/5] Installing Backend Dependencies...
echo This may take a few minutes...
echo.
cd backend
call npm install --legacy-peer-deps
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Backend installation failed!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)
cd ..
echo Backend dependencies installed successfully!
echo.

echo [3/5] Installing Frontend Dependencies...
echo This may take a few minutes...
echo.
cd frontend
call npm install --legacy-peer-deps
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Frontend installation failed!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)
cd ..
echo Frontend dependencies installed successfully!
echo.

echo [4/5] Creating Desktop Shortcut...
echo.

REM Create desktop shortcut using PowerShell
powershell -ExecutionPolicy Bypass -Command "$Desktop = [Environment]::GetFolderPath('Desktop'); $WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut(\"$Desktop\CAD Wire Label Tool.lnk\"); $Shortcut.TargetPath = '%PROJECT_DIR%start-cad-tool.bat'; $Shortcut.WorkingDirectory = '%PROJECT_DIR%'; $Shortcut.Description = 'CAD Wire Label Tool'; $Shortcut.IconLocation = 'shell32.dll,165'; $Shortcut.Save()"

if %ERRORLEVEL% EQU 0 (
    echo Desktop shortcut created successfully!
) else (
    echo Warning: Could not create desktop shortcut automatically.
    echo You can manually create a shortcut to: start-cad-tool.bat
)
echo.

echo [5/5] Installation Complete!
echo.

echo =========================================================
echo    INSTALLATION SUCCESSFUL!
echo =========================================================
echo.
echo What was installed:
echo   - Backend dependencies (Node.js packages)
echo   - Frontend dependencies (React app packages)
echo   - Desktop shortcut: "CAD Wire Label Tool"
echo.
echo How to use:
echo   1. Double-click "CAD Wire Label Tool" icon on desktop
echo   2. Two terminal windows will open automatically
echo   3. Browser opens to http://localhost:3000
echo   4. Upload CAD files and convert to Brady labels!
echo.
echo To stop the application:
echo   - Close both terminal windows
echo.
echo =========================================================
echo.
echo Window will close automatically in 5 seconds...
timeout /t 5 /nobreak >nul
