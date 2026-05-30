'use client'

import { Card, CardTitle } from '@/components/ui/Card'

export function SpeakingHighlightsCard({
  strengths,
  improvements,
}: {
  strengths: string[]
  improvements: string[]
}) {
  return (
    <div className="grid gap-3">
      <Card variant="outlined" padding="md" className="border-slate-200 border-l-4 border-l-emerald-500/80">
        <CardTitle className="text-body font-semibold text-ink-primary">Wat ging goed</CardTitle>
        <ul className="mt-2 list-disc pl-5 space-y-1.5 text-body-sm text-ink-secondary leading-relaxed">
          {strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Card>
      <Card variant="outlined" padding="md" className="border-slate-200 border-l-4 border-l-amber-500/70">
        <CardTitle className="text-body font-semibold text-ink-primary">Waar nog winst</CardTitle>
        <ul className="mt-2 list-disc pl-5 space-y-1.5 text-body-sm text-ink-secondary leading-relaxed">
          {improvements.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
