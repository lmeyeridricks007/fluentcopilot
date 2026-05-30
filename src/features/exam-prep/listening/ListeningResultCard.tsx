'use client'

import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import type { ListeningEvaluationResult } from '@/lib/exam-prep/listening/types'

export function ListeningResultCard({
  result,
  startsUsed,
  maxStarts,
  replaysUsed,
  onNext,
  isLastTask,
}: {
  result: ListeningEvaluationResult
  startsUsed: number
  maxStarts: number
  replaysUsed: number
  onNext: () => void
  isLastTask: boolean
}) {
  return (
    <Card
      variant="outlined"
      padding="md"
      className={result.correct ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/35'}
    >
      <div className="flex items-start gap-3">
        {result.correct ? (
          <CheckCircle2 className="w-8 h-8 text-emerald-700 shrink-0" aria-hidden />
        ) : (
          <XCircle className="w-8 h-8 text-amber-800 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <CardTitle className="text-body font-bold text-ink-primary leading-snug">{result.headlineNl}</CardTitle>
          <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">{result.bodyNl}</p>
          {result.keyPhraseNl ? (
            <p className="mt-2 text-caption text-ink-tertiary">
              <span className="font-medium text-ink-secondary">Beluister in gedachten: </span>
              {result.keyPhraseNl}
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-4 text-caption text-ink-tertiary">
        Audio-start deze opdracht: {startsUsed} / {maxStarts} gebruikt
        {replaysUsed > 0 ? ` (${replaysUsed} herhaling${replaysUsed > 1 ? 'en' : ''})` : null}
      </p>
      <Button type="button" className="mt-4 w-full min-h-touch" onClick={onNext}>
        {isLastTask ? 'Naar overzicht' : 'Volgende opgave'}
      </Button>
    </Card>
  )
}
