/**
 * FD-09 — generated daily lesson viewer.
 */

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { GeneratedLessonHeader } from '../components/GeneratedLessonHeader'
import { GeneratedLessonModuleCard } from '../components/GeneratedLessonModuleCard'
import { GeneratedLessonPhraseList } from '../components/GeneratedLessonPhraseList'
import { PremiumDailyLessonGate } from '../components/PremiumDailyLessonGate'
import { dailyLessonService } from '../services/mockServices'
import { usePremiumStore } from '@/store/premiumStore'
import { track } from '@/lib/analytics'
import { getPracticeScenarioHref } from '@/lib/practice/getPracticeScenarioHref'

export function GeneratedLessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const router = useRouter()
  const isPremium = usePremiumStore((s) => s.isPremium)

  const { data: lesson, isLoading, error } = useQuery({
    queryKey: ['daily-lessons', 'lesson', lessonId],
    queryFn: () => (lessonId ? dailyLessonService.getLessonById(lessonId) : Promise.resolve(null)),
    enabled: !!lessonId,
  })

  useEffect(() => {
    if (lesson?.lessonId) track('daily_lesson_opened' as const, { lessonId: lesson.lessonId })
  }, [lesson?.lessonId])

  if (!lessonId) {
    router.push('/app/daily-lessons')
    return null
  }

  if (isLoading) {
    return (
      <div className="px-4 py-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-2/3 mb-4" />
        <div className="h-4 bg-slate-100 rounded w-full mb-2" />
        <div className="h-4 bg-slate-100 rounded w-4/5" />
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-body text-ink-secondary">Lesson not found.</p>
        <button
          type="button"
          onClick={() => router.push('/app/daily-lessons')}
          className="mt-4 text-primary-600 font-medium hover:underline"
        >
          Back to Daily Lessons
        </button>
      </div>
    )
  }

  const showPremiumGate = lesson.premiumRequired && !isPremium

  return (
    <div className="px-4 py-6 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => router.push('/app/daily-lessons')}
          className="p-2 rounded-lg hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 text-ink-secondary"
          aria-label="Back"
        >
          ←
        </button>
      </div>
      <GeneratedLessonHeader lesson={lesson} />

      {showPremiumGate && (
        <div className="mt-6">
          <PremiumDailyLessonGate onUpgrade={() => router.push('/app/premium')} />
        </div>
      )}

      {!showPremiumGate && (
        <>
          {lesson.phrases.length > 0 && (
            <section className="mt-6">
              <GeneratedLessonPhraseList phrases={lesson.phrases} />
            </section>
          )}
          <section className="mt-6">
            <h2 className="text-body-lg font-semibold text-ink-primary mb-3">Practice</h2>
            <div className="space-y-2">
              {lesson.modules.map((mod) => (
                <GeneratedLessonModuleCard
                  key={mod.moduleId}
                  module={mod}
                  lessonId={lesson.lessonId}
                  onPractice={(scenarioId) => {
                    const id = scenarioId ?? ''
                    if (id) router.push(getPracticeScenarioHref(id))
                  }}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
