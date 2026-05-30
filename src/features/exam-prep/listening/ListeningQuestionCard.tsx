'use client'

import { useMemo } from 'react'
import { clsx } from 'clsx'
import { Card, CardTitle } from '@/components/ui/Card'
import { shuffleDeterministic } from '@/lib/exam-prep/listening/listeningTaskBuilder'
import type { ListeningTrainingItem } from '@/lib/schemas/exam/listeningTrainingItem.schema'

function seedFromId(id: string): number {
  return id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
}

export function ListeningQuestionCard({
  item,
  disabled,
  onSelect,
}: {
  item: ListeningTrainingItem
  disabled: boolean
  onSelect: (optionId: string) => void
}) {
  const options = useMemo(
    () => shuffleDeterministic([...item.options], seedFromId(item.id)),
    [item.id, item.options]
  )

  return (
    <Card variant="outlined" padding="md" className="border-slate-200">
      <CardTitle className="text-body font-semibold text-ink-primary">Kies het juiste antwoord</CardTitle>
      <p className="text-body-sm text-ink-secondary mt-1">Eén optie is correct.</p>
      <div className="mt-4 space-y-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt.id)}
            className={clsx(
              'w-full min-h-touch rounded-xl border px-4 py-3 text-left text-body text-ink-primary transition-colors',
              disabled
                ? 'border-slate-100 bg-slate-50 text-ink-tertiary cursor-not-allowed'
                : 'border-slate-200 bg-white hover:border-primary-400 hover:bg-primary-50/30 active:scale-[0.99]'
            )}
          >
            {opt.labelNl}
          </button>
        ))}
      </div>
    </Card>
  )
}
