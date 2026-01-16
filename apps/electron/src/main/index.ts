import { join } from 'node:path'
import { BrowserWindow, app, session, shell } from 'electron'

const API_URL = process.env.VITE_API_URL ?? 'http://localhost:8787'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  // Intercept requests to add Origin header for auth requests (file:// has no origin)
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: [`${API_URL}/*`] },
    (details, callback) => {
      if (!details.requestHeaders.Origin) {
        details.requestHeaders.Origin = 'http://localhost:5173'
      }
      callback({ requestHeaders: details.requestHeaders })
    }
  )

  // Fix cookie handling for cross-origin requests from file://
  // Set cookies to be accessible from file:// protocol
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: [`${API_URL}/*`] },
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
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(() => {
  createWindow()

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
