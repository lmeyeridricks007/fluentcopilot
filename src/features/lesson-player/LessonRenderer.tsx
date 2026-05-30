'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { LessonStepRenderer } from '@/features/lesson-player/LessonStepRenderer'
import type { useLessonEngine } from '@/features/lesson-player/useLessonEngine'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { StreakBadge } from '@/components/review/StreakBadge'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { pickPrimaryMilestone } from '@/lib/retention/milestoneDisplay'
import { getRetentionProfile, getRetentionUserId } from '@/lib/retention/retentionService'
import { MOCK_LESSON_PROGRESS } from '@/mocks/lessonProgress'
import { isA2PathCompleteMerged, isRegisteredA2Lesson, POST_A2_TRANSITION_HREF } from '@/lib/post-a2'

type Engine = ReturnType<typeof useLessonEngine>

type Props = {
  engine: Engine
}

export function LessonRenderer({ engine }: Props) {
  const {
    lesson,
    step,
    stepIndex,
    totalSteps,
    finished,
    goNext,
    goBack,
    completeLesson,
    scheduleAdvance,
    completionMeta,
  } = engine

  const [manualContinue, setManualContinue] = useState(false)
  const [enter, setEnter] = useState(true)

  useEffect(() => {
    setManualContinue(false)
  }, [step.id])

  useEffect(() => {
    setEnter(false)
    const id = requestAnimationFrame(() => setEnter(true))
    return () => cancelAnimationFrame(id)
  }, [step.id])

  const primaryMilestoneId = useMemo(() => {
    if (!finished) return undefined
    return pickPrimaryMilestone(completionMeta?.milestones)?.id
  }, [finished, completionMeta?.milestones])

  useEffect(() => {
    if (!primaryMilestoneId) return
    track(ANALYTICS_EVENTS.milestone_viewed, {
      count: 1,
      ids: [primaryMilestoneId],
      surface: 'lesson_complete',
    })
  }, [primaryMilestoneId])

  if (finished) {
    const m = completionMeta
    const highlight = pickPrimaryMilestone(m?.milestones)
    const profile = getRetentionProfile(getRetentionUserId())
    const a2PathComplete =
      isRegisteredA2Lesson(lesson.id) &&
      isA2PathCompleteMerged(profile.completedLessonIds, MOCK_LESSON_PROGRESS)
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 pb-safe-bottom text-center space-y-5">
        <div className="text-5xl" aria-hidden>
          ✓
        </div>
        <h1 className="text-title font-bold text-ink-primary">Les klaar</h1>
        {a2PathComplete ? (
          <p className="text-body-sm text-primary-800 font-medium max-w-sm leading-snug">
            You’ve completed the A2 lesson path. You can handle many everyday situations — choose B1, A2 Mastery, or
            Exam preparation as your next focus.
          </p>
        ) : null}
        {m && m.xpGained > 0 ? (
          <p className="text-body-lg font-semibold text-primary-700 tabular-nums">
            +{m.xpGained} XP
          </p>
        ) : null}
        {m && m.streak > 0 ? <StreakBadge streak={m.streak} /> : null}
        {highlight ? (
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-surface-muted/60 px-4 py-3 text-left">
            <p className="text-caption font-semibold text-ink-secondary">{highlight.title}</p>
            <p className="text-body-sm text-ink-primary mt-1">{highlight.body}</p>
          </div>
        ) : null}
        <p className="text-body text-ink-secondary max-w-sm">
          New phrases join your <strong>daily review</strong> when they’re due — short sessions keep them sharp.
        </p>
        <div className="w-full max-w-xs flex flex-col gap-2">
          {a2PathComplete ? (
            <Link
              href={POST_A2_TRANSITION_HREF}
              onClick={() =>
                track(ANALYTICS_EVENTS.post_a2_banner_clicked, { surface: 'lesson_complete_a2' })
              }
              className="inline-flex min-h-touch w-full items-center justify-center rounded-lg px-6 py-3 text-body-lg font-semibold bg-primary-600 text-white hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
            >
              Choose your next path
            </Link>
          ) : null}
          <Button variant={a2PathComplete ? 'secondary' : 'primary'} className="w-full" onClick={() => window.history.back()}>
            Terug
          </Button>
        </div>
      </div>
    )
  }

  const showManualCta = manualContinue && (step.type === 'preview' || step.type === 'grammar_card')

  return (
    <div className="min-h-[100dvh] flex flex-col bg-surface">
      <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur border-b border-slate-200 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => goBack()}
            disabled={stepIndex === 0}
            className="min-h-touch min-w-touch rounded-lg text-ink-secondary disabled:opacity-30"
            aria-label="Vorige stap"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-caption text-ink-tertiary truncate">{lesson.title}</p>
            <p className="text-caption font-medium text-ink-secondary tabular-nums">
              Stap {stepIndex + 1} van {totalSteps}
            </p>
            <ProgressBar value={stepIndex + 1} max={totalSteps} />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <div
          key={step.id}
          className={clsx(
            'max-w-lg mx-auto space-y-4 transition-all duration-300 ease-out',
            enter ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
          )}
        >
          {step.prompt && (
            <h2 className="text-body-lg font-semibold text-ink-primary leading-snug">{step.prompt}</h2>
          )}
          <LessonStepRenderer
            lessonId={lesson.id}
            step={step}
            onStepForward={goNext}
            onScheduleForward={scheduleAdvance}
            onLessonComplete={completeLesson}
            onManualContinueChange={setManualContinue}
          />
        </div>
      </main>

      <footer className="fixed bottom-0 inset-x-0 z-[100] border-t border-slate-200 bg-surface-elevated shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-lg mx-auto">
          {showManualCta ? (
            <Button variant="primary" fullWidth size="lg" onClick={() => goNext()}>
              Verder
            </Button>
          ) : step.type === 'recap' ? (
            <p className="text-center text-caption text-ink-tertiary">Ronde de vier checks af…</p>
          ) : (
            <p className="text-center text-caption text-ink-tertiary">
              Volg de stap — we gaan automatisch verder na een goed antwoord.
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}
