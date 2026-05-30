'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { GuidedPracticeTaskContent } from './GuidedPracticeTaskContent'

type Props = {
  items: string[]
  stepKey: string
  /** When the step also has a four-skills wrap-up, show a clear CTA on the last task. */
  fourSkillsFollow?: boolean
  onOpenFourSkills?: () => void
}

export function GuidedPracticePager({
  items,
  stepKey,
  fourSkillsFollow = false,
  onOpenFourSkills,
}: Props) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [stepKey])

  const last = items.length - 1
  const safeIndex = Math.min(index, last)
  const current = items[safeIndex]
  const progress = ((safeIndex + 1) / items.length) * 100

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-sm font-medium text-ink-secondary">
          Practice task {safeIndex + 1} of {items.length}
        </p>
        <ProgressBar value={progress} max={100} variant="success" className="sm:w-48 h-2" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-surface-elevated/50 px-3 py-4 min-h-[8rem]">
        <GuidedPracticeTaskContent text={current} taskId={`${stepKey}-${safeIndex}`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="inline-flex items-center gap-1"
          disabled={safeIndex <= 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          aria-label="Previous practice task"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden />
          Previous task
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="inline-flex items-center gap-1"
          disabled={safeIndex >= last}
          onClick={() => setIndex((i) => Math.min(last, i + 1))}
          aria-label="Next practice task"
        >
          Next task
          <ChevronRight className="w-4 h-4 shrink-0" aria-hidden />
        </Button>
        {safeIndex >= last ? (
          fourSkillsFollow && onOpenFourSkills ? (
            <Button
              type="button"
              variant="primary"
              className="w-full sm:w-auto min-h-touch px-4"
              onClick={onOpenFourSkills}
            >
              Continue to four skills wrap-up
            </Button>
          ) : (
            <span className="text-body-sm text-ink-tertiary ml-1">
              All tasks shown — use Continue below to go to the next lesson step.
            </span>
          )
        ) : null}
      </div>
    </div>
  )
}
