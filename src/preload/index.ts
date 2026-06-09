import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // LLM
  llm: {
    chat: (params: { provider: string; model: string; messages: Array<{ role: string; content: string }>; stream?: boolean }) =>
      ipcRenderer.invoke('llm:chat', params),
    listModels: (provider: string) =>
      ipcRenderer.invoke('llm:listModels', provider)
  },
  // Python
  python: {
    execute: (code: string) =>
      ipcRenderer.invoke('python:execute', code),
    installPackages: (packages: string[]) =>
      ipcRenderer.invoke('python:installPackages', packages)
  },
  // Config
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value),
    getAll: () => ipcRenderer.invoke('config:getAll')
  },
  // Provider management
  provider: {
    set: (name: string, config: { apiKey: string; baseUrl?: string }) =>
      ipcRenderer.invoke('config:setProvider', name, config),
    remove: (name: string) =>
      ipcRenderer.invoke('config:removeProvider', name)
  }
}

contextBridge.exposeInMainWorld('mathorama', api)

export type MathoramaAPI = typeof api
