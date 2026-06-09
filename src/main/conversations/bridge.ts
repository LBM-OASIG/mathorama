import { ipcMain } from 'electron'
import { readConversations, writeConversations } from './manager'

export function registerConversationHandlers(): void {
  ipcMain.handle('conversations:loadAll', () => {
    return readConversations()
  })

  ipcMain.handle('conversations:saveAll', (_event, conversations: Record<string, unknown>[]) => {
    writeConversations(conversations)
  })
}
