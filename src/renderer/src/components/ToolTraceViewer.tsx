import type { ToolTrace } from '../types'

interface ToolTraceViewerProps {
  traces: ToolTrace[]
}

export default function ToolTraceViewer({ traces }: ToolTraceViewerProps): JSX.Element {
  if (traces.length === 0) {
    return <div className="text-xs text-gray-600">No tool calls in the last response.</div>
  }

  return (
    <div className="space-y-2">
      {traces.map((t, i) => (
        <details key={i} open className="rounded border border-gray-700 bg-gray-950">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-blue-400 hover:bg-gray-800">
            {i + 1}. {t.tool}
          </summary>
          <div className="border-t border-gray-800 p-3">
            <div className="mb-1 text-[10px] font-medium text-gray-500 uppercase">Arguments</div>
            <pre className="mb-2 overflow-x-auto rounded bg-gray-950 p-2 text-xs text-gray-300">
              {JSON.stringify(t.args, null, 2)}
            </pre>
            <div className="mb-1 text-[10px] font-medium text-gray-500 uppercase">Result</div>
            <pre className="overflow-x-auto rounded bg-gray-950 p-2 text-xs text-gray-300">
              {t.result.startsWith('data:image') ? (
                <img src={t.result} alt="Plot" className="max-w-xs rounded" />
              ) : (
                t.result
              )}
            </pre>
          </div>
        </details>
      ))}
    </div>
  )
}
