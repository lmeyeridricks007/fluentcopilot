'use client'

import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { WritingExerciseSubtype } from '@/lib/schemas/exam/writingExam.schema'

const ROWS: {
  subtype: WritingExerciseSubtype
  titleNl: string
  bodyNl: string
  /** Placeholder for future progress */
  statusHint?: string
}[] = [
  {
    subtype: 'form',
    titleNl: 'Formulier',
    bodyNl: 'Persoonlijke gegevens en korte antwoorden in vakjes — zoals bij de gemeente of een inschrijving.',
    statusHint: 'Voortgang volgt later',
  },
  {
    subtype: 'message',
    titleNl: 'Bericht',
    bodyNl: 'Een korte tekst aan één persoon (docent, baas, huisbaas) met vaste punten die u moet noemen.',
    statusHint: 'Voortgang volgt later',
  },
  {
    subtype: 'text_to_audience',
    titleNl: 'Tekst voor iedereen',
    bodyNl: 'Een korte mededeling of stukje voor buren of een algemeen publiek — duidelijk en beleefd.',
    statusHint: 'Voortgang volgt later',
  },
]

export function WritingCategorySelector({ onSelect }: { onSelect: (subtype: WritingExerciseSubtype) => void }) {
  return (
    <div className="space-y-3">
      {ROWS.map((row) => (
        <Card key={row.subtype} variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-body font-semibold text-ink-primary">{row.titleNl}</CardTitle>
              <CardDescription className="mt-1 text-body-sm text-ink-secondary leading-snug">{row.bodyNl}</CardDescription>
              {row.statusHint ? (
                <p className="mt-2 text-caption text-ink-tertiary">{row.statusHint}</p>
              ) : null}
            </div>
            <Button type="button" className="w-full sm:w-auto shrink-0 min-h-touch px-5" onClick={() => onSelect(row.subtype)}>
              Oefenen
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
