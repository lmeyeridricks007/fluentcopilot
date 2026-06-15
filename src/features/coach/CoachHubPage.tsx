'use client'

import { useCallback, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, ClipboardList, Mic, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { CurriculumReviewPanel } from '@/features/curriculum/CurriculumReviewPanel'
import { ProgressPage } from '@/features/progress/ProgressPage'
import { NextBestActionHero } from '@/features/dashboard'
import { usePracticeHubViewModel } from '@/features/practice-hub/usePracticeHubViewModel'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { buildNextBestAction } from '@/lib/dashboard/nextBestAction'
import { MOCK_RECOMMENDED } from '@/mocks/lessons'
import { MOCK_LESSON_PROGRESS } from '@/mocks/lessonProgress'
import { peopleDailySchemaPlayerHref } from '@/demo-data/curriculum/schemaPeopleDailyPath'
import { isA2PathCompleteMerged } from '@/lib/post-a2'
import { readPostA2PathwayState } from '@/lib/post-a2-pathways'
import { useStudyContextStore } from '@/store/studyContextStore'
import { resolveUserLearningState } from '@/lib/product/userLearningState'
import { loadWeakTags } from '@/features/curriculum/a2ReviewStore'
import { APP_EXAM_SYSTEM, APP_SPEAK_LIVE, APP_TALK_HUB } from '@/lib/routing/appRoutes'
import { buildCoachMicroWinsDisplay } from '@/lib/product/buildCoachMicroWins'
import { usePersonalLibraryStore } from '@/store/personalLibraryStore'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import { useFeature1ConversationStore } from '@/features/feature1-chat/store/conversationStore'
import { playAppSound } from '@/lib/interaction/appSounds'
import { CoachDailyRecapCard } from '@/features/coach/CoachDailyRecapCard'
import { CoachReminderCard } from '@/features/coach/CoachReminderCard'
import type { ConversationThread } from '@/features/feature1-chat/types'

type CoachTab = 'today' | 'review' | 'progress'

const TABS: { id: CoachTab; label: string; description: string }[] = [
  { id: 'today', label: 'Today', description: 'Insight & next step' },
  { id: 'review', label: 'Review', description: 'Queues & fixes' },
  { id: 'progress', label: 'Progress', description: 'Abilities & momentum' },
]

const EMPTY_TRAIN_THREADS: ConversationThread[] = []

export function CoachHubPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const practice = usePracticeHubViewModel()
  const { streak, totalXp, profile, completedLessonIds } = useRetentionProfile()
  const activeStudyLevel = useStudyContextStore((s) => s.activeStudyLevel)

  const tab: CoachTab = useMemo(() => {
    const t = searchParams.get('tab')
    if (t === 'review' || t === 'progress') return t
    return 'today'
  }, [searchParams])

  const setTab = useCallback(
    (next: CoachTab) => {
      playAppSound('nav_tab')
      const p = new URLSearchParams(searchParams.toString())
      if (next === 'today') p.delete('tab')
      else p.set('tab', next)
      const q = p.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const postA2Eligible =
    activeStudyLevel === 'A2' && isA2PathCompleteMerged(completedLessonIds, MOCK_LESSON_PROGRESS)
  const pathwayChoice = readPostA2PathwayState(profile).choice

  const nextBest = useMemo(() => {
    const lesson = MOCK_RECOMMENDED[0]
    const lessonFallback = lesson
      ? { title: lesson.title, href: peopleDailySchemaPlayerHref(lesson.id) }
      : null
    return buildNextBestAction({
      practice,
      lessonFallback,
      postA2PathwayFocus: postA2Eligible ? pathwayChoice : undefined,
    })
  }, [practice, postA2Eligible, pathwayChoice])

  const weakRows = loadWeakTags()
  const stateVm = resolveUserLearningState({
    streakDays: streak,
    totalXp,
    weakAreaCount: practice.weakAreas.length + weakRows.length,
    examFocus: false,
  })

  const userId = useAuthStore((s) => s.user?.id ?? LOCAL_ANONYMOUS_LEARNER_ID)
  const libraryWords = usePersonalLibraryStore((s) => s.words)
  const libraryPhrases = usePersonalLibraryStore((s) => s.phrases)
  const trainThreads = useFeature1ConversationStore((s) => s.byUserId[userId]?.threads ?? EMPTY_TRAIN_THREADS)

  const microWins = useMemo(
    () =>
      buildCoachMicroWinsDisplay({
        trainThreads,
        words: libraryWords,
        phrases: libraryPhrases,
      }),
    [trainThreads, libraryWords, libraryPhrases],
  )

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto w-full space-y-6">
      <header className="space-y-2">
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Coach</h1>
        <p className="text-body-sm text-ink-secondary leading-snug">
          Your coach remembers what happened — slips, wins, and the next best move back into Talk.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href={APP_SPEAK_LIVE}
            onClick={() => playAppSound('tap')}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white px-2.5 py-1 text-caption font-semibold text-primary-900 hover:bg-primary-50/80 transition-colors"
          >
            <Mic className="w-3.5 h-3.5 shrink-0" aria-hidden />
            Speak Live
          </Link>
          <span className="inline-flex items-center rounded-full bg-primary-100/80 px-2.5 py-1 text-caption font-semibold text-primary-900">
            {stateVm.label}
          </span>
          <span className="text-caption text-ink-tertiary">{stateVm.toneHint}</span>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Coach sections"
        className="flex rounded-full border border-slate-200/90 bg-surface-muted/80 p-0.5 w-full"
      >
        {TABS.map(({ id, label }) => {
          const selected = tab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(id)}
              className={clsx(
                'relative flex-1 min-h-touch rounded-full px-2 text-center text-body-sm font-semibold transition-colors',
                selected ? 'text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'
              )}
            >
              {selected ? (
                <span
                  className="absolute inset-0 rounded-full bg-surface-elevated shadow-sm border border-slate-200/60"
                  aria-hidden
                />
              ) : null}
              <span className="relative z-[1]">{label}</span>
            </button>
          )
        })}
      </div>

      {tab === 'today' ? (
        <div className="space-y-5">
          <NextBestActionHero action={nextBest} surface="coach_hub" />

          <section className="rounded-2xl border border-slate-200/90 bg-surface-elevated p-4 shadow-sm">
            <div className="flex items-center gap-2 text-caption font-semibold text-ink-secondary uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-primary-600" aria-hidden />
              Micro-wins
            </div>
            <p className="text-caption text-ink-tertiary mt-1 mb-3">
              Concrete wins from real practice — not empty badges. Word matches use your recent Train-station (text)
              turns plus your Library.
            </p>
            <ul className="space-y-2">
              {microWins.map((w) => (
                <li
                  key={w.id}
                  className="rounded-xl border border-slate-100 bg-surface-muted/40 px-3 py-2.5 motion-safe:transition-transform motion-safe:hover:scale-[1.01]"
                >
                  <p className="text-body-sm font-semibold text-ink-primary">{w.title}</p>
                  <p className="text-caption text-ink-secondary mt-0.5 leading-snug">{w.body}</p>
                  {w.mentions?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Spotted in your practice">
                      {w.mentions.map((m) => (
                        <span
                          key={`${w.id}-${m}`}
                          className="max-w-full truncate rounded-full border border-primary-200/90 bg-primary-50/90 px-2.5 py-0.5 text-[11px] font-semibold text-primary-950"
                          title={m}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <CoachDailyRecapCard />
          <CoachReminderCard />

          <div className="grid gap-3">
            <Link
              href={APP_TALK_HUB}
              className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-surface-elevated px-4 py-3.5 hover:border-primary-200 transition-colors"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-800">
                <BookOpen className="w-5 h-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-ink-primary">Continue in Talk</p>
                <p className="text-caption text-ink-secondary">Pick up the thread or start a new scenario.</p>
              </div>
            </Link>
            <Link
              href={APP_EXAM_SYSTEM}
              className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-surface-elevated px-4 py-3.5 hover:border-primary-200 transition-colors"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                <ClipboardList className="w-5 h-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-ink-primary">Exam impact</p>
                <p className="text-caption text-ink-secondary">
                  See how weak spots map to A2 / B1 tasks — then practice the fix in Talk.
                </p>
              </div>
            </Link>
          </div>
        </div>
      ) : null}

      {tab === 'review' ? (
        <div className="space-y-3">
          <p className="text-body-sm text-ink-secondary leading-snug">
            Daily review, fix mistakes, and due items — tight loops, not walls of text.
          </p>
          <CurriculumReviewPanel />
        </div>
      ) : null}

      {tab === 'progress' ? (
        <div className="-mx-1">
          <ProgressPage />
        </div>
      ) : null}
    </div>
  )
}
