import { useState, useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'

const DEFAULT_CODE = `# Mathorama Python Console
# Write your Python code here and press Run

import math

def factorial(n):
    """Calculate factorial of n"""
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print("Hello from Mathorama!")
print(f"Factorial of 5 = {factorial(5)}")
print(f"Pi = {math.pi:.10f}")
`

interface CodeEditorProps {
  onRun?: (code: string) => void
  onCodeChange?: (code: string) => void
}

export default function CodeEditor({ onRun, onCodeChange }: CodeEditorProps): JSX.Element {
  const [code, setCode] = useState(DEFAULT_CODE)
  const [isRunning, setIsRunning] = useState(false)

  const handleChange = useCallback(
    (value: string) => {
      setCode(value)
      onCodeChange?.(value)
    },
    [onCodeChange]
  )

  const handleRun = useCallback(async () => {
    if (!code.trim() || isRunning) return

    setIsRunning(true)
    try {
      onRun?.(code)
    } finally {
      setIsRunning(false)
    }
  }, [code, isRunning, onRun])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex h-7 flex-shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900/50 px-3">
        <span className="text-[10px] text-gray-600">Python</span>
        <button
          onClick={handleRun}
          disabled={isRunning || !code.trim()}
          className="rounded bg-green-700 px-3 py-0.5 text-[10px] font-medium text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          {isRunning ? 'Running...' : '▶ Run'}
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={code}
          onChange={handleChange}
          extensions={[python(), oneDark]}
          theme="dark"
          height="100%"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            searchKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true
          }}
        />
      </div>
    </div>
  )
}
