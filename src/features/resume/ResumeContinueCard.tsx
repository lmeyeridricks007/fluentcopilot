'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PlayCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import {
  executeResumeRestart,
  resolveAlternateResumes,
  resolveHighestPriorityResume,
  type ResumeSurface,
} from '@/lib/resume'
import { heroPrimaryCta, heroShellClass } from '@/lib/design/cardTiers'
import { playOptInTapSound } from '@/lib/device/deviceFeedback'
import { clsx } from 'clsx'

export type ResumeContinueCardProps = {
  surface: ResumeSurface
  completedLessonIds: string[]
  className?: string
  /** Larger gradient hero treatment for home primary slot */
  variant?: 'default' | 'hero'
}

function formatResumeTime(iso: string | null): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(t)
  } catch {
    return null
  }
}

export function ResumeContinueCard({
  surface,
  completedLessonIds,
  className,
  variant = 'default',
}: ResumeContinueCardProps) {
  const router = useRouter()
  const userId = useAuthStore((s) => s.user?.id ?? '')
  const onboardingComplete = useAuthStore((s) => s.hasCompletedOnboarding)

  const ctx = useMemo(
    () => ({
      userId,
      onboardingComplete,
      completedLessonIds,
    }),
    [userId, onboardingComplete, completedLessonIds]
  )

  const primary = useMemo(
    () => (userId ? resolveHighestPriorityResume(ctx, surface) : null),
    [ctx, surface, userId]
  )

  const alternates = useMemo(
    () => (userId ? resolveAlternateResumes(ctx, surface, 2) : []),
    [ctx, surface, userId]
  )

  const shownRef = useRef<string | null>(null)
  useEffect(() => {
    if (!primary) return
    const key = `${primary.kind}:${primary.continueHref}`
    if (shownRef.current === key) return
    shownRef.current = key
    track(ANALYTICS_EVENTS.resumable_flow_detected, {
      flow_kind: primary.kind,
      surface,
      alternate_count: alternates.length,
    })
    track(ANALYTICS_EVENTS.resume_cta_shown, {
      flow_kind: primary.kind,
      surface,
      alternate_count: alternates.length,
    })
  }, [primary, alternates.length, surface])

  if (!primary) return null

  const when = formatResumeTime(primary.lastUpdatedAt)

  const onContinue = () => {
    playOptInTapSound()
    track(ANALYTICS_EVENTS.resume_cta_clicked, {
      flow_kind: primary.kind,
      surface,
      action: 'continue',
    })
    if (primary.kind === 'schema_lesson') {
      track(ANALYTICS_EVENTS.lesson_resume_started, { surface, lesson_via: 'resume_card' })
    } else if (
      primary.kind === 'writing_simulation' ||
      primary.kind === 'speaking_simulation' ||
      primary.kind === 'listening_practice_exam' ||
      primary.kind === 'reading_practice_exam'
    ) {
      track(ANALYTICS_EVENTS.simulation_resume_started, { surface, flow_kind: primary.kind })
    } else if (primary.kind === 'onboarding') {
      track(ANALYTICS_EVENTS.onboarding_resumed, { surface, via: 'resume_cta' })
    }
    router.push(primary.continueHref)
  }

  const onRestart = () => {
    if (!primary.allowRestart || !primary.restartPayload || !userId) return
    track(ANALYTICS_EVENTS.resume_restarted, {
      flow_kind: primary.kind,
      surface,
    })
    executeResumeRestart(userId, primary.restartPayload)
    router.push(primary.continueHref)
  }

  if (variant === 'hero') {
    return (
      <section
        aria-label="Resume where you left off"
        className={clsx(
          'relative isolate overflow-hidden p-4 sm:p-5 text-white',
          heroShellClass,
          className
        )}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-violet-300/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-primary-900/35 blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-2.5 fc-home-rise">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary-100/90 flex items-center gap-1.5">
            <PlayCircle className="w-3.5 h-3.5 opacity-90" aria-hidden />
            Pick up here
          </p>
          <h2 className="text-[1.35rem] sm:text-[1.65rem] font-bold leading-[1.12] tracking-tight text-white pr-1">
            {primary.title}
          </h2>
          <p className="text-[13px] sm:text-body-sm text-primary-50/90 leading-snug font-normal line-clamp-2">
            {primary.summary}
          </p>
          {when ? <p className="text-[11px] text-primary-100/75">Last saved {when}</p> : null}
          <div className="mt-2 border-t border-white/12 pt-3 flex flex-col sm:flex-row flex-wrap gap-2">
            <button
              type="button"
              className={clsx(heroPrimaryCta, 'w-full sm:w-auto min-h-[54px] px-5')}
              onClick={onContinue}
            >
              Continue now
            </button>
            {primary.allowRestart ? (
              <Button
                type="button"
                variant="ghost"
                className="text-white border border-white/35 hover:bg-white/10 font-medium"
                onClick={onRestart}
              >
                Restart fresh
              </Button>
            ) : null}
          </div>
          {alternates.length > 0 ? (
            <p className="text-[11px] text-primary-100/88 pt-2.5 border-t border-white/12">
              Also waiting:{' '}
              {alternates.map((a) => (
                <button
                  key={`${a.kind}-${a.continueHref}`}
                  type="button"
                  className="font-semibold text-white underline-offset-2 hover:underline mr-2"
                  onClick={() => {
                    track(ANALYTICS_EVENTS.resume_cta_clicked, {
                      flow_kind: a.kind,
                      surface,
                      action: 'continue_alternate',
                    })
                    router.push(a.continueHref)
                  }}
                >
                  {a.title}
                </button>
              ))}
            </p>
          ) : null}
        </div>
      </section>
    )
  }

  return (
    <Card
      variant="outlined"
      padding="sm"
      className={`border-primary-200 bg-gradient-to-br from-primary-50/80 to-surface-elevated ${className ?? ''}`}
    >
      <div className="flex gap-3 items-start">
        <div
          className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0"
          aria-hidden
        >
          <PlayCircle className="w-5 h-5 text-primary-700" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-caption font-semibold text-primary-800 uppercase tracking-wide">
              Pick up where you left off
            </p>
            <p className="text-body-lg font-semibold text-ink-primary mt-0.5 leading-snug">{primary.title}</p>
            <p className="text-body-sm text-ink-secondary mt-1 leading-relaxed">{primary.summary}</p>
            {when ? (
              <p className="text-caption text-ink-tertiary mt-1">Last saved {when}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="primary" onClick={onContinue}>
              Continue
            </Button>
            {primary.allowRestart ? (
              <Button type="button" size="sm" variant="ghost" onClick={onRestart}>
                Restart fresh
              </Button>
            ) : null}
          </div>
          {alternates.length > 0 ? (
            <p className="text-caption text-ink-tertiary pt-1 border-t border-primary-100">
              Also in progress:{' '}
              {alternates.map((a) => (
                <button
                  key={`${a.kind}-${a.continueHref}`}
                  type="button"
                  className="font-medium text-primary-700 hover:underline mr-2"
                  onClick={() => {
                    track(ANALYTICS_EVENTS.resume_cta_clicked, {
                      flow_kind: a.kind,
                      surface,
                      action: 'continue_alternate',
                    })
                    router.push(a.continueHref)
                  }}
                >
                  {a.title}
                </button>
              ))}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
