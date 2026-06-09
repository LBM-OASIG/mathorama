import type { ToolTrace } from '../types'

interface ToolTraceViewerProps {
  traces: ToolTrace[]
}

export default function ToolTraceViewer({ traces }: ToolTraceViewerProps): JSX.Element {
  if (traces.length === 0) {
    return (
      <div className="py-6 text-center font-mono text-[11px] text-ink-faint italic">
        No tool calls in the last response.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {traces.map((t, i) => (
        <details key={i} className="group rounded-sm border border-border bg-surface overflow-hidden">
          <summary className="flex cursor-pointer items-center gap-2.5 px-4 py-2.5 font-mono text-[11px] text-accent hover:bg-paper-warm transition-colors select-none list-none">
            <svg
              className="h-3 w-3 flex-shrink-0 text-ink-faint transition-transform duration-200 group-open:rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium">{t.tool}</span>
            <span className="text-ink-faint">—</span>
            <span className="truncate text-ink-faint">{JSON.stringify(t.args).slice(0, 60)}...</span>
          </summary>
          <div className="border-t border-border px-4 py-3 space-y-3">
            {/* Arguments */}
            <div>
              <div className="mb-1 font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-ink-faint">
                Arguments
              </div>
              <pre className="overflow-x-auto rounded-sm bg-paper-warm border border-border p-3 font-mono text-[11px] text-ink-soft leading-relaxed">
                {JSON.stringify(t.args, null, 2)}
              </pre>
            </div>

            {/* Result */}
            <div>
              <div className="mb-1 font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-ink-faint">
                Result
              </div>
              <div className="overflow-x-auto rounded-sm bg-paper-warm border border-border p-3 font-mono text-[11px] text-ink-soft leading-relaxed">
                {t.result.startsWith('data:image') ? (
                  <img src={t.result} alt="Plot" className="max-w-xs rounded-sm border border-border" />
                ) : (
                  <pre className="whitespace-pre-wrap break-words">{t.result}</pre>
                )}
              </div>
            </div>
          </div>
        </details>
      ))}
    </div>
  )
}
