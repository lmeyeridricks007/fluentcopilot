'use client'

import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import type { ListeningQuestionType } from '@/lib/schemas/exam/listeningTrainingItem.schema'
import type { ListeningTrainingItem } from '@/lib/schemas/exam/listeningTrainingItem.schema'

const TYPE_NL: Record<ListeningQuestionType, string> = {
  gist: 'Hoofdidee',
  detail: 'Detail',
  intent: 'Bedoeling',
}

export function ListeningPromptCard({
  item,
  progress,
}: {
  item: ListeningTrainingItem
  progress?: { current: number; total: number }
}) {
  return (
    <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated shadow-sm">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-caption font-semibold uppercase tracking-wide text-slate-500">Luisteren</span>
        <span className="rounded-md bg-violet-50 text-violet-900 border border-violet-200/80 px-2 py-0.5 text-caption font-semibold">
          Examenoefening
        </span>
        <span className="rounded-md bg-slate-100 text-ink-secondary border border-slate-200 px-2 py-0.5 text-caption">
          {TYPE_NL[item.questionType]}
        </span>
        <span className="rounded-md bg-slate-100 text-ink-secondary border border-slate-200 px-2 py-0.5 text-caption">
          {item.scenarioTag}
        </span>
      </div>
      {progress ? (
        <p className="text-caption font-medium text-ink-secondary mb-2">
          Opgave {progress.current} van {progress.total}
        </p>
      ) : null}
      <CardTitle className="text-body font-bold text-ink-primary leading-snug">{item.contextNl}</CardTitle>
      <CardDescription className="mt-3 text-body text-ink-secondary leading-relaxed">{item.instructionNl}</CardDescription>
    </Card>
  )
}
