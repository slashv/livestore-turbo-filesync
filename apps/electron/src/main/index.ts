import { join } from 'node:path'
import { BrowserWindow, app, dialog, session, shell } from 'electron'
import { autoUpdater } from 'electron-updater'

// Production API URL
const API_URL = process.env.VITE_API_URL ?? 'https://livestore-app-server.contact-106.workers.dev'

// Use localhost in development
const isDev = process.env.NODE_ENV === 'development'
const effectiveApiUrl = isDev ? 'http://localhost:8787' : API_URL

let mainWindow: BrowserWindow | null = null

// =============================================================================
// Auto-updater configuration
// =============================================================================
function setupAutoUpdater() {
  // Don't check for updates in development
  if (isDev) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version)
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available. Would you like to download it now?`,
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate()
        }
      })
  })

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available')
  })

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${Math.round(progress.percent)}%`)
    mainWindow?.setProgressBar(progress.percent / 100)
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version)
    mainWindow?.setProgressBar(-1) // Remove progress bar
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} has been downloaded. Restart the app to apply the update.`,
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
  })

  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error)
  })

  // Check for updates after app is ready (with a small delay)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(console.error)
  }, 3000)
}

// =============================================================================
// Window creation
// =============================================================================
function createWindow() {
  // Intercept requests to add Origin header for auth requests (file:// has no origin)
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: [`${effectiveApiUrl}/*`] },
    (details, callback) => {
      if (!details.requestHeaders.Origin) {
        details.requestHeaders.Origin = isDev
          ? 'http://localhost:5173'
          : 'https://livestore-todo.pages.dev'
      }
      callback({ requestHeaders: details.requestHeaders })
    }
  )

  // Fix cookie handling for cross-origin requests from file://
  // Set cookies to be accessible from file:// protocol
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: [`${effectiveApiUrl}/*`] },
    (details, callback) => {
      const responseHeaders = { ...details.responseHeaders }

      // Modify Set-Cookie headers to work with file:// protocol
      if (responseHeaders['set-cookie'] || responseHeaders['Set-Cookie']) {
        const cookies = responseHeaders['set-cookie'] || responseHeaders['Set-Cookie']
        if (cookies) {
          const modifiedCookies = cookies.map((cookie: string) => {
            // Remove SameSite=Lax/Strict and add SameSite=None; Secure
            // Also remove Domain restrictions for file:// compatibility
            return `${cookie.replace(/;\s*SameSite=\w+/gi, '').replace(/;\s*Domain=[^;]+/gi, '')}; SameSite=None`
          })
          responseHeaders['Set-Cookie'] = modifiedCookies
          // Remove lowercase version to avoid duplicates (set to empty array instead of delete for performance)
          ;(responseHeaders as Record<string, string[] | undefined>)['set-cookie'] = undefined
        }
      }

      callback({ responseHeaders })
    }
  )

  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 400,
    minHeight: 500,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f5f5f5',
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load the app
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(() => {
  createWindow()
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
