'use client'

import { useCallback, useLayoutEffect, useMemo } from 'react'
import { clsx } from 'clsx'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Compass, Mic } from 'lucide-react'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { useStudyContextStore } from '@/store/studyContextStore'
import { isA2PathCompleteMerged, POST_A2_TRANSITION_HREF } from '@/lib/post-a2'
import { postA2PathwayHomeBanner, readPostA2PathwayState } from '@/lib/post-a2-pathways'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { usePracticeHubViewModel } from './usePracticeHubViewModel'
import { usePracticeDashboardSummary } from './usePracticeDashboardSummary'
import { MOCK_LESSON_PROGRESS } from '@/mocks/lessonProgress'
import { OnboardingEntryHandoff } from '@/features/onboarding/OnboardingEntryHandoff'
import { useProductEntitlements } from '@/features/entitlements/useProductEntitlements'
import {
  PracticeModeSwitcher,
  type PracticeHubMode,
} from './components/PracticeModeSwitcher'
import { PracticeDoPanel } from './panels/PracticeDoPanel'
import { PracticeImprovePanel } from './panels/PracticeImprovePanel'
import { PracticeExplorePanel } from './panels/PracticeExplorePanel'
import { readPracticeHubMode, writePracticeHubMode } from './practiceHubModeStorage'
import { APP_SPEAK_LIVE } from '@/lib/routing/appRoutes'

export function PracticeHubPage({
  surface = 'talk',
}: {
  /** `talk` = primary daily surface (messaging-first). */
  surface?: 'talk' | 'practice'
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const vm = usePracticeHubViewModel()
  const dash = usePracticeDashboardSummary()
  const { completedLessonIds, streak, totalXp, profile } = useRetentionProfile()
  const activeStudyLevel = useStudyContextStore((s) => s.activeStudyLevel)
  const showPostA2 =
    activeStudyLevel === 'A2' && isA2PathCompleteMerged(completedLessonIds, MOCK_LESSON_PROGRESS)
  const postA2Compass = useMemo(
    () => (showPostA2 ? postA2PathwayHomeBanner(readPostA2PathwayState(profile).choice) : null),
    [showPostA2, profile]
  )
  const readinessDetailsHref = showPostA2 ? POST_A2_TRANSITION_HREF : '/app/coach?tab=progress'
  const readinessDetailsLabel = showPostA2 ? 'Review or change path →' : 'See progress →'
  const retentionCaption =
    streak > 0
      ? `${streak} day learning habit`
      : '0-day streak — one lesson or review session starts it.'
  const { canAccess } = useProductEntitlements()
  const voicePremium = !canAccess('practice_voice_tutor')
  const tracksPremium = !canAccess('practice_skill_tracks')

  const mode: PracticeHubMode = useMemo(() => {
    const m = searchParams.get('mode')
    if (m === 'improve' || m === 'explore') return m
    return 'do'
  }, [searchParams])

  /** Restore last mode when URL has no `mode` (shared links and explicit `mode` still win). */
  useLayoutEffect(() => {
    const q = searchParams.get('mode')
    if (q === 'improve' || q === 'explore' || q === 'do') return
    const stored = readPracticeHubMode()
    if (stored && stored !== 'do') {
      const p = new URLSearchParams(searchParams.toString())
      p.set('mode', stored)
      router.replace(`${pathname}?${p.toString()}`, { scroll: false })
    }
  }, [pathname, router, searchParams])

  const setMode = useCallback(
    (next: PracticeHubMode) => {
      if (next !== mode) {
        track(ANALYTICS_EVENTS.practice_mode_changed, {
          from_mode: mode,
          to_mode: next,
          surface: 'practice_hub',
        })
      }
      writePracticeHubMode(next)
      const p = new URLSearchParams(searchParams.toString())
      if (next === 'do') p.delete('mode')
      else p.set('mode', next)
      const q = p.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [mode, pathname, router, searchParams]
  )

  const exploreHref = `${pathname}?mode=explore`

  const speakLiveSummaryOpen = surface === 'talk' && searchParams.get('speakLiveSummary') === '1'

  const dismissSpeakLiveSummary = useCallback(() => {
    const p = new URLSearchParams(searchParams.toString())
    p.delete('speakLiveSummary')
    const q = p.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  return (
    <div
      className={clsx(
        'px-4 py-6 pb-28 max-w-2xl mx-auto w-full sm:px-6 lg:px-8 lg:py-10',
        surface === 'talk' && 'min-h-[100dvh]',
      )}
    >
      <OnboardingEntryHandoff expectedRoute="/app/talk" />

      {speakLiveSummaryOpen ? (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3.5 backdrop-blur-sm shadow-card">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 ring-1 ring-emerald-100">
            <Mic className="w-5 h-5 text-emerald-700" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink-primary">Welcome back</p>
            <p className="text-[13px] text-ink-secondary mt-1 leading-snug">
              Highlights from Speak Live sit here. Pick up in voice or switch to text when you like.
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              <Link
                href={APP_SPEAK_LIVE}
                className="text-[13px] font-bold text-primary-700 underline-offset-2 hover:underline"
              >
                Speak again
              </Link>
              <button
                type="button"
                onClick={dismissSpeakLiveSummary}
                className="text-[13px] font-semibold text-ink-tertiary hover:text-ink-primary"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <header className="space-y-2 pb-6">
        <h1 className="text-display font-bold tracking-tight text-ink-primary">
          {surface === 'talk' ? 'Talk' : 'Practice'}
        </h1>
        <p className="text-[15px] leading-relaxed text-ink-secondary max-w-[28rem]">
          {surface === 'talk'
            ? 'Practice real conversations in Dutch. One clear next step — then speak, message, or read aloud.'
            : 'Real-life Dutch reps — start in Do, dig into Improve, or browse in Explore.'}
        </p>
        {showPostA2 && postA2Compass ? (
          <Link
            href={postA2Compass.href}
            onClick={() =>
              track(ANALYTICS_EVENTS.post_a2_banner_clicked, {
                surface: 'practice_hub_post_a2',
                href: postA2Compass.href,
              })
            }
            className="mt-3 flex items-start gap-3 rounded-xl border border-primary-200/90 bg-primary-50/50 px-3 py-3 text-left hover:bg-primary-50/80 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          >
            <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4 text-primary-700" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-caption font-semibold text-primary-900">After A2</p>
              <p className="text-body-sm font-semibold text-ink-primary mt-0.5 leading-snug">{postA2Compass.title}</p>
              <p className="text-body-sm text-ink-secondary mt-1 leading-snug">{postA2Compass.body}</p>
              <span className="text-caption font-medium text-primary-700 mt-1 inline-block">{postA2Compass.cta}</span>
            </div>
          </Link>
        ) : null}
        {showPostA2 ? (
          <Link
            href="/app/exam-prep"
            className="mt-2 block text-caption font-medium text-slate-700 hover:text-slate-900 underline-offset-2 hover:underline"
            onClick={() => track(ANALYTICS_EVENTS.exam_prep_entry_clicked, { surface: 'practice_hub_post_a2' })}
          >
            Preparing for your exam? Open structured A2 exam prep
          </Link>
        ) : null}
        {surface !== 'talk' ? <p className="text-caption text-ink-tertiary pt-1">{vm.tierLabel}</p> : null}
      </header>

        <div
          className={clsx(
            'sticky top-[56px] z-20 -mx-4 px-4 py-2.5 mb-5 backdrop-blur-md supports-[backdrop-filter]:backdrop-blur-md border-b sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8',
            surface === 'talk'
              ? 'border-slate-200/60 bg-surface-subtle/90 supports-[backdrop-filter]:bg-surface-subtle/80'
              : 'border-slate-200/70 bg-surface/95 supports-[backdrop-filter]:bg-surface/88',
          )}
        >
        <PracticeModeSwitcher
          value={mode}
          onChange={setMode}
          variant={surface === 'talk' ? 'talk' : 'default'}
          className={surface === 'talk' ? 'mx-auto' : undefined}
        />
      </div>

      {mode === 'do' ? (
        <PracticeDoPanel
          vm={vm}
          dash={dash}
          retentionStreak={streak}
          retentionCaption={retentionCaption}
          totalXp={totalXp}
          exploreHref={exploreHref}
        />
      ) : null}
      {mode === 'improve' ? (
        <PracticeImprovePanel
          vm={vm}
          dash={dash}
          readinessDetailsHref={readinessDetailsHref}
          readinessDetailsLabel={readinessDetailsLabel}
          canAccess={canAccess}
        />
      ) : null}
      {mode === 'explore' ? (
        <PracticeExplorePanel vm={vm} voicePremium={voicePremium} tracksPremium={tracksPremium} />
      ) : null}

      {vm.atScenarioCap ? (
        <p className="text-caption text-center text-ink-secondary px-2 mt-8">
          You’ve hit the free scenario limit for this period.{' '}
          <Link href="/app/premium" className="font-semibold text-primary-700 hover:underline">
            Upgrade
          </Link>{' '}
          for unlimited practice, or come back after the reset.
        </p>
      ) : null}
    </div>
  )
}
