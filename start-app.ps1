# CAD Wire Converter - Startup Script
# This PowerShell script starts both the backend and frontend servers

Write-Host "=== CAD Wire Converter - Starting Application ===" -ForegroundColor Cyan
Write-Host ""

# Kill any existing Node.js processes
Write-Host "Stopping any running Node.js processes..." -ForegroundColor Yellow
Stop-Process -Name "node" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Function to start a process in a new window
function Start-ProcessInNewWindow {
    param (
        [string]$WorkingDirectory,
        [string]$Command,
        [string]$Title
    )
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkingDirectory'; Write-Host '=== $Title ==='; $Command" -WindowStyle Normal
}

# Start the backend server
Write-Host "Starting backend server..." -ForegroundColor Green
Start-ProcessInNewWindow -WorkingDirectory "C:\Users\art\CascadeProjects\cad-wire-converter\backend" -Command "npm start" -Title "CAD Wire Converter - Backend Server"

# Wait for backend to initialize
Write-Host "Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start the frontend server
Write-Host "Starting frontend server..." -ForegroundColor Green
Start-ProcessInNewWindow -WorkingDirectory "C:\Users\art\CascadeProjects\cad-wire-converter\frontend" -Command "npm start" -Title "CAD Wire Converter - Frontend Server"

# Wait for frontend to start
Write-Host "Waiting for frontend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Open browser
Write-Host "Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "The CAD Wire Converter web application should now be running:" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "- Backend API: http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "You can close this window. The application will continue running in the other windows." -ForegroundColor Gray
