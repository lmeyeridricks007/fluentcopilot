'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { clsx } from 'clsx'

const STEP_DEFS = [
  {
    id: 'transcribe',
    label: 'Transcribing your reading',
    description: 'Turning your recording into text so we can line it up with the passage.',
  },
  {
    id: 'pronounce',
    label: 'Scoring pronunciation',
    description: 'Measuring clarity, stress, and how closely you matched the words.',
  },
  {
    id: 'sentences',
    label: 'Reviewing each sentence',
    description: 'Comparing what you said to the lines you read.',
  },
  {
    id: 'coach',
    label: 'Writing your coaching tips',
    description: 'Summarizing feedback and useful next steps.',
  },
] as const

/**
 * Indeterminate progress for the single-shot read-aloud evaluate HTTP call.
 * Uses gentle time-based advancement so the list keeps moving on long runs (no server streaming).
 */
export function ReadAloudEvaluatingProgress() {
  const [ticks, setTicks] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTicks((n) => n + 1), 500)
    return () => window.clearInterval(id)
  }, [])

  const elapsedSec = ticks * 0.5

  const stepStates = useMemo(() => {
    const transcriptDone = elapsedSec >= 6
    const pronunciationDone = elapsedSec >= 22
    const sentencesDone = elapsedSec >= 38
    const coachDone = false
    return [transcriptDone, pronunciationDone, sentencesDone, coachDone] as const
  }, [elapsedSec])

  return (
    <ol className="mt-5 w-full max-w-sm text-left space-y-3">
      {STEP_DEFS.map((step, i) => {
        const done = stepStates[i]
        const active = !done && (i === 0 || stepStates[i - 1])
        return (
          <li
            key={step.id}
            className={clsx(
              'flex gap-3 rounded-xl border px-3 py-2.5 transition-colors',
              done && 'border-emerald-200 bg-emerald-50/80',
              active && !done && 'border-violet-200 bg-violet-50/90 shadow-sm',
              !done && !active && 'border-slate-200/80 bg-white/60 opacity-70'
            )}
          >
            <span
              className={clsx(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
                done && 'border-emerald-500 bg-emerald-600 text-white',
                active && !done && 'border-violet-400 bg-white text-violet-700 motion-safe:animate-pulse',
                !done && !active && 'border-slate-200 bg-slate-50 text-slate-400'
              )}
              aria-hidden
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-caption font-semibold text-ink-primary leading-snug">{step.label}</p>
              <p className="text-[11px] text-ink-secondary mt-0.5 leading-snug">{step.description}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
