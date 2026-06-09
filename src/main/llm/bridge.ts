import { ipcMain, app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { llmGateway } from './gateway'

export function registerLLMHandlers(): void {
  ipcMain.handle('llm:chat', async (_event, params: { provider: string; model: string; messages: Array<{ role: string; content: string }> }) => {
    try {
      const result = await llmGateway.chat(params.provider, {
        model: params.model,
        messages: params.messages
      })
      return result
    } catch (error) {
      return { content: `Error: ${error instanceof Error ? error.message : String(error)}` }
    }
  })

  ipcMain.handle('llm:listModels', async (_event, provider: string) => {
    try {
      return await llmGateway.listModels(provider)
    } catch (error) {
      return []
    }
  })

  ipcMain.handle('config:setProvider', async (_event, providerName: string, config: { apiKey: string; baseUrl?: string }) => {
    llmGateway.setProvider(providerName, config)
  })

  ipcMain.handle('config:removeProvider', async (_event, providerName: string) => {
    llmGateway.removeProvider(providerName)
  })
}

export function initializeDefaultProviders(): void {
  try {
    const configPath = join(app.getPath('userData'), 'config.json')
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'))
      const providers = config.providers as Record<string, { apiKey: string; baseUrl?: string }> | undefined
      if (providers) {
        for (const [name, providerConfig] of Object.entries(providers)) {
          llmGateway.setProvider(name, providerConfig)
        }
      }
    }
  } catch {
    // Silent fail - user can configure providers via the UI
  }
}
