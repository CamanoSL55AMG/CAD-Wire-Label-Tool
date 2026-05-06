@echo off
set PROJECT_NAME=CAD-Wire-Label-Tool
set BACKUP_ROOT=C:\Users\art\Backups
set TIMESTAMP=%DATE:~10,4%-%DATE:~4,2%-%DATE:~7,2%
set DEST=%BACKUP_ROOT%\%PROJECT_NAME%_%TIMESTAMP%

echo Backing up %PROJECT_NAME% to %DEST%...
robocopy "%~dp0." "%DEST%" /E /XD node_modules .git dist build __pycache__ .next /XF *.log
echo.
echo Backup complete: %DEST%
pause
