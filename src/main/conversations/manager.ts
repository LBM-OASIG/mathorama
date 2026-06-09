import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

const CONVERSATIONS_PATH = path.join(app.getPath('userData'), 'conversations.json')

export function readConversations(): Record<string, unknown>[] {
  try {
    if (fs.existsSync(CONVERSATIONS_PATH)) {
      return JSON.parse(fs.readFileSync(CONVERSATIONS_PATH, 'utf-8'))
    }
  } catch { /* ignore corrupt files */ }
  return []
}

export function writeConversations(conversations: Record<string, unknown>[]): void {
  const dir = path.dirname(CONVERSATIONS_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(CONVERSATIONS_PATH, JSON.stringify(conversations, null, 2), 'utf-8')
}
