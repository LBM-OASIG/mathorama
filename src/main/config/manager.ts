import { ipcMain, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json')

function readConfig(): Record<string, unknown> {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    }
  } catch {
  }
  return {}
}

function writeConfig(config: Record<string, unknown>): void {
  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export function registerConfigHandlers(): void {
  ipcMain.handle('config:get', (_event, key: string) => {
    const config = readConfig()
    return config[key] ?? null
  })

  ipcMain.handle('config:set', (_event, key: string, value: unknown) => {
    const config = readConfig()
    config[key] = value
    writeConfig(config)
  })

  ipcMain.handle('config:getAll', () => {
    return readConfig()
  })
}
