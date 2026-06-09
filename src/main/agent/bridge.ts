import { ipcMain } from 'electron'
import { runAgent } from './loop'
import type { AgentConfig } from './types'

export function registerAgentHandlers(): void {
  ipcMain.handle('agent:run', async (event, params: {
    agent: AgentConfig
    messages: Array<{ role: string; content: string }>
    convId: string  // Conversation ID — included in stream events so renderer can filter
  }) => {
    try {
      const result = await runAgent({
        agent: params.agent,
        messages: params.messages,
        onToken: (token: string) => {
          event.sender.send('agent:stream-token', { convId: params.convId, token })
        },
        onReasoningToken: (token: string) => {
          event.sender.send('agent:stream-token', { convId: params.convId, reasoningToken: token })
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
