# PowerShell script to create desktop shortcut for CAD Wire Label Tool

# Get the script's directory (project root)
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BatFile = Join-Path $ProjectDir "start-cad-tool.bat"

# Get desktop path
$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "CAD Wire Label Tool.lnk"

# Create WScript Shell object
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)

# Set shortcut properties
$Shortcut.TargetPath = $BatFile
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.Description = "CAD Wire Label Tool - Convert CAD wire data to Brady M611 labels"
$Shortcut.IconLocation = "shell32.dll,165"  # Default document icon

# Save the shortcut
$Shortcut.Save()

Write-Host "========================================" -ForegroundColor Green
Write-Host "Desktop Shortcut Created Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Shortcut Location: $ShortcutPath" -ForegroundColor Cyan
Write-Host "Target: $BatFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now double-click the 'CAD Wire Label Tool' icon on your desktop to start the application!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
