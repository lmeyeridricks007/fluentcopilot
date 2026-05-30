'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clock,
  Headphones,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MOCK_LESSONS, MOCK_RECOMMENDED, type Lesson } from '@/mocks/lessons'
import { useEntitlement, UsageIndicator, PaywallModal } from '@/features/entitlements'
import { useProductEntitlements } from '@/features/entitlements/useProductEntitlements'
import { peopleDailySchemaPlayerHref } from '@/demo-data/curriculum/schemaPeopleDailyPath'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { useStudyContextStore } from '@/store/studyContextStore'

const CATEGORIES = ['All', 'Vocabulary', 'Grammar', 'Dialogue', 'Listening', 'Quiz'] as const
const LEVELS = ['All', 'A0', 'A1', 'A2', 'B1', 'B2'] as const

type JobId = 'speaking' | 'listening' | 'grammar' | 'daily' | 'exam' | 'short'

const JOB_ROWS: {
  id: JobId
  label: string
  hint: string
  icon: typeof MessageCircle
}[] = [
  {
    id: 'speaking',
    label: 'Speaking & chats',
    hint: 'Dialogue-style practice',
    icon: MessageCircle,
  },
  {
    id: 'listening',
    label: 'Listening',
    hint: 'Ear training & gist',
    icon: Headphones,
  },
  {
    id: 'grammar',
    label: 'Grammar & patterns',
    hint: 'Structure reps',
    icon: BookOpen,
  },
  {
    id: 'daily',
    label: 'Daily life Dutch',
    hint: 'Shops, health, routines',
    icon: Sparkles,
  },
  {
    id: 'exam',
    label: 'Exam-style skills',
    hint: 'Quiz & listen tasks',
    icon: BookOpen,
  },
  {
    id: 'short',
    label: 'Short sessions',
    hint: 'About 12 min or less',
    icon: Clock,
  },
]

function jobPredicate(id: JobId, l: Lesson): boolean {
  switch (id) {
    case 'speaking':
      return l.type === 'dialogue'
    case 'listening':
      return l.type === 'listening'
    case 'grammar':
      return l.type === 'grammar' || l.type === 'vocabulary'
    case 'daily':
      return /food|shop|doctor|daily|housing|transport|people|social|work|health|plan/i.test(
        `${l.topic} ${l.title} ${l.description}`
      )
    case 'exam':
      return l.type === 'quiz' || l.type === 'listening'
    case 'short':
      return l.durationMinutes <= 12
    default:
      return true
  }
}

const COLLECTIONS: { title: string; hint: string; match: (l: Lesson) => boolean }[] = [
  {
    title: 'Friendly conversations',
    hint: 'Casual Dutch',
    match: (l) => /chat|friend|conversation|social|intro/i.test(`${l.title} ${l.topic}`),
  },
  {
    title: 'Food & shopping',
    hint: 'Errands & cafes',
    match: (l) => /food|shop|bakery|market|grocer/i.test(`${l.title} ${l.topic}`),
  },
  {
    title: 'Plans & routines',
    hint: 'Time & habits',
    match: (l) => /routine|plan|schedule|daily|week/i.test(`${l.title} ${l.topic}`),
  },
  {
    title: 'Health & appointments',
    hint: 'Practical care',
    match: (l) => /doctor|health|pharmacy|appointment|gp/i.test(`${l.title} ${l.topic}`),
  },
]

export function LearnExplorePage() {
  const router = useRouter()
  const activeLevel = useStudyContextStore((s) => s.activeStudyLevel)
  const { isPremiumPlan } = useProductEntitlements()
  const { completedLessonIds } = useRetentionProfile()
  const { canStartLesson, usage, atLessonCap } = useEntitlement()
  const [paywallOpen, setPaywallOpen] = useState(false)

  const [activeJob, setActiveJob] = useState<JobId | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All')
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('All')
  const [showFilters, setShowFilters] = useState(false)

  const recommended = useMemo(() => {
    const pref = MOCK_RECOMMENDED.length > 0 ? MOCK_RECOMMENDED : MOCK_LESSONS
    return pref
      .filter((l) => !completedLessonIds.includes(l.id))
      .slice(0, 5)
  }, [completedLessonIds])

  const stagePicks = useMemo(() => {
    return MOCK_LESSONS.filter(
      (l) => l.level.startsWith(activeLevel) && !completedLessonIds.includes(l.id)
    ).slice(0, 4)
  }, [activeLevel, completedLessonIds])

  const filtered = useMemo(() => {
    return MOCK_LESSONS.filter((l) => {
      if (activeJob && !jobPredicate(activeJob, l)) return false
      const matchSearch =
        !search ||
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.topic.toLowerCase().includes(search.toLowerCase()) ||
        l.description.toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === 'All' || l.type === category.toLowerCase()
      const matchLevel = level === 'All' || l.level.startsWith(level)
      return matchSearch && matchCategory && matchLevel
    })
  }, [activeJob, search, category, level])

  const selectJob = (id: JobId) => {
    setActiveJob((prev) => {
      const next = prev === id ? null : id
      if (next === null) {
        setCategory('All')
      } else if (id === 'speaking') {
        setCategory('Dialogue')
      } else if (id === 'listening') {
        setCategory('Listening')
      } else {
        setCategory('All')
      }
      return next
    })
  }

  const handleLessonClick = (lesson: Lesson) => {
    const locked = lesson.isPremium && !isPremiumPlan
    if (locked) {
      router.push('/app/premium')
      return
    }
    if (!canStartLesson && atLessonCap) {
      setPaywallOpen(true)
      return
    }
    router.push(peopleDailySchemaPlayerHref(lesson.id))
  }

  function FeaturedLessonCard({ lesson }: { lesson: Lesson }) {
    const locked = lesson.isPremium && !isPremiumPlan
    const done = completedLessonIds.includes(lesson.id)
    return (
      <button
        type="button"
        onClick={() => handleLessonClick(lesson)}
        className={clsx(
          'group w-full text-left rounded-2xl border-2 border-primary-200/90 bg-gradient-to-br from-primary-50/95 via-surface-elevated to-primary-50/20',
          'px-4 py-4 min-h-touch shadow-md ring-1 ring-primary-200/45 transition-all duration-200',
          'hover:border-primary-300 hover:shadow-lg active:scale-[0.99]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500',
          locked && 'opacity-90'
        )}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
            <Sparkles className="h-3 w-3" aria-hidden />
            Best next
          </span>
          {done ? (
            <span className="text-[11px] font-semibold text-success">Done</span>
          ) : null}
        </div>
        <p className="mt-2 text-body-lg font-bold text-ink-primary leading-snug">{lesson.title}</p>
        <p className="mt-1 text-caption text-ink-secondary line-clamp-2 leading-relaxed">{lesson.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-tertiary">
          <span className="rounded-md bg-surface-muted/80 px-1.5 py-0.5 font-medium text-ink-secondary">
            {lesson.level}
          </span>
          <span className="tabular-nums">{lesson.durationMinutes} min</span>
        </div>
        <p className="mt-3 text-body-sm font-semibold text-primary-900 flex items-center gap-1">
          Open lesson
          <ChevronRight className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
        </p>
      </button>
    )
  }

  const LessonRow = ({ lesson, compact }: { lesson: Lesson; compact?: boolean }) => {
    const locked = lesson.isPremium && !isPremiumPlan
    const done = completedLessonIds.includes(lesson.id)
    return (
      <button
        type="button"
        onClick={() => handleLessonClick(lesson)}
        className={clsx(
          'group w-full text-left rounded-xl border border-slate-200/90 bg-surface-elevated transition-all duration-150 min-h-touch',
          compact ? 'px-3 py-2.5' : 'px-3.5 py-3',
          'hover:border-slate-300 hover:bg-surface-muted/30 hover:shadow-sm active:scale-[0.99]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500',
          locked && 'opacity-85'
        )}
      >
        <p className={clsx('font-semibold text-ink-primary', compact ? 'text-body-sm' : 'text-body')}>
          {lesson.title}
        </p>
        {!compact ? (
          <p className="text-caption text-ink-secondary mt-0.5 line-clamp-2">{lesson.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-muted text-ink-secondary">
            {lesson.level}
          </span>
          <span className="text-[11px] text-ink-tertiary">{lesson.durationMinutes} min</span>
          {done && !locked ? (
            <span className="text-[11px] font-medium text-success">Done</span>
          ) : null}
        </div>
      </button>
    )
  }

  return (
    <div className="px-4 py-5 space-y-6 pb-24">
      <div className="flex items-center gap-2">
        <Link
          href="/app/learn"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-700 min-h-touch min-w-touch -ml-1 px-1 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Learn
        </Link>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-title font-bold text-ink-primary">Explore</h1>
          <p className="text-caption text-ink-secondary mt-1 leading-relaxed max-w-prose">
            Choose a focus or search when you already know the gap. Day-to-day momentum stays on your{' '}
            <Link href="/app/learn" className="font-medium text-primary-700 underline-offset-2 hover:underline">
              path
            </Link>
            ; keep gains with{' '}
            <Link href="/app/learn?tab=review" className="font-medium text-primary-700 underline-offset-2 hover:underline">
              Review
            </Link>
            .
          </p>
        </div>
        <UsageIndicator variant="lessons" />
      </div>

      <section className="space-y-2">
        <div className="px-0.5 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">Tune the list</p>
          <h2 className="text-body font-semibold text-ink-primary">Pick a focus</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {JOB_ROWS.map(({ id, label, hint, icon: Icon }) => {
            const on = activeJob === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectJob(id)}
                className={clsx(
                  'shrink-0 w-[9.25rem] rounded-xl border px-3 py-3 text-left min-h-touch transition-all',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 active:scale-[0.98]',
                  on
                    ? 'border-primary-400 bg-primary-50/70 shadow-sm ring-1 ring-primary-200/60'
                    : 'border-slate-200 bg-surface-elevated hover:border-slate-300'
                )}
              >
                <Icon className={clsx('w-4 h-4 mb-1.5', on ? 'text-primary-800' : 'text-ink-tertiary')} aria-hidden />
                <p className="text-body-sm font-semibold text-ink-primary leading-snug">{label}</p>
                <p className="text-[11px] text-ink-secondary mt-0.5 leading-snug">{hint}</p>
              </button>
            )
          })}
        </div>
        {activeJob ? (
          <p className="text-caption text-ink-tertiary px-0.5">
            Showing lessons that match this focus. Tap again to clear.
          </p>
        ) : null}
      </section>

      {recommended.length > 0 ? (
        <section className="space-y-3">
          <div className="px-0.5 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-800/85">Curated for you</p>
            <h2 className="text-body font-bold text-ink-primary">Recommended next</h2>
            <p className="text-caption text-ink-secondary leading-snug">
              One strong pick first — then more options below.
            </p>
          </div>
          <FeaturedLessonCard lesson={recommended[0]} />
          {recommended.length > 1 ? (
            <div className="space-y-2">
              <p className="text-caption font-semibold text-ink-tertiary px-0.5">Also worth opening</p>
              <ul className="space-y-2">
                {recommended.slice(1).map((lesson) => (
                  <li key={lesson.id}>
                    <LessonRow lesson={lesson} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {stagePicks.length > 0 ? (
        <section className="space-y-2">
          <div className="px-0.5 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">Matches your stage</p>
            <h2 className="text-body-sm font-semibold text-ink-primary">Good for {activeLevel} right now</h2>
            <p className="text-caption text-ink-secondary">Shortlist aligned to the level you are studying.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {stagePicks.map((lesson) => (
              <div key={lesson.id} className="shrink-0 w-[min(280px,72vw)]">
                <LessonRow lesson={lesson} compact />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="px-0.5 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">More to browse</p>
          <h2 className="text-body-sm font-semibold text-ink-primary">Collections</h2>
        </div>
        {COLLECTIONS.map((col) => {
          const picks = MOCK_LESSONS.filter(col.match).slice(0, 6)
          if (picks.length === 0) return null
          return (
            <div key={col.title} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2 px-0.5">
                <div>
                  <p className="text-body-sm font-medium text-ink-secondary">{col.title}</p>
                  <p className="text-[11px] text-ink-tertiary mt-0.5">{col.hint}</p>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {picks.map((lesson) => (
                  <div key={lesson.id} className="shrink-0 w-[min(260px,70vw)]">
                    <LessonRow lesson={lesson} compact />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </section>

      <section className="space-y-2 rounded-xl border border-slate-200/80 bg-surface-muted/25 px-3 py-3">
        <div className="flex items-center gap-2 text-ink-primary">
          <Search className="w-4 h-4 text-ink-tertiary shrink-0" aria-hidden />
          <h2 className="text-body-sm font-semibold">Looking for something specific?</h2>
        </div>
        <Input
          placeholder="Search title, topic, or phrase..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search lessons"
          className="bg-surface-elevated"
        />
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className="flex w-full items-center justify-center gap-2 min-h-touch rounded-lg border border-slate-200 bg-surface-elevated px-3 py-2 text-body-sm font-medium text-ink-secondary hover:bg-surface-muted/50"
        >
          <SlidersHorizontal className="w-4 h-4" aria-hidden />
          {showFilters ? 'Hide type & level filters' : 'Filter by type & level'}
        </button>
        {showFilters ? (
          <div className="space-y-3 pt-1">
            <div>
              <p className="text-caption font-medium text-ink-tertiary mb-1.5">Type</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={clsx(
                      'min-h-touch px-3 rounded-full text-caption font-medium border transition-colors',
                      category === c
                        ? 'border-primary-500 bg-primary-50 text-primary-800'
                        : 'border-slate-200 bg-surface-elevated text-ink-secondary'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-caption font-medium text-ink-tertiary mb-1.5">Level</p>
              <div className="flex flex-wrap gap-1.5">
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setLevel(lv)}
                    className={clsx(
                      'min-h-touch px-3 rounded-full text-caption font-medium border transition-colors',
                      level === lv
                        ? 'border-primary-500 bg-primary-50 text-primary-800'
                        : 'border-slate-200 bg-surface-elevated text-ink-secondary'
                    )}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <h2 className="text-body-sm font-semibold text-ink-primary">All matching lessons</h2>
          <span className="text-caption text-ink-tertiary tabular-nums">{filtered.length}</span>
        </div>
        {filtered.length === 0 ? (
          <Card variant="outlined" padding="md" className="text-center text-body-sm text-ink-secondary">
            Nothing matches yet — try clearing a focus chip or widening filters.
            {activeJob ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setActiveJob(null)
                  setCategory('All')
                }}
              >
                Clear focus
              </Button>
            ) : null}
          </Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((lesson) => (
              <li key={lesson.id}>
                <LessonRow lesson={lesson} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/app/learn?tab=review"
        className="flex items-center justify-between gap-2 rounded-xl border border-primary-100 bg-primary-50/40 px-3.5 py-3 min-h-touch text-left transition-colors hover:bg-primary-50/70"
      >
        <span>
          <span className="text-body-sm font-semibold text-primary-900">Keep gains with Review</span>
          <span className="block text-caption text-primary-800/85 mt-0.5">
            A light loop after you explore — strengthens what you just touched.
          </span>
        </span>
        <ChevronRight className="w-5 h-5 text-primary-700 shrink-0" aria-hidden />
      </Link>

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        reason="lesson_cap"
        usage={{ used: usage.lessonsToday, limit: usage.lessonsLimit }}
      />
    </div>
  )
}
