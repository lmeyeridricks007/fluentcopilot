'use client'

import React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { clsx } from 'clsx'
import type { SpeakLiveEvaluationPipelinePhase } from '@/lib/api/apiTypes'

const STEP_DEFS = [
  { id: 'transcript', label: 'Reading your transcript', description: 'Confirming what you said in each turn.' },
  { id: 'pronunciation', label: 'Checking your pronunciation', description: 'Listening to your recording for word clarity and rhythm.' },
  { id: 'sentences', label: 'Reviewing your Dutch', description: 'Looking at grammar, word order, and natural phrasing.' },
  { id: 'recap', label: 'Writing your feedback', description: 'Putting together your personalized coaching notes.' },
  { id: 'qa', label: 'Verifying your feedback', description: 'Checking that the coaching matches what you actually said and recorded.' },
] as const

/** Parallel scenario lane: dialogue + speech overlap earlier — copy matches server phase semantics. */
const STEP_DEFS_OPTIMIZED = [
  {
    id: 'transcript',
    label: 'Scenario & dialogue',
    description: 'Relating what you said to the scenario goals and coach transcript.',
  },
  {
    id: 'pronunciation',
    label: 'Voice & pronunciation',
    description: 'Scoring clarity and rhythm from your recordings.',
  },
  {
    id: 'sentences',
    label: 'Reviewing your Dutch',
    description: 'Grammar, register, and phrasing on each line.',
  },
  {
    id: 'recap',
    label: 'Writing your feedback',
    description: 'Assembling your personalized coaching notes.',
  },
  { id: 'qa', label: 'Verifying your feedback', description: 'Checking that tips match what you said and recorded.' },
] as const

type ApiEvalStatus = 'pending' | 'running' | 'complete' | 'failed' | undefined
type ApiQaStatus = 'pending' | 'running' | 'passed' | 'failed' | undefined

const PHASE_RANK: Record<SpeakLiveEvaluationPipelinePhase, number> = {
  queued: 0,
  evaluating_dialogue: 1,
  evaluating_transcript: 1,
  evaluating_speech: 2,
  composing_report: 3,
  completed: 5,
  failed: 5,
}

/**
 * Learner-facing progress while the post-session job runs. Prefers server-reported
 * {@link SpeakLiveEvaluationPipelinePhase} when present; otherwise falls back to thread phase + gentle time-based motion.
 */
export function EvaluationPreparingSteps({
  apiStatus,
  speakLivePhase,
  qaStatus,
  evaluationPhase,
  variant = 'standard',
}: {
  apiStatus: ApiEvalStatus
  speakLivePhase?: string | null
  qaStatus?: ApiQaStatus
  evaluationPhase?: SpeakLiveEvaluationPipelinePhase | null
  /** Optimized scenario lane: dialogue + Azure run in parallel — step labels match that flow. */
  variant?: 'standard' | 'optimized'
}) {
  const [ticks, setTicks] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTicks((n) => n + 1), 500)
    return () => window.clearInterval(id)
  }, [])

  const elapsedSec = ticks * 0.5

  const stepStates = useMemo(() => {
    const phase = (speakLivePhase ?? '').toLowerCase()
    const st = apiStatus
    const qa = qaStatus
    const pipe = evaluationPhase ?? null
    const pr = pipe ? PHASE_RANK[pipe] ?? 0 : null

    const transcriptDone =
      pr != null
        ? pr >= 1
        : phase === 'evaluating' ||
          phase === 'verifying' ||
          phase === 'evaluated' ||
          phase === 'failed' ||
          st === 'running' ||
          st === 'complete' ||
          elapsedSec >= 1.5

    const pronunciationDone =
      pr != null ? pr >= 2 : st === 'running' || st === 'complete' || (transcriptDone && elapsedSec >= 3.5)

    const sentencesDone =
      pr != null ? pr >= 3 : st === 'running' || st === 'complete' || (pronunciationDone && elapsedSec >= 6)

    const recapDone =
      pr != null
        ? pr >= 3 && (phase === 'verifying' || qa === 'running' || qa === 'passed' || st === 'complete')
        : phase === 'verifying' || qa === 'running' || qa === 'passed' || st === 'complete'

    const qaDone = qa === 'passed' || (st === 'complete' && qa !== 'failed') || pipe === 'completed'

    return [transcriptDone, pronunciationDone, sentencesDone, recapDone, qaDone] as const
  }, [apiStatus, speakLivePhase, qaStatus, evaluationPhase, elapsedSec, variant])

  const activeSteps = variant === 'optimized' ? STEP_DEFS_OPTIMIZED : STEP_DEFS

  return (
    <ol className="mt-5 w-full max-w-sm text-left space-y-3">
      {activeSteps.map((step, i) => {
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
