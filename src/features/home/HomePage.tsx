'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, BookOpen, ChevronRight, MapPin, Mic, Sparkles, Sun, Trophy } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { MOCK_LESSON_PROGRESS } from '@/mocks/lessonProgress'
import { useStudyContextStore } from '@/store/studyContextStore'
import Link from 'next/link'
import { isA2PathCompleteMerged, POST_A2_TRANSITION_HREF } from '@/lib/post-a2'
import { postA2PathwayHomeBanner, readPostA2PathwayState } from '@/lib/post-a2-pathways'
import { useHomeDashboardViewModel } from '@/features/home/useHomeDashboardViewModel'
import { NextBestActionHero } from '@/features/dashboard'
import { OnboardingEntryHandoff } from '@/features/onboarding/OnboardingEntryHandoff'
import { useProductEntitlements } from '@/features/entitlements/useProductEntitlements'
import { ResumeContinueCard } from '@/features/resume/ResumeContinueCard'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { useRetentionDashboardData } from '@/features/retention/useRetentionDashboardData'
import { RetentionDailyReviewCard } from '@/components/retention/RetentionDailyReviewCard'
import { RetentionFixMistakesCard } from '@/components/retention/RetentionFixMistakesCard'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useLearnerProfileStore } from '@/lib/profile/profileStore'
import { resolveHomeLearnerIntent } from '@/features/home/homeLearnerIntent'
import { optionLabel, TARGET_PATH_OPTIONS } from '@/features/onboarding/onboardingOptions'
import {
  HomeCompactStatusStrip,
  weakHeadlineFromAreas,
} from '@/features/home/components/HomeCompactStatusStrip'
import { HomeExamPrepPromoCard } from '@/features/home/components/HomeExamPrepPromoCard'
import { HomePracticalFocusCard } from '@/features/home/components/HomePracticalFocusCard'
import { HomeLessonPathCard } from '@/features/home/components/HomeLessonPathCard'
import { resolveHighestPriorityResume } from '@/lib/resume'
import { clsx } from 'clsx'
import { tier3KeepGoingRow, tier3ShortcutRow, tier3UtilityListShell, nativePress } from '@/lib/design/cardTiers'
import { consumeTodaysMoveHomePulse } from '@/lib/device/deviceFeedback'

export function HomePage() {
  const [todaysMoveHomePulse, setTodaysMoveHomePulse] = useState(false)
  const router = useRouter()
  const { user, hasCompletedOnboarding } = useAuthStore()
  const profileDoc = useLearnerProfileStore((s) => s.document)
  const { isPremiumPlan } = useProductEntitlements()
  const dashboard = useHomeDashboardViewModel()
  const { profile, abilities, completedLessonIds, streak, totalXp } = useRetentionProfile()
  const activeStudyLevel = useStudyContextStore((s) => s.activeStudyLevel)
  const showPostA2 =
    activeStudyLevel === 'A2' && isA2PathCompleteMerged(completedLessonIds, MOCK_LESSON_PROGRESS)
  const postA2Banner = useMemo(
    () => (showPostA2 ? postA2PathwayHomeBanner(readPostA2PathwayState(profile).choice) : null),
    [showPostA2, profile]
  )

  const intent = resolveHomeLearnerIntent(profileDoc)
  const pathLabel = profileDoc?.selectedPath
    ? optionLabel(TARGET_PATH_OPTIONS, profileDoc.selectedPath)
    : `${activeStudyLevel}`

  const resumeCtx = useMemo(
    () => ({
      userId: user?.id ?? '',
      onboardingComplete: hasCompletedOnboarding,
      completedLessonIds,
    }),
    [user?.id, hasCompletedOnboarding, completedLessonIds]
  )

  const primaryResume = useMemo(
    () => (resumeCtx.userId ? resolveHighestPriorityResume(resumeCtx, 'home') : null),
    [resumeCtx]
  )

  const dashboardKey =
    (profile?.completedLessonIds.length ?? 0) + (profile?.totalXp ?? 0) + (abilities?.length ?? 0)
  const { dailyDueCount, dailyEstMinutes, mistakeSessionCount, fixHint, hasMistakeEvidence } =
    useRetentionDashboardData(dashboardKey)

  const featured = dashboard.featuredScenario
  const practicalTitle = featured?.title ?? null
  const practicalSummary = featured?.reason ?? null
  const practicalHref = featured?.href ?? null

  useEffect(() => {
    if (!showPostA2) return
    track(ANALYTICS_EVENTS.post_a2_home_surface_updated, {
      pathwayChoice: readPostA2PathwayState(profile).choice ?? 'unset',
    })
  }, [showPostA2, profile])

  useEffect(() => {
    if (!consumeTodaysMoveHomePulse()) return
    setTodaysMoveHomePulse(true)
    const id = window.setTimeout(() => setTodaysMoveHomePulse(false), 900)
    return () => window.clearTimeout(id)
  }, [])

  const name = user?.name?.split(' ')[0] ?? 'there'
  const greeting =
    new Date().getHours() < 12
      ? 'Hi'
      : new Date().getHours() < 18
        ? 'Hey'
        : 'Hey'

  const weakLine = weakHeadlineFromAreas(dashboard.weakAreasTop)

  const supportLine = useMemo(() => {
    if (streak >= 7) return 'Strong streak — protect it with one focused rep.'
    if (streak >= 1) return "Today's move keeps the streak — short session counts."
    return "Start your streak: tap today's move below."
  }, [streak])

  return (
    <div className="px-4 py-5 space-y-4 pb-28">
      <OnboardingEntryHandoff expectedRoute="/app/talk" />

      <header className="space-y-2">
        <h1 className="text-title font-bold text-ink-primary tracking-tight text-[1.35rem] sm:text-title leading-tight">
          {greeting}, {name}
        </h1>
        <p className="text-[13px] text-ink-secondary leading-snug max-w-[21rem]">{supportLine}</p>
      </header>

      {showPostA2 && postA2Banner ? (
        <Link
          href={postA2Banner.href}
          onClick={() =>
            track(ANALYTICS_EVENTS.post_a2_banner_clicked, {
              surface: 'home_post_a2_banner',
              href: postA2Banner.href,
            })
          }
          className={clsx(
            'block rounded-2xl border-0 bg-gradient-to-br from-primary-600 via-primary-700 to-slate-900 p-4 text-white shadow-xl shadow-slate-900/25 ring-1 ring-white/10',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
            nativePress
          )}
        >
          <p className="text-[10px] font-bold text-primary-100/90 uppercase tracking-widest">After A2</p>
          <p className="text-body font-bold mt-1 leading-snug">{postA2Banner.title}</p>
          <p className="text-body-sm text-primary-100/85 mt-1.5 line-clamp-2 leading-snug">{postA2Banner.body}</p>
          <span className="inline-flex mt-2.5 text-body-sm font-semibold text-white/95">{postA2Banner.cta} →</span>
        </Link>
      ) : null}

      {showPostA2 && readPostA2PathwayState(profile).choice ? (
        <Link
          href={POST_A2_TRANSITION_HREF}
          className="block text-center text-[11px] font-medium text-primary-700/90 hover:underline -mt-2 touch-manipulation"
        >
          Other paths →
        </Link>
      ) : null}

      <div className="space-y-4 pt-2">
        <HomeCompactStatusStrip
          streak={streak}
          totalXp={totalXp}
          readiness={dashboard.readinessB1}
          weakHeadline={weakLine}
          pathLabel={pathLabel}
        />

        <div
          className={clsx(
            'rounded-2xl transition-shadow',
            todaysMoveHomePulse && 'fc-todays-move-home-pulse'
          )}
        >
          {primaryResume ? (
            <ResumeContinueCard surface="home" completedLessonIds={completedLessonIds} variant="hero" />
          ) : (
            <NextBestActionHero action={dashboard.nextBest} surface="home" />
          )}
        </div>

        <div className="space-y-3">
          {intent === 'exam_focused' ? (
            <>
              <HomeExamPrepPromoCard isPremiumPlan={isPremiumPlan} emphasis="primary" />
              <HomePracticalFocusCard
                featuredTitle={practicalTitle}
                featuredSummary={practicalSummary}
                featuredHref={practicalHref}
              />
            </>
          ) : intent === 'practical_focused' ? (
            <>
              <HomePracticalFocusCard
                featuredTitle={practicalTitle}
                featuredSummary={practicalSummary}
                featuredHref={practicalHref}
              />
              <HomeExamPrepPromoCard isPremiumPlan={isPremiumPlan} emphasis="secondary" />
            </>
          ) : (
            <>
              <HomeLessonPathCard />
              <HomeExamPrepPromoCard isPremiumPlan={isPremiumPlan} emphasis="primary" />
            </>
          )}
        </div>
      </div>

      <section aria-label="Keep going" className="space-y-1.5 pt-1">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-tertiary/90 px-0.5">
          Keep going
        </h2>
        <nav aria-label="Quick actions" className={tier3UtilityListShell}>
          <RetentionDailyReviewCard
            variant="list"
            dueCount={dailyDueCount}
            estMinutes={dailyEstMinutes}
            onStart={() => {
              track(ANALYTICS_EVENTS.review_started, { surface: 'home_daily_review_card' })
              router.push('/app/review/daily')
            }}
          />
          <RetentionFixMistakesCard
            variant="list"
            sessionCount={mistakeSessionCount}
            hint={fixHint}
            hasMistakeEvidence={hasMistakeEvidence}
            onStart={() => router.push('/app/review/mistakes')}
          />
          <button
            type="button"
            className={tier3KeepGoingRow}
            onClick={() => router.push('/app/practice')}
          >
            <div className="w-7 h-7 rounded-lg bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Mic className="w-3.5 h-3.5" aria-hidden />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-semibold text-ink-primary leading-tight">Practice hub</p>
              <p className="text-[10px] text-ink-secondary mt-0.5">All practice in one place</p>
            </div>
            <ChevronRight className="w-[18px] h-[18px] text-slate-400 shrink-0" aria-hidden />
          </button>
        </nav>
      </section>

      <section aria-label="More ways to learn" className="space-y-1.5 pt-0.5 opacity-[0.97]">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-tertiary/70 px-0.5">
          More ways to learn
        </h2>
        <nav aria-label="Extra learning tools" className={tier3UtilityListShell}>
          <button type="button" className={tier3ShortcutRow} onClick={() => router.push('/app/context-prompts/intro')}>
            <div className="w-8 h-8 rounded-lg bg-slate-100/90 flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5 text-slate-500" aria-hidden />
            </div>
            <span className="flex-1 text-[12px] font-medium text-ink-primary/90 text-left">Prompts near you</span>
            <ChevronRight className="w-[16px] h-[16px] text-slate-400 shrink-0" aria-hidden />
          </button>
          <button type="button" className={tier3ShortcutRow} onClick={() => router.push('/app/daily-lessons/intro')}>
            <div className="w-8 h-8 rounded-lg bg-slate-100/90 flex items-center justify-center shrink-0">
              <Sun className="w-3.5 h-3.5 text-slate-500" aria-hidden />
            </div>
            <span className="flex-1 text-[12px] font-medium text-ink-primary/90 text-left">Dutch from your day</span>
            <ChevronRight className="w-[16px] h-[16px] text-slate-400 shrink-0" aria-hidden />
          </button>
          <button type="button" className={tier3ShortcutRow} onClick={() => router.push('/app/reflection')}>
            <div className="w-8 h-8 rounded-lg bg-slate-100/90 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-slate-500" aria-hidden />
            </div>
            <span className="flex-1 text-[12px] font-medium text-ink-primary/90 text-left">Reflection</span>
            <ChevronRight className="w-[16px] h-[16px] text-slate-400 shrink-0" aria-hidden />
          </button>
          <button type="button" className={tier3ShortcutRow} onClick={() => router.push('/app/learn')}>
            <div className="w-8 h-8 rounded-lg bg-slate-100/90 flex items-center justify-center shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-slate-500" aria-hidden />
            </div>
            <span className="flex-1 text-[12px] font-medium text-ink-primary/90 text-left">Open Learn</span>
            <ChevronRight className="w-[16px] h-[16px] text-slate-400 shrink-0" aria-hidden />
          </button>
        </nav>
      </section>

      {abilities.length > 0 ? (
        <div className="flex items-start gap-2 rounded-xl bg-primary-50/35 px-3 py-2 ring-1 ring-primary-200/30">
          <Sparkles className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" aria-hidden />
          <p className="text-[12px] text-ink-primary leading-snug line-clamp-2">
            <span className="font-semibold text-primary-900/90">You’re moving forward · </span>
            {abilities[abilities.length - 1]!.headline}
          </p>
        </div>
      ) : null}

      {!isPremiumPlan ? (
        <Card variant="elevated" className="bg-primary-50/40 border-0 ring-1 ring-primary-200/35 shadow-sm p-4">
          <CardTitle className="text-body">Go Premium</CardTitle>
          <CardDescription className="text-[12px] mt-1 text-ink-secondary">
            Full exam runway, voice coach, richer progress — when you’re ready.
          </CardDescription>
          <div className="flex flex-col gap-2 mt-3">
            <Button className={clsx('w-full min-h-[48px]', nativePress)} onClick={() => router.push('/app/premium')}>
              See Premium
            </Button>
            <Button
              variant="secondary"
              className={clsx('w-full', nativePress)}
              onClick={() => router.push('/pricing')}
            >
              Pricing
            </Button>
          </div>
        </Card>
      ) : null}

      <nav aria-label="Account links" className={tier3UtilityListShell}>
        <button type="button" className={tier3ShortcutRow} onClick={() => router.push('/app/progress')}>
          <div className="w-8 h-8 rounded-lg bg-slate-100/90 flex items-center justify-center shrink-0">
            <BarChart3 className="w-3.5 h-3.5 text-slate-500" aria-hidden />
          </div>
          <span className="flex-1 text-[12px] font-medium text-ink-primary/90 text-left">Progress &amp; abilities</span>
          <ChevronRight className="w-[16px] h-[16px] text-slate-400 shrink-0" aria-hidden />
        </button>
        <button type="button" className={tier3ShortcutRow} onClick={() => router.push('/app/achievements')}>
          <div className="w-8 h-8 rounded-lg bg-slate-100/90 flex items-center justify-center shrink-0">
            <Trophy className="w-3.5 h-3.5 text-slate-500" aria-hidden />
          </div>
          <span className="flex-1 text-[12px] font-medium text-ink-primary/90 text-left">Achievements</span>
          <ChevronRight className="w-[16px] h-[16px] text-slate-400 shrink-0" aria-hidden />
        </button>
      </nav>
    </div>
  )
}
