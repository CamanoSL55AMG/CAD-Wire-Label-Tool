# Desktop Launcher - Quick Start Guide

## ✅ Setup Complete!

A desktop shortcut has been created: **"CAD Wire Label Tool"**

## How to Use

### Starting the Application

1. **Double-click** the "CAD Wire Label Tool" icon on your desktop
2. Two terminal windows will open:
   - **CAD Wire Backend** - Backend server (port 5000)
   - **CAD Wire Frontend** - Frontend server (port 3000)
3. Your browser will automatically open to http://localhost:3000
4. Wait a few seconds for both servers to start

### Stopping the Application

Choose one of these methods:
- **Method 1:** Close both terminal windows
- **Method 2:** Press `Ctrl+C` in each terminal window

## Troubleshooting

### If the shortcut doesn't work:

1. **Check Node.js is installed:**
   ```
   node --version
   ```
   If not installed, download from https://nodejs.org/

2. **Install dependencies** (first time only):
   ```
   cd C:\Users\art\.gemini\antigravity\playground\phantom-oort\CAD-Wire-Label-Tool
   cd backend
   npm install
   cd ../frontend  
   npm install
   ```

3. **Recreate the shortcut:**
   Right-click `create-desktop-shortcut.ps1` → Run with PowerShell

### If backend fails to start:
- Check if port 5000 is already in use
- Stop any other Node.js processes

### If frontend fails to start:
- Check if port 3000 is already in use
- Try `npm install` in the frontend folder

## Manual Start (Alternative)

If the desktop shortcut doesn't work, you can start manually:

**Terminal 1 (Backend):**
```
cd C:\Users\art\.gemini\antigravity\playground\phantom-oort\CAD-Wire-Label-Tool\backend
npm start
```

**Terminal 2 (Frontend):**
```
cd C:\Users\art\.gemini\antigravity\playground\phantom-oort\CAD-Wire-Label-Tool\frontend
npm start
```

Then open: http://localhost:3000

## Application Features

- Upload CAD wire data (CSV, Excel, or PDF)
- Convert to Brady M611 label printer format
- Download converted files
- Preview data before export

## Files Created

- `start-cad-tool.bat` - Launcher script
- `create-desktop-shortcut.ps1` - Shortcut generator
- Desktop shortcut: `CAD Wire Label Tool.lnk`
