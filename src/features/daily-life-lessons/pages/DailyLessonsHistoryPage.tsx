/**
 * FD-09 — generated lesson history.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { GeneratedLessonHistoryCard } from '../components/GeneratedLessonHistoryCard'
import { dailyLessonService } from '../services/mockServices'
import { track } from '@/lib/analytics'

export function DailyLessonsHistoryPage() {
  const router = useRouter()
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['daily-lessons', 'history'],
    queryFn: () => dailyLessonService.getLessonHistory(),
  })

  useEffect(() => {
    track('daily_lesson_history_opened' as const)
  }, [])

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => router.push('/app/daily-lessons')}
          className="p-2 rounded-lg hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 text-ink-secondary"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-title font-bold text-ink-primary">Lesson history</h1>
      </div>
      {isLoading && (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg" />
          ))}
        </div>
      )}
      {!isLoading && history.length === 0 && (
        <p className="text-body-sm text-ink-secondary py-8 text-center">
          No generated lessons yet. Capture moments and generate your first daily lesson.
        </p>
      )}
      {!isLoading && history.length > 0 && (
        <div className="space-y-2">
          {history.map((item) => (
            <GeneratedLessonHistoryCard
              key={item.lessonId}
              item={item}
              onClick={() => router.push(`/app/daily-lessons/${item.lessonId}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
