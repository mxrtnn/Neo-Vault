import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // Crear la ventana principal de NEO-VAULT
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    center: true,
    show: false,
    autoHideMenuBar: true,

    ...(process.platform === 'linux' ? { icon } : {}),

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const notifyFullscreen = (): void =>
    mainWindow.webContents.send('window:fullscreen-changed', mainWindow.isFullScreen())
  mainWindow.on('enter-full-screen', notifyFullscreen)
  mainWindow.on('leave-full-screen', notifyFullscreen)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && !input.isAutoRepeat && input.key === 'F11') {
      event.preventDefault()
      mainWindow.setFullScreen(!mainWindow.isFullScreen())
    }
    if (input.type === 'keyDown' && input.key === 'Escape' && mainWindow.isFullScreen()) {
      event.preventDefault()
      mainWindow.setFullScreen(false)
    }
  })

  // Mostrar la ventana cuando esté lista
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Abrir enlaces externos en el navegador predeterminado
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Cargar React mediante Vite en desarrollo
  // y los archivos compilados en producción
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Inicialización de Electron
app.whenReady().then(() => {
  // Identificador de la aplicación
  electronApp.setAppUserModelId('com.electron')

  // Atajos de teclado durante el desarrollo
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle(
    'window:get-fullscreen',
    (event) => BrowserWindow.fromWebContents(event.sender)?.isFullScreen() ?? false
  )
  ipcMain.handle('window:set-fullscreen', (event, fullscreen: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window || typeof fullscreen !== 'boolean') return false
    window.setFullScreen(fullscreen)
    return window.isFullScreen()
  })

  // Comunicación IPC de prueba
  ipcMain.on('ping', () => console.log('pong'))

  // Crear la ventana principal
  createWindow()

  // Recrear la ventana en macOS cuando sea necesario
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Cerrar la aplicación cuando no queden ventanas abiertas
// excepto en macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
