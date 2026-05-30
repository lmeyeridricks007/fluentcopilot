'use client'

import { Card, CardDescription, CardTitle } from '@/components/ui/Card'

/**
 * Laag 2 — uw eigen tekst, strakker geformuleerd (A2). Niet het modelantwoord.
 */
export function WritingRewrittenVersionCard({ dutch, noteNl }: { dutch: string; noteNl: string }) {
  return (
    <Card variant="outlined" padding="md" className="border-slate-200 border-l-4 border-l-primary-500/70 bg-primary-50/25">
      <CardTitle className="text-body font-semibold text-ink-primary">Herschreven versie van uw tekst</CardTitle>
      <CardDescription className="mt-1 text-caption text-ink-tertiary leading-snug">
        Laag 2 — dezelfde bedoeling als uw antwoord, taalkundig duidelijker. Dit is <span className="font-medium">niet</span> het
        verplichte model hieronder.
      </CardDescription>
      <p className="mt-3 text-body text-ink-primary leading-relaxed whitespace-pre-wrap">{dutch}</p>
      <p className="mt-3 text-body-sm text-ink-secondary border-t border-slate-200/80 pt-2 leading-relaxed">{noteNl}</p>
    </Card>
  )
}
