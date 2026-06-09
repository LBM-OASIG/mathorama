import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerLLMHandlers, initializeDefaultProviders } from './llm/bridge'
import { registerPythonHandlers } from './python/bridge'
import { registerConfigHandlers } from './config/manager'
import { registerAgentHandlers } from './agent/bridge'
import { registerAgentManagerHandlers } from './agent/manager'
import { registerConversationHandlers } from './conversations/bridge'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerLLMHandlers()
  registerPythonHandlers()
  registerConfigHandlers()
  registerAgentHandlers()
  registerAgentManagerHandlers()
  registerConversationHandlers()
  initializeDefaultProviders()
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
