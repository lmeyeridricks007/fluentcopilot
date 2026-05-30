'use client'

import { Card, CardTitle } from '@/components/ui/Card'
import type { SpeakingCorrectionItem } from '@/lib/schemas/exam/speakingCoachOutput.schema'

/**
 * Belangrijkste taalpunten — géén volledige naslagwerk; focus op wat het meest helpt voor het examen.
 */
export function WritingCorrectionsCard({ corrections }: { corrections: SpeakingCorrectionItem[] }) {
  if (corrections.length === 0) {
    return (
      <Card variant="outlined" padding="md" className="border-slate-200">
        <CardTitle className="text-body font-semibold text-ink-primary">Gerichte correcties</CardTitle>
        <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
          Geen duidelijke vaste patronen gevonden om te markeren. Controleer woordvolgorde, lidwoorden (de/het) en
          mengvormen met Engels in uw volgende versie.
        </p>
      </Card>
    )
  }

  return (
    <Card variant="outlined" padding="md" className="border-slate-200 border-l-4 border-l-rose-400/70">
      <CardTitle className="text-body font-semibold text-ink-primary">Gerichte correcties</CardTitle>
      <p className="mt-1 text-caption text-ink-tertiary leading-snug">
        Laag 1 — alleen de belangrijkste fixes; niet elke kleine detail.
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
