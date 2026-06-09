import { ipcMain } from 'electron'
import { spawn } from 'child_process'

function getPythonPath(): string {
  return 'python'
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
