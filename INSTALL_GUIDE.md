# CAD Wire Label Tool - Installation Guide

## ⚡ Quick Install (Recommended)

**Just double-click:** `INSTALL.bat`

That's it! The installer will:
1. ✅ Check if Node.js is installed
2. ✅ Install backend dependencies
3. ✅ Install frontend dependencies  
4. ✅ Create desktop shortcut
5. ✅ Configure everything automatically

**Installation takes:** 2-5 minutes (depending on internet speed)

---

## 🚀 After Installation

**To start the app:**
1. Double-click the **"CAD Wire Label Tool"** icon on your desktop
2. Wait for browser to open automatically
3. Start converting CAD files!

**To stop the app:**
- Close both terminal windows

---

## ❓ Troubleshooting

### "Node.js is NOT installed"
1. Download from: https://nodejs.org/
2. Install Node.js (LTS version recommended)
3. Run `INSTALL.bat` again

### Installation fails or hangs
1. Check your internet connection
2. Open Command Prompt and run:
   ```cmd
   cd C:\Users\art\.gemini\antigravity\playground\phantom-oort\CAD-Wire-Label-Tool
   INSTALL.bat
   ```

### Desktop shortcut doesn't appear
- Manually create shortcut to `start-cad-tool.bat`
- Place it on your desktop

### App won't start
1. Make sure both terminal windows opened
2. Check if ports 3000 and 5000 are free
3. Close any other Node.js processes

---

## 📁 What Gets Installed

- **Backend packages:** Express, Multer, ExcelJS, PDF parser, CSV parsers
- **Frontend packages:** React, TypeScript, Material-UI, Axios
- **Desktop shortcut:** Quick launcher
- **Total size:** ~300-500 MB (including node_modules)

---

## 🔧 Manual Installation (Advanced)

If automatic install doesn't work:

**Step 1: Backend**
```cmd
cd backend
npm install
```

**Step 2: Frontend**
```cmd
cd frontend
npm install  
```

**Step 3: Desktop Shortcut**
- Right-click `create-desktop-shortcut.ps1` → Run with PowerShell

---

## 💻 System Requirements

- **OS:** Windows 10/11
- **Node.js:** Version 14+ (LTS recommended)
- **RAM:** 4GB minimum
- **Disk Space:** 1GB free space
- **Ports:** 3000 and 5000 must be available

---

## 🎯 First Time Use

After installation:
1. Double-click desktop icon
2. Upload a test CAD file (CSV, Excel, or PDF)
3. Click "Convert File"
4. Download the Brady M611 label file

**Supported formats:**
- CSV wire data
- Excel (XLS/XLSX)
- PDF with wire tables
- R2b_AotW format
- SnoCoTV format
- City of Bothell files

---

## 🆘 Need Help?

If you encounter issues:
1. Check this guide first
2. Verify Node.js is installed: `node --version`
3. Make sure you ran `INSTALL.bat` successfully
4. Try manual installation steps above
