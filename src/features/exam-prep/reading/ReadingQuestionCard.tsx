'use client'

import { useMemo } from 'react'
import { clsx } from 'clsx'
import { Card, CardTitle } from '@/components/ui/Card'
import { shuffleDeterministic } from '@/lib/exam-prep/reading/readingTaskBuilder'
import { readingSkillFocusHintNl } from '@/lib/exam-prep/reading/readingSkillClassifier'
import type { ReadingTrainingItem } from '@/lib/schemas/exam/readingTrainingItem.schema'

function seedFromId(id: string): number {
  return id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
}

export function ReadingQuestionCard({
  item,
  disabled,
  onSelect,
  /** When set (e.g. duo exam), highlights choice; user can change before confirming. Omit for immediate submit (training). */
  selectedOptionId,
}: {
  item: ReadingTrainingItem
  disabled: boolean
  onSelect: (optionId: string) => void
  selectedOptionId?: string | null
}) {
  const options = useMemo(
    () => shuffleDeterministic([...item.options], seedFromId(item.id)),
    [item.id, item.options]
  )

  return (
    <Card variant="outlined" padding="md" className="border-slate-200">
      <CardTitle className="text-body font-semibold text-ink-primary leading-snug">{item.instructionNl}</CardTitle>
      <p className="text-caption text-ink-tertiary mt-2 leading-snug">{readingSkillFocusHintNl(item.readingSkill)}</p>
      <p className="text-body-sm text-ink-secondary mt-3 font-medium">Kies het juiste antwoord</p>
      <div className="mt-3 space-y-2">
        {options.map((opt) => {
          const isSelected = selectedOptionId !== undefined && opt.id === selectedOptionId
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(opt.id)}
              className={clsx(
                'w-full min-h-touch rounded-xl border px-4 py-3 text-left text-body text-ink-primary transition-colors',
                disabled
                  ? 'border-slate-100 bg-slate-50 text-ink-tertiary cursor-not-allowed'
                  : isSelected
                    ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-500/35 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-primary-400 hover:bg-primary-50/30 active:scale-[0.99]'
              )}
            >
              {opt.labelNl}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
