'use client'

import { useCallback, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ExerciseBlockResultPayload } from '@/features/generated-exercise-pack/exerciseBlockResult'
import { ExercisePackSessionShell } from '@/features/generated-exercise-pack/ExercisePackSessionShell'
import type { PracticePackMode } from '@/lib/progression/personalizedPackXp'
import { fromYourDayPackProgressCountsQualify } from '@/lib/progression/fromYourDayPackRules'
import { interactivePackMeetsEffortBar } from '@/features/quick-capture/interactivePack/interactivePackMeaningfulPractice'
import type { InteractiveBlockProgressRecord } from '@/features/quick-capture/interactivePack/interactivePackProgressTypes'
import {
  personalizedPackXpBand,
  sumCompletedInteractiveXpPreview,
} from '@/features/quick-capture/interactivePack/interactivePackXpPreview'
import { InteractiveExerciseRenderer } from './InteractiveExerciseRenderer'
import type { InteractiveSessionPackV1 } from './types'

function phaseLabel(p: string): string {
  switch (p) {
    case 'warm_up':
      return 'Settle in'
    case 'core':
      return 'Main reps'
    case 'transfer':
      return 'Try it out'
    case 'finish':
      return 'Wrap-up'
    default:
      return p
  }
}

function isDone(blocks: Record<string, InteractiveBlockProgressRecord | undefined>, id: string): boolean {
  return blocks[id]?.completionState === 'completed'
}

function initialSlideIndex(
  session: InteractiveSessionPackV1,
  blocks: Record<string, InteractiveBlockProgressRecord | undefined>,
): number {
  const i = session.exercises.findIndex((e) => !isDone(blocks, e.id))
  return i === -1 ? Math.max(0, session.exercises.length - 1) : i
}

export function InteractiveFromYourDayRunner(props: {
  session: InteractiveSessionPackV1
  blockProgress: Record<string, InteractiveBlockProgressRecord | undefined>
  practicePackMode: PracticePackMode
  onMarkExerciseDone: (exerciseId: string, result?: ExerciseBlockResultPayload) => void
  estimatedMinutes?: number
  compact?: boolean
}) {
  const { session, blockProgress, practicePackMode, onMarkExerciseDone, estimatedMinutes, compact } = props
  const exercises = session.exercises
  const [idx, setIdx] = useState(() => initialSlideIndex(session, blockProgress))

  const current = exercises[idx]
  const completedCount = useMemo(
    () => exercises.filter((e) => isDone(blockProgress, e.id)).length,
    [blockProgress, exercises],
  )
  const currentDone = current ? isDone(blockProgress, current.id) : true

  const xpPreviewLine = useMemo(() => {
    if (!exercises.length) return undefined
    const mix = sumCompletedInteractiveXpPreview(exercises, blockProgress, 20)
    const { min, max } = personalizedPackXpBand(practicePackMode)
    return `~${min}–${max} XP tier · mix +${mix} (preview)`
  }, [blockProgress, exercises, practicePackMode])

  const goPrev = useCallback(() => {
    setIdx((i) => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setIdx((i) => Math.min(exercises.length - 1, i + 1))
  }, [exercises.length])

  const handleExerciseComplete = useCallback(
    (result?: ExerciseBlockResultPayload) => {
      if (!current) return
      onMarkExerciseDone(current.id, result)
      setIdx((i) => Math.min(exercises.length - 1, i + 1))
    },
    [current, exercises.length, onMarkExerciseDone],
  )

  const xpHint = useMemo(() => {
    const total = exercises.length
    if (total === 0) return undefined
    const countsOk = fromYourDayPackProgressCountsQualify({ stepsTotal: total, stepsCompleted: completedCount })
    const effortOk = interactivePackMeetsEffortBar(exercises, blockProgress)
    if (countsOk && effortOk) {
      return 'Good next step — save session below for XP.'
    }
    if (countsOk && !effortOk) {
      return 'Almost there — add one write, listen, read-aloud, or recording beat for streak credit.'
    }
    return 'Keep going — then save session below.'
  }, [blockProgress, completedCount, exercises])

  const subtitle = [session.subtitle, estimatedMinutes ? `~${estimatedMinutes} min` : null].filter(Boolean).join(' · ')

  if (!current) {
    return <p className="text-body-sm text-ink-secondary">No exercises in this pack.</p>
  }

  return (
    <ExercisePackSessionShell
      sessionChrome="compact"
      packTitle={session.title}
      packSubtitle={subtitle || undefined}
      phaseLabel={phaseLabel(current.phase)}
      stepIndex={idx}
      stepTotal={exercises.length}
      completedCount={completedCount}
      xpHint={xpHint}
      xpPreviewLine={xpPreviewLine}
      footer={
        <div className="space-y-2.5">
          <div className="flex gap-1 overflow-x-auto pb-0.5" role="tablist" aria-label="Exercise progress">
            {exercises.map((e, i) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setIdx(i)}
                className={clsx(
                  'h-1.5 shrink-0 rounded-full transition-all min-w-[20px]',
                  isDone(blockProgress, e.id) ? 'bg-emerald-400' : i === idx ? 'bg-primary-600 w-7' : 'bg-slate-200/90',
                )}
                aria-label={`Exercise ${i + 1}${isDone(blockProgress, e.id) ? ' done' : ''}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="gap-1 flex-1 min-h-touch" onClick={goPrev} disabled={idx === 0}>
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-1 flex-1 min-h-touch"
              onClick={goNext}
              disabled={idx >= exercises.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
            </Button>
          </div>
        </div>
      }
    >
      <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] space-y-3">
        <InteractiveExerciseRenderer
          key={current.id}
          exercise={current}
          onComplete={handleExerciseComplete}
          disabled={currentDone}
          compact={compact}
        />
        {currentDone ? (
          <p className="text-[11px] font-medium text-emerald-800 flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
              ✓
            </span>
            Good next step — continue when you are ready.
          </p>
        ) : null}
      </article>
    </ExercisePackSessionShell>
  )
}
