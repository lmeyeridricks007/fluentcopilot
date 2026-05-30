'use client'

import { Card, CardTitle } from '@/components/ui/Card'
import type { ReadingTrainingItem } from '@/lib/schemas/exam/readingTrainingItem.schema'

export function ReadingTextCard({
  item,
  progress,
}: {
  item: ReadingTrainingItem
  progress?: { current: number; total: number }
}) {
  return (
    <Card variant="outlined" padding="md" className="border-slate-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-caption font-semibold uppercase tracking-wide text-primary-700">{item.textKindNl}</p>
        {progress ? (
          <span className="text-caption text-ink-tertiary">
            {progress.current} / {progress.total}
          </span>
        ) : null}
      </div>
      {item.textTitleNl ? (
        <CardTitle className="text-body font-semibold text-ink-primary mt-2 leading-snug">{item.textTitleNl}</CardTitle>
      ) : null}
      <div
        className="mt-3 text-body text-ink-primary leading-[1.65] whitespace-pre-wrap break-words"
        style={{ fontSize: 'max(1.0625rem, 17px)' }}
      >
        {item.bodyNl}
      </div>
    </Card>
  )
}
