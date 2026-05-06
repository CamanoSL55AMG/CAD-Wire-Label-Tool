const { app, BrowserWindow, dialog, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')

let mainWindow
let backendProcess

// ─── Start the embedded backend server ───────────────────────────────────────

function startBackend() {
  const serverPath = path.join(__dirname, '..', 'backend', 'server.js')
  const nodeExe = process.execPath // bundled Node inside Electron

  backendProcess = spawn(nodeExe, [serverPath], {
    env: {
      ...process.env,
      PORT: '5000',
      UPLOADS_DIR: path.join(app.getPath('userData'), 'uploads'),
      DOWNLOADS_DIR: path.join(app.getPath('userData'), 'downloads'),
    },
    stdio: 'pipe',
  })

  backendProcess.stdout.on('data', (data) => console.log('[backend]', data.toString()))
  backendProcess.stderr.on('data', (data) => console.error('[backend]', data.toString()))

  backendProcess.on('exit', (code) => {
    console.log('[backend] exited with code', code)
  })
}

// ─── Wait for backend to be ready ────────────────────────────────────────────

function waitForBackend(retries = 20) {
  return new Promise((resolve, reject) => {
    const check = (remaining) => {
      http.get('http://localhost:5000/api/health', (res) => {
        if (res.statusCode === 200) resolve()
        else retry(remaining)
      }).on('error', () => retry(remaining))
    }
    const retry = (remaining) => {
      if (remaining <= 0) return reject(new Error('Backend did not start in time'))
      setTimeout(() => check(remaining - 1), 500)
    }
    check(retries)
  })
}

// ─── Create the main app window ──────────────────────────────────────────────

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'CAD Wire Label Tool',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false, // Show after load to avoid white flash
  })

  // Open external links in the default browser, not in Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const isDev = !app.isPackaged

  if (isDev) {
    // In dev mode load the React dev server
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    // In production load the built React static files
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  startBackend()

  try {
    await waitForBackend()
  } catch {
    dialog.showErrorBox(
      'Backend failed to start',
      'The backend server could not be started. Please try restarting the application.'
    )
    app.quit()
    return
  }

  await createWindow()
})

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
})
