import { useState } from 'react'

interface OutputData {
  stdout: string
  stderr: string
  error?: string
  images?: string[] // Base64 or URL images
  timestamp: number
}

const INITIAL_OUTPUT: OutputData = {
  stdout: '',
  stderr: '',
  timestamp: Date.now()
}

export default function OutputPanel(): JSX.Element {
  const [outputs, setOutputs] = useState<OutputData[]>([INITIAL_OUTPUT])
  const [activeTab, setActiveTab] = useState<'stdout' | 'stderr' | 'images'>('stdout')

  // Listen for Python execution results from the preload API
  // This is a placeholder – actual wiring depends on how code execution is triggered
  const currentOutput = outputs[outputs.length - 1]

  const clearOutput = (): void => {
    setOutputs([{ ...INITIAL_OUTPUT, timestamp: Date.now() }])
  }

  const hasStdout = currentOutput.stdout.length > 0
  const hasStderr = currentOutput.stderr.length > 0 || currentOutput.error
  const hasImages = (currentOutput.images?.length || 0) > 0

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-950">
      {/* Tab bar */}
      <div className="flex h-7 flex-shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900/50 px-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('stdout')}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              activeTab === 'stdout'
                ? 'bg-gray-700 text-green-400'
                : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
            }`}
          >
            stdout{hasStdout ? ` (${currentOutput.stdout.split('\n').filter(Boolean).length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('stderr')}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              activeTab === 'stderr'
                ? 'bg-gray-700 text-red-400'
                : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
            }`}
          >
            stderr{hasStderr ? ' ·' : ''}
          </button>
          {hasImages && (
            <button
              onClick={() => setActiveTab('images')}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                activeTab === 'images'
                  ? 'bg-gray-700 text-yellow-400'
                  : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              images ({currentOutput.images?.length || 0})
            </button>
          )}
        </div>
        <button
          onClick={clearOutput}
          className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
          title="Clear output"
        >
          Clear
        </button>
      </div>

      {/* Output content */}
      <div className="flex-1 overflow-auto p-3 font-mono text-xs">
        {activeTab === 'stdout' && (
          <div>
            {hasStdout ? (
              <pre className="whitespace-pre-wrap break-all text-green-400">{currentOutput.stdout}</pre>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-600">
                <p>No output yet. Run some code to see results.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stderr' && (
          <div>
            {hasStderr ? (
              <div>
                {currentOutput.error && (
                  <pre className="whitespace-pre-wrap break-all text-red-500 font-bold mb-2">
                    Error: {currentOutput.error}
                  </pre>
                )}
                {currentOutput.stderr && (
                  <pre className="whitespace-pre-wrap break-all text-red-400">{currentOutput.stderr}</pre>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-600">
                <p>No errors.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'images' && (
          <div>
            {(currentOutput.images?.length || 0) > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {currentOutput.images?.map((imgSrc, i) => (
                  <img
                    key={i}
                    src={imgSrc}
                    alt={`Output ${i + 1}`}
                    className="max-w-full rounded border border-gray-800"
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-600">
                <p>No images to display.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
