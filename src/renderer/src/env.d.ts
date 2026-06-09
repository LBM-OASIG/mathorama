/// <reference types="vite/client" />

interface MathoramaAPI {
  llm: {
    chat: (params: {
      provider: string
      model: string
      messages: Array<{ role: string; content: string }>
      stream?: boolean
    }) => Promise<{ content: string }>
    listModels: (provider: string) => Promise<string[]>
  }
  python: {
    execute: (code: string) => Promise<{ stdout: string; stderr: string; exitCode: number; error?: string }>
    installPackages: (packages: string[]) => Promise<{ success: boolean; message: string }>
  }
  config: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<void>
    getAll: () => Promise<Record<string, unknown>>
  }
  provider: {
    set: (name: string, config: { apiKey: string; baseUrl?: string }) => Promise<void>
    remove: (name: string) => Promise<void>
  }
}

declare global {
  interface Window {
    mathorama: MathoramaAPI
  }
}
