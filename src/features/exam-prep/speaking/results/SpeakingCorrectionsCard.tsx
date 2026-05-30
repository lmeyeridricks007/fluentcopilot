'use client'

import { Card, CardTitle } from '@/components/ui/Card'
import type { SpeakingCorrectionItem } from '@/lib/schemas/exam/speakingCoachOutput.schema'

export function SpeakingCorrectionsCard({ corrections }: { corrections: SpeakingCorrectionItem[] }) {
  if (corrections.length === 0) {
    return (
      <Card variant="outlined" padding="md" className="border-slate-200">
        <CardTitle className="text-body font-semibold text-ink-primary">Gerichte correcties</CardTitle>
        <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
          Geen duidelijke vaste patronen gevonden die we automatisch kunnen markeren. Controleer grammatica en lidwoorden
          (de/het) in je volgende antwoord.
        </p>
      </Card>
    )
  }

  return (
    <Card variant="outlined" padding="md" className="border-slate-200 border-l-4 border-l-rose-400/70">
      <CardTitle className="text-body font-semibold text-ink-primary">Gerichte correcties</CardTitle>
      <p className="mt-1 text-caption text-ink-tertiary leading-snug">
        Een paar belangrijke fixes — niet elke kleine detail.
      </p>
      <ul className="mt-3 space-y-3">
        {corrections.map((c) => (
          <li key={`${c.originalFragment}-${c.correctedFragment}`} className="rounded-lg bg-surface-muted/80 border border-slate-200/80 px-3 py-2.5">
            <div className="text-body-sm">
              <span className="text-error line-through decoration-error/50">{c.originalFragment}</span>
              <span className="mx-1.5 text-ink-tertiary">→</span>
              <span className="font-medium text-emerald-800">{c.correctedFragment}</span>
            </div>
            <p className="mt-1.5 text-caption text-ink-secondary leading-snug">{c.explanationNl}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
