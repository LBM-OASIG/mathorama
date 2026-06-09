import { ipcMain } from 'electron'
import { runAgent } from './loop'

export function registerAgentHandlers(): void {
  ipcMain.handle('agent:run', async (_event, params: {
    provider: string
    model: string
    messages: Array<{ role: string; content: string }>
  }) => {
    try {
      const result = await runAgent(params)
      return result
    } catch (error) {
      return {
        content: `Agent error: ${error instanceof Error ? error.message : String(error)}`,
        trace: []
      }
    }
  })
}
