'use client'

export type LocalDutchPhrasingComparisonProps = {
  youSaid: string
  localWouldSay: string
  whyBetter: string
}

/**
 * Side-by-side phrasing: learner line vs local Dutch + rationale (premium recap pattern).
 */
export function LocalDutchPhrasingComparison({ youSaid, localWouldSay, whyBetter }: LocalDutchPhrasingComparisonProps) {
  const rows = [
    { k: 'you', label: 'You said', text: youSaid, tone: 'border-violet-200 bg-violet-50' },
    { k: 'local', label: 'A Dutch speaker would more likely say', text: localWouldSay, tone: 'border-emerald-200 bg-emerald-50' },
    { k: 'why', label: 'Why that sounds more natural here', text: whyBetter, tone: 'border-slate-200 bg-white' },
  ] as const

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-card">
      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary px-3 py-2 bg-slate-100 border-b border-slate-200">
        How close to local Dutch?
      </p>
      <div className="divide-y divide-slate-200">
        {rows.map((row) => (
          <div key={row.k} className={`px-3 py-3 ${row.tone}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary mb-1">{row.label}</p>
            <p className="text-body-sm text-ink-primary leading-relaxed font-medium">{row.text.trim() || '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
