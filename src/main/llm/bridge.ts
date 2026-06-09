import { ipcMain, app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { llmGateway } from './gateway'
import { readConfig, writeConfig } from '../config/manager'
import { ToolDefinition } from '../agent/tools'

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

  ipcMain.handle('llm:chatWithTools', async (_event, params: {
    provider: string
    model: string
    messages: Array<{ role: string; content: string }>
    tools?: ToolDefinition[]
  }) => {
    try {
      const result = await llmGateway.chatWithTools(params.provider, {
        model: params.model,
        messages: params.messages,
        tools: params.tools?.map(t => t.openai_tool)
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
    const cfg = readConfig()
    cfg.providers = { ...(cfg.providers as Record<string, unknown> || {}), [providerName]: { apiKey: config.apiKey, baseUrl: config.baseUrl } }
    writeConfig(cfg)
  })

  ipcMain.handle('config:removeProvider', async (_event, providerName: string) => {
    llmGateway.removeProvider(providerName)
    const cfg = readConfig()
    const providers = cfg.providers as Record<string, unknown> | undefined
    if (providers) {
      delete providers[providerName]
      cfg.providers = providers
      writeConfig(cfg)
    }
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
