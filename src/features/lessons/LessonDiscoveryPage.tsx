import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, Lock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { MOCK_LESSONS } from '@/mocks/lessons'
import { useEntitlement, UsageIndicator, PaywallModal } from '@/features/entitlements'
import { useProductEntitlements } from '@/features/entitlements/useProductEntitlements'
import { isCurriculumPathUiEnabled } from '@/config/curriculumFeature'
import { CurriculumPathPanel } from '@/features/curriculum/CurriculumPathPanel'
import { CurriculumReviewPanel } from '@/features/curriculum/CurriculumReviewPanel'
import { peopleDailySchemaPlayerHref } from '@/demo-data/curriculum/schemaPeopleDailyPath'
import { OnboardingEntryHandoff } from '@/features/onboarding/OnboardingEntryHandoff'
import { ResumeContinueCard } from '@/features/resume/ResumeContinueCard'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { readPendingOnboardingHandoff } from '@/lib/onboarding-routing'
import { LearnModeSwitcher } from '@/features/learning-path/components/LearnModeSwitcher'

const CATEGORIES = ['All', 'Vocabulary', 'Grammar', 'Dialogue', 'Listening', 'Quiz']
const LEVELS = ['All', 'A0', 'A1', 'A2', 'B1', 'B2']

type LearnTab = 'path' | 'review'

export function LessonDiscoveryPage({
  variant = 'default',
  embedded = false,
}: {
  /** Library tab — activation-first framing and onboarding route. */
  variant?: 'default' | 'library'
  /** Hide duplicate hero when nested under Library > Lessons. */
  embedded?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const curriculumOn = isCurriculumPathUiEnabled()
  const tabFromUrl = searchParams.get('tab') === 'review' ? 'review' : 'path'
  const [tab, setTab] = useState<LearnTab>(curriculumOn ? tabFromUrl : 'path')

  /** Legacy ?tab=browse → Explore route (not a top-level Learn mode). */
  useEffect(() => {
    if (searchParams.get('tab') === 'browse') {
      router.replace('/app/learn/explore', { scroll: false })
    }
  }, [searchParams, router])

  useEffect(() => {
    if (!curriculumOn) return
    setTab(searchParams.get('tab') === 'review' ? 'review' : 'path')
  }, [searchParams, curriculumOn])

  /** After onboarding, land on Path when curriculum path UI is enabled. */
  useEffect(() => {
    if (!curriculumOn) return
    const h = readPendingOnboardingHandoff(variant === 'library' ? '/app/library' : '/app/learn')
    if (!h || (h.pathwayKey !== 'a2_curriculum' && h.pathwayKey !== 'fallback_learn')) return
    setTab('path')
    router.replace(variant === 'library' ? '/app/library' : '/app/learn', { scroll: false })
  }, [curriculumOn, router, variant])

  const learnBase = variant === 'library' ? '/app/library' : '/app/learn'
  const setLearnTab = (next: LearnTab) => {
    setTab(next)
    if (curriculumOn) {
      router.replace(next === 'review' ? `${learnBase}?tab=review` : learnBase, { scroll: false })
    }
  }

  const { isPremiumPlan } = useProductEntitlements()
  const { completedLessonIds } = useRetentionProfile()
  const { canStartLesson, usage, atLessonCap } = useEntitlement()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [level, setLevel] = useState('All')
  const [paywallOpen, setPaywallOpen] = useState(false)

  const handleLessonClick = (lesson: (typeof MOCK_LESSONS)[0]) => {
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

  const filtered = MOCK_LESSONS.filter((l) => {
    const matchSearch =
      !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.topic.toLowerCase().includes(search.toLowerCase())
    const matchCategory = category === 'All' || l.type === category.toLowerCase()
    const matchLevel = level === 'All' || l.level.startsWith(level)
    return matchSearch && matchCategory && matchLevel
  })

  const onboardingRoute = variant === 'library' ? '/app/library' : '/app/learn'
  const heroTitle = variant === 'library' ? 'Library' : 'Learn'

  if (!curriculumOn) {
    return (
      <div className="px-4 py-5 space-y-5">
        <OnboardingEntryHandoff expectedRoute={onboardingRoute} />
        <ResumeContinueCard surface="learn" completedLessonIds={completedLessonIds} />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-title font-bold text-ink-primary">{heroTitle}</h1>
          <UsageIndicator variant="lessons" />
        </div>
        <p className="text-caption text-ink-secondary">
          Path view is off in this build — open{' '}
          <button
            type="button"
            className="font-medium text-primary-700 underline underline-offset-2"
            onClick={() => router.push('/app/learn/explore')}
          >
            Explore
          </button>{' '}
          for curated lessons, or use search below.
        </p>
        <Input
          placeholder="Search lessons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search lessons"
        />
        <div>
          <p className="text-body-sm font-medium text-ink-secondary mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`min-h-touch px-4 rounded-full text-body-sm font-medium border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 ${
                  category === c ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 bg-surface-elevated'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-body-sm font-medium text-ink-secondary mb-2">Level</p>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className={`min-h-touch px-4 rounded-full text-body-sm font-medium border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 ${
                  level === l ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 bg-surface-elevated'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-body-sm text-ink-secondary py-8 text-center">No lessons match your filters.</p>
          ) : (
            filtered.map((lesson) => {
              const locked = lesson.isPremium && !isPremiumPlan
              const isCompleted = completedLessonIds.includes(lesson.id)
              return (
                <Card
                  key={lesson.id}
                  variant="outlined"
                  padding="md"
                  className={`cursor-pointer transition-colors ${locked ? 'opacity-90' : 'hover:bg-surface-muted'}`}
                  onClick={() => handleLessonClick(lesson)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0 relative">
                      <BookOpen className="w-5 h-5 text-primary-600" aria-hidden />
                      {locked && (
                        <span
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center"
                          aria-hidden
                        >
                          <Lock className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-ink-primary">{lesson.title}</h3>
                      <p className="text-body-sm text-ink-secondary mt-0.5">{lesson.description}</p>
                      <div className="flex gap-2 mt-2 flex-wrap items-center">
                        <span className="text-caption px-2 py-0.5 rounded bg-surface-muted text-ink-secondary">
                          {lesson.level}
                        </span>
                        <span className="text-caption text-ink-tertiary">{lesson.durationMinutes} min</span>
                        {locked && <span className="text-caption text-primary-600 font-medium">Premium</span>}
                        {isCompleted && !locked && (
                          <span className="text-caption text-success font-medium">Done</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
        <PaywallModal
          open={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          reason="lesson_cap"
          usage={{ used: usage.lessonsToday, limit: usage.lessonsLimit }}
        />
      </div>
    )
  }

  return (
    <div className={embedded ? 'space-y-5' : 'px-4 py-5 space-y-5'}>
      <OnboardingEntryHandoff expectedRoute={onboardingRoute} />
      <ResumeContinueCard surface="learn" completedLessonIds={completedLessonIds} />
      {embedded ? (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <UsageIndicator variant="lessons" />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-title font-bold text-ink-primary">{heroTitle}</h1>
          <UsageIndicator variant="lessons" />
        </div>
      )}

      <LearnModeSwitcher value={tab} onChange={setLearnTab} className="w-full sm:max-w-xs" />

      {tab === 'path' ? <CurriculumPathPanel /> : <CurriculumReviewPanel />}
    </div>
  )
}
