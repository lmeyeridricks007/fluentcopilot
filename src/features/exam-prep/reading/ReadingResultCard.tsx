'use client'

import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import type { ReadingEvaluationResult } from '@/lib/exam-prep/reading/types'

export function ReadingResultCard({
  result,
  onNext,
  isLastTask,
}: {
  result: ReadingEvaluationResult
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
          {result.evidenceSnippetNl ? (
            <p className="mt-2 text-caption text-ink-tertiary leading-snug">
              <span className="font-medium text-ink-secondary">In de tekst: </span>
              {result.evidenceSnippetNl}
            </p>
          ) : null}
        </div>
      </div>
      <Button type="button" className="mt-4 w-full min-h-touch" onClick={onNext}>
        {isLastTask ? 'Naar overzicht' : 'Volgende opgave'}
      </Button>
    </Card>
  )
}
