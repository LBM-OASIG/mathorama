import { ipcMain, app } from 'electron'
import { spawn } from 'child_process'
import { join } from 'path'
import { readConfig } from '../config/manager'

function getPythonPath(): string {
  const config = readConfig()
  if (config && typeof config === 'object' && 'pythonPath' in config) {
    const path = (config as Record<string, unknown>).pythonPath
    if (typeof path === 'string' && path.trim().length > 0) {
      return path.trim()
    }
  }
  return 'python'
}

function getEnginePath(): string {
  return join(app.getAppPath(), 'src', 'main', 'python', 'math_engine.py')
}

export async function executeTool(toolName: string, args: Record<string, unknown>): Promise<{ success: boolean; result?: string; error?: string }> {
  return new Promise((resolve) => {
    const argsJson = JSON.stringify(args)
    const python = spawn(getPythonPath(), [
      getEnginePath(),
      '--tool', toolName,
      '--args', argsJson
    ])
    let stdout = ''
    let stderr = ''

    python.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    python.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    python.on('close', (code: number) => {
      try {
        const parsed = JSON.parse(stdout.trim())
        if (parsed.success) {
          resolve({ success: true, result: parsed.result })
        } else {
          resolve({ success: false, error: parsed.error ?? stderr.trim() })
        }
      } catch {
        resolve({ success: false, error: stderr.trim() || `Failed to parse output: ${stdout.trim()}` })
      }
    })

    python.on('error', (err: Error) => {
      resolve({ success: false, error: err.message })
    })
  })
}

export function registerPythonHandlers(): void {
  ipcMain.handle('python:execute', async (_event, code: string) => {
    return new Promise((resolve) => {
      const python = spawn(getPythonPath(), ['-c', code])
      let stdout = ''
      let stderr = ''

      python.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      python.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      python.on('close', (code: number) => {
        resolve({ stdout, stderr, exitCode: code })
      })

      python.on('error', (err: Error) => {
        resolve({ stdout: '', stderr: err.message, exitCode: -1, error: err.message })
      })
    })
  })

  ipcMain.handle('python:executeTool', async (_event, toolName: string, args: Record<string, unknown>) => {
    return executeTool(toolName, args)
  })

  ipcMain.handle('python:installPackages', async (_event, packages: string[]) => {
    return new Promise((resolve) => {
      const pip = spawn(getPythonPath(), ['-m', 'pip', 'install', ...packages])
      let stdout = ''
      let stderr = ''

      pip.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      pip.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      pip.on('close', (code: number) => {
        resolve({ success: code === 0, message: stdout + stderr })
      })

      pip.on('error', (err: Error) => {
        resolve({ success: false, message: err.message })
      })
    })
  })
}
