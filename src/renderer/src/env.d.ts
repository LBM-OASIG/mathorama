/// <reference types="vite/client" />

interface MathoramaAPI {
  llm: {
    chat: (params: {
      provider: string
      model: string
      messages: Array<{ role: string; content: string }>
      stream?: boolean
    }) => Promise<{ content?: string; tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }> }>
    chatWithTools: (params: {
      provider: string
      model: string
      messages: Array<{ role: string; content: string }>
      tools?: Array<{
        name: string
        description: string
        input_schema: Record<string, unknown>
        openai_tool: { type: string; function: { name: string; description: string; parameters: Record<string, unknown> } }
      }>
    }) => Promise<{ content?: string; tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }> }>
    listModels: (provider: string) => Promise<string[]>
  }
  python: {
    execute: (code: string) => Promise<{ stdout: string; stderr: string; exitCode: number; error?: string }>
    executeTool: (toolName: string, args: Record<string, unknown>) => Promise<{ success: boolean; result?: string; error?: string }>
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
  agent: {
    run: (params: {
      provider: string
      model: string
      messages: Array<{ role: string; content: string }>
    }) => Promise<{ content: string; trace: Array<{ tool: string; args: Record<string, unknown>; result: string }> }>
  }
  onStreamToken: (callback: (token: string) => void) => () => void
  conversations: {
    loadAll: () => Promise<unknown[]>
    saveAll: (conversations: unknown[]) => Promise<void>
  }
}

declare global {
  interface Window {
    mathorama: MathoramaAPI
  }
}
