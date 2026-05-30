'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { getSkillTrackDefinition } from '@/lib/skill-tracks'
import { loadSkillTrackProgress, saveSkillTrackSessionOutcome } from '@/lib/skill-tracks/skillTrackProgressStorage'
import { scoreSkillTrackSession, xpForSkillTrackScore, type ExerciseAttempt } from '@/lib/skill-tracks/skillTrackScoring'
import { recordAbilitySkillTrackSignal } from '@/lib/mastery/recordAbilitySignals'
import { processSkillTrackSessionProgress } from '@/lib/practice-progress/practiceSkillTrackProgress'
import { SkillTrackSessionHeader } from '@/features/skill-tracks/components/SkillTrackSessionHeader'
import { SkillTrackExerciseView } from '@/features/skill-tracks/components/SkillTrackExerciseView'
import { SkillTrackCompletionSummary } from '@/features/skill-tracks/components/SkillTrackCompletionSummary'
import type { SkillTrackExercise } from '@/lib/schemas/practice/skillTrack.schema'
import { useEntitlement, PaywallModal } from '@/features/entitlements'

const FX_KEY = 'lt-skill-track-fx-ts-'

function attemptForExercise(ex: SkillTrackExercise, correct: boolean | null, participated?: boolean): ExerciseAttempt {
  if (ex.kind === 'speaking_prompt') {
    return { exerciseId: ex.id, participated: Boolean(participated) }
  }
  return { exerciseId: ex.id, correct: correct === true }
}

type SessionProgress = { index: number; attempts: ExerciseAttempt[] }

type SessionProgressAction =
  | { type: 'reset' }
  | { type: 'advance'; attempt: ExerciseAttempt; exerciseTotal: number }

/**
 * Single source of truth for step + attempts — avoids desync from split setState (e.g. double Continue
 * → exerciseIndex past exercises.length → blank screen / “Step 3/2”).
 */
function sessionProgressReducer(state: SessionProgress, action: SessionProgressAction): SessionProgress {
  if (action.type === 'reset') {
    return { index: 0, attempts: [] }
  }
  if (action.type === 'advance') {
    const { attempt, exerciseTotal } = action
    if (exerciseTotal <= 0) return state
    if (state.attempts.length !== state.index) return state
    const last = state.attempts[state.attempts.length - 1]
    if (last && last.exerciseId === attempt.exerciseId) return state
    const attempts = [...state.attempts, attempt]
    if (attempts.length >= exerciseTotal) {
      return { index: state.index, attempts }
    }
    return { index: state.index + 1, attempts }
  }
  return state
}

export function SkillTrackSessionPage({ trackId }: { trackId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const levelParam = searchParams.get('level')
  const levelIndex = Math.min(3, Math.max(0, Number(levelParam ?? '0') || 0))
  const def = useMemo(() => getSkillTrackDefinition(trackId), [trackId])
  const { tier } = useEntitlement()
  const [paywallOpen, setPaywallOpen] = useState(false)

  const level = def?.levels.find((l) => l.index === levelIndex)
  const prog = useMemo(() => (def ? loadSkillTrackProgress(def.id) : null), [def])

  const [sessionProgress, dispatchSession] = useReducer(sessionProgressReducer, {
    index: 0,
    attempts: [] as ExerciseAttempt[],
  })
  const [complete, setComplete] = useState(false)
  const [sessionScore, setSessionScore] = useState(0)
  const [passed, setPassed] = useState(false)
  const [xpGained, setXpGained] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const started = useRef(false)
  const finishOnceRef = useRef(false)

  useEffect(() => {
    dispatchSession({ type: 'reset' })
    setComplete(false)
    started.current = false
    finishOnceRef.current = false
  }, [trackId, levelIndex])

  useEffect(() => {
    if (!def || !level) return
    if (level.premiumLocked && tier === 'free') {
      setPaywallOpen(true)
      return
    }
    const maxStart = prog?.unlockedLevelIndex ?? 0
    if (levelIndex > maxStart) {
      router.replace(`/app/practice/tracks/${encodeURIComponent(trackId)}`)
    }
  }, [def, level, levelIndex, prog?.unlockedLevelIndex, router, tier, trackId])

  useEffect(() => {
    if (!def || !level || complete) return
    if (started.current) return
    started.current = true
    track(ANALYTICS_EVENTS.skill_track_session_started, {
      trackId: def.id,
      levelIndex: level.index,
    })
  }, [def, level, complete])

  const exercises = level?.exercises ?? []
  const exerciseIndex = sessionProgress.index
  const currentEx = exercises[exerciseIndex]

  const finishSession = useCallback(
    (finalAttempts: ExerciseAttempt[]) => {
      if (!def || !level) return
      const scored = scoreSkillTrackSession(finalAttempts)
      setSessionScore(scored.score)
      setPassed(scored.passedLevelThreshold)
      setCorrectCount(scored.correctCount)
      setTotalCount(scored.attemptedCount)

      const progBeforeUnlock = loadSkillTrackProgress(def.id).unlockedLevelIndex

      saveSkillTrackSessionOutcome({
        trackId: def.id,
        levelIndex: level.index,
        score: scored.score,
        passedThreshold: scored.passedLevelThreshold,
      })

      const xp = xpForSkillTrackScore(scored.score, scored.passedLevelThreshold)
      const dedupeKey = `${FX_KEY}${def.id}-${level.index}`
      const now = Date.now()
      const prev = Number(sessionStorage.getItem(dedupeKey) ?? '0')
      let awarded = xp
      if (!prev || now - prev > 8000) {
        sessionStorage.setItem(dedupeKey, String(now))
        const meta = processSkillTrackSessionProgress({
          trackId: def.id,
          levelIndex: level.index,
          score: scored.score,
          passed: scored.passedLevelThreshold,
          xpAmount: xp,
        })
        awarded = meta.xpGained
      }
      setXpGained(awarded)

      const rowAfter = loadSkillTrackProgress(def.id)
      if (rowAfter.unlockedLevelIndex > progBeforeUnlock) {
        track(ANALYTICS_EVENTS.skill_track_level_progressed, {
          trackId: def.id,
          skill_track_id: def.id,
          previous_unlocked_level_index: progBeforeUnlock,
          new_unlocked_level_index: rowAfter.unlockedLevelIndex,
        })
      }

      track(ANALYTICS_EVENTS.skill_track_session_completed, {
        trackId: def.id,
        levelIndex: level.index,
        score: scored.score,
        passed: scored.passedLevelThreshold,
      })
      recordAbilitySkillTrackSignal({
        trackId: def.id,
        sessionScore: scored.score,
        passed: scored.passedLevelThreshold,
      })
      setComplete(true)
    },
    [def, level]
  )

  useEffect(() => {
    if (complete || !def || !level) return
    const n = exercises.length
    if (n === 0) return
    if (sessionProgress.attempts.length < n) return
    if (finishOnceRef.current) return
    finishOnceRef.current = true
    finishSession(sessionProgress.attempts)
  }, [
    complete,
    def,
    exercises.length,
    finishSession,
    level,
    sessionProgress.attempts,
    sessionProgress.attempts.length,
  ])

  const onExerciseDone = useCallback(
    (correct: boolean | null, participated?: boolean) => {
      if (complete) return
      const ex = exercises[sessionProgress.index]
      if (!ex) return
      if (sessionProgress.attempts.length !== sessionProgress.index) return
      const attempt = attemptForExercise(ex, correct, participated)
      dispatchSession({ type: 'advance', attempt, exerciseTotal: exercises.length })
    },
    [complete, exercises, sessionProgress.attempts.length, sessionProgress.index]
  )

  const headerStepIndex =
    exercises.length > 0 ? Math.min(sessionProgress.index, exercises.length - 1) : 0

  if (!def || !level) {
    return (
      <div className="px-4 py-10 text-center text-body-sm text-ink-secondary max-w-lg mx-auto">
        <Link href="/app/practice/tracks" className="text-primary-600 font-medium">
          Back to skill tracks
        </Link>
      </div>
    )
  }

  if (level.premiumLocked && tier === 'free') {
    return (
      <div className="px-4 py-10 max-w-lg mx-auto space-y-4">
        <p className="text-body-sm text-ink-secondary text-center">
          This level is included in Premium — trial and subscribers practice deeper bands here.
        </p>
        <Link
          href={`/app/practice/tracks/${encodeURIComponent(trackId)}`}
          className="block text-center text-primary-600 font-medium"
        >
          Back
        </Link>
        <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} reason="premium_feature" />
      </div>
    )
  }

  if (complete) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <SkillTrackCompletionSummary
          trackTitle={def.title}
          trackId={def.id}
          levelLabel={level.label}
          levelIndex={level.index}
          scorePercent={Math.round(sessionScore * 100)}
          passedLevel={passed}
          xpGained={xpGained}
          correctCount={correctCount}
          totalCount={totalCount}
        />
      </div>
    )
  }

  return (
    <div className="px-4 py-4 pb-28 max-w-lg mx-auto">
      <SkillTrackSessionHeader
        trackTitle={def.title}
        trackId={def.id}
        level={level}
        unlockedLevelIndex={prog?.unlockedLevelIndex ?? 0}
        exerciseIndex={headerStepIndex}
        exerciseTotal={exercises.length}
      />
      {currentEx ? (
        <SkillTrackExerciseView
          key={currentEx.id}
          exercise={currentEx}
          trackId={def.id}
          onSubmit={onExerciseDone}
        />
      ) : null}
    </div>
  )
}
