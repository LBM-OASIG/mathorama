import { ipcMain } from 'electron'
import { runAgent } from './loop'

export function registerAgentHandlers(): void {
  ipcMain.handle('agent:run', async (event, params: {
    provider: string
    model: string
    messages: Array<{ role: string; content: string }>
  }) => {
    try {
      const result = await runAgent({
        ...params,
        onToken: (token: string) => {
          event.sender.send('agent:stream-token', token)
        }
      })
      return result
    } catch (error) {
      return {
        content: `Agent error: ${error instanceof Error ? error.message : String(error)}`,
        trace: []
      }
    }
  })
}
