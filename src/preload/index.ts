import { contextBridge, ipcRenderer } from 'electron'

const api = {
  llm: {
    chat: (params: { provider: string; model: string; messages: Array<{ role: string; content: string }>; stream?: boolean }) =>
      ipcRenderer.invoke('llm:chat', params),
    chatWithTools: (params: { provider: string; model: string; messages: Array<{ role: string; content: string }>; tools?: Array<{ name: string; description: string; input_schema: Record<string, unknown>; openai_tool: { type: string; function: { name: string; description: string; parameters: Record<string, unknown> } } }> }) =>
      ipcRenderer.invoke('llm:chatWithTools', params),
    listModels: (provider: string) =>
      ipcRenderer.invoke('llm:listModels', provider)
  },
  python: {
    execute: (code: string) =>
      ipcRenderer.invoke('python:execute', code),
    executeTool: (toolName: string, args: Record<string, unknown>) =>
      ipcRenderer.invoke('python:executeTool', toolName, args),
    installPackages: (packages: string[]) =>
      ipcRenderer.invoke('python:installPackages', packages)
  },
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value),
    getAll: () => ipcRenderer.invoke('config:getAll')
  },
  provider: {
    set: (name: string, config: { apiKey: string; baseUrl?: string }) =>
      ipcRenderer.invoke('config:setProvider', name, config),
    remove: (name: string) =>
      ipcRenderer.invoke('config:removeProvider', name)
  },
  agent: {
    run: (params: { agent: { name: string; provider: string; model: string; system_prompt: string; params: Record<string, unknown>; tools: string[] }; messages: Array<{ role: string; content: string }> }) =>
      ipcRenderer.invoke('agent:run', params),
    list: () => ipcRenderer.invoke('agent:list'),
    save: (agents: unknown[]) => ipcRenderer.invoke('agent:save', agents)
  },
  onStreamToken: (callback: (token: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, token: string) => callback(token)
    ipcRenderer.on('agent:stream-token', handler)
    return () => ipcRenderer.removeListener('agent:stream-token', handler)
  },
  conversations: {
    loadAll: () => ipcRenderer.invoke('conversations:loadAll'),
    saveAll: (conversations: unknown[]) => ipcRenderer.invoke('conversations:saveAll', conversations)
  }
}

contextBridge.exposeInMainWorld('mathorama', api)

export type MathoramaAPI = typeof api
