'use client'

/**
 * FD-09 — Daily Lessons hub: today status, activity timeline, capture, generate.
 */

import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Settings, History, Plus } from 'lucide-react'
import { DailyLessonStatusCard } from '../components/DailyLessonStatusCard'
import { DailyLessonActivityTimeline } from '../components/DailyLessonActivityTimeline'
import { GenerationProgressCard } from '../components/GenerationProgressCard'
import { GenerationFailedState } from '../components/GenerationFailedState'
import { InsufficientActivityState } from '../components/InsufficientActivityState'
import { PremiumDailyLessonGate } from '../components/PremiumDailyLessonGate'
import {
  dailyLessonService,
  dailyActivityService,
  dailyLessonGenerationService,
} from '../services/mockServices'
import { useDailyLessonPreferencesStore } from '../store/dailyLessonPreferencesStore'
import { usePremiumStore } from '@/store/premiumStore'
import { track } from '@/lib/analytics'

import { isClientMockEngineAllowed } from '@/lib/api/apiConfig'
import { BackendRequiredScreen } from '@/lib/api/BackendRequiredScreen'

export function DailyLessonsHubPage() {
  if (!isClientMockEngineAllowed()) {
    return (
      <BackendRequiredScreen
        title="Daily lessons coming soon"
        description="Personalized daily lessons will use your FluentCopilot backend once this feature is connected to the API."
        backHref="/app"
        backLabel="Back home"
      />
    )
  }

  return <DailyLessonsHubPageInner />
}

function DailyLessonsHubPageInner() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const enabled = useDailyLessonPreferencesStore((s) => s.enabled)
  const isPremium = usePremiumStore((s) => s.isPremium)

  const { data: summary, isLoading } = useQuery({
    queryKey: ['daily-lessons', 'summary'],
    queryFn: () => dailyLessonService.getTodaySummary(),
  })

  const { data: activities = [] } = useQuery({
    queryKey: ['daily-lessons', 'activities'],
    queryFn: () => dailyActivityService.getTodayActivities(),
  })

  const { data: genStatus } = useQuery({
    queryKey: ['daily-lessons', 'generation-status'],
    queryFn: () => dailyLessonGenerationService.getGenerationStatus(),
    refetchInterval: (q) => (q.state.data?.status === 'generating' ? 500 : false),
  })

  const isGenerating = genStatus?.status === 'generating'
  const generationFailed = genStatus?.status === 'failed'

  const handleCapture = () => {
    track('daily_lesson_manual_capture_started' as const)
    router.push('/app/daily-lessons/capture')
  }

  const handleGenerate = async () => {
    track('daily_lesson_generation_requested' as const)
    try {
      await dailyLessonGenerationService.requestLessonGeneration()
      track('daily_lesson_generation_succeeded' as const)
      queryClient.invalidateQueries({ queryKey: ['daily-lessons'] })
    } catch {
      track('daily_lesson_generation_failed' as const)
      queryClient.invalidateQueries({ queryKey: ['daily-lessons', 'generation-status'] })
    }
  }

  const handleOpenLesson = () => {
    if (summary?.todayLesson) {
      track('daily_lesson_opened' as const, { lessonId: summary.todayLesson.lessonId })
      router.push(`/app/daily-lessons/${summary.todayLesson.lessonId}`)
    }
  }

  const handleRemoveEvent = async (eventId: string) => {
    await dailyActivityService.removeActivityEvent(eventId)
    queryClient.invalidateQueries({ queryKey: ['daily-lessons'] })
  }

  if (!enabled) {
    return (
      <div className="px-4 py-6">
        <p className="text-body text-ink-secondary mb-4">Daily Life Lessons are disabled. Enable them in settings.</p>
        <button
          type="button"
          onClick={() => router.push('/app/daily-lessons/settings')}
          className="text-primary-600 font-medium hover:underline"
        >
          Open settings
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-title font-bold text-ink-primary">Daily Lessons</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/app/daily-lessons/history')}
            className="p-2 rounded-lg hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
            aria-label="History"
          >
            <History className="w-5 h-5 text-ink-secondary" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => router.push('/app/daily-lessons/settings')}
            className="p-2 rounded-lg hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-ink-secondary" aria-hidden />
          </button>
        </div>
      </div>

      {!isPremium && <PremiumDailyLessonGate onUpgrade={() => router.push('/app/premium')} />}

      {isLoading && (
        <div className="animate-pulse space-y-3">
          <div className="h-24 bg-slate-200 rounded-lg" />
          <div className="h-32 bg-slate-100 rounded-lg" />
        </div>
      )}

      {!isLoading && summary && (
        <>
          {isGenerating && <GenerationProgressCard eventCount={activities.length} />}
          {generationFailed && (
            <GenerationFailedState
              onRetry={() => {
                dailyLessonGenerationService.setMockStatus({ status: 'idle' })
                queryClient.invalidateQueries({ queryKey: ['daily-lessons'] })
              }}
            />
          )}
          {!isGenerating && !generationFailed && (
            <>
              <DailyLessonStatusCard
                summary={summary}
                onCapture={handleCapture}
                onGenerate={handleGenerate}
                onOpenLesson={handleOpenLesson}
                isGenerating={false}
                premiumRequired={summary.todayLesson?.premiumRequired && !isPremium}
                onUpgrade={!isPremium ? () => router.push('/app/premium') : undefined}
              />
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-body-lg font-semibold text-ink-primary">Today&apos;s activity</h2>
                  <button
                    type="button"
                    onClick={handleCapture}
                    className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
                  >
                    <Plus className="w-4 h-4" aria-hidden /> Add
                  </button>
                </div>
                {activities.length === 0 ? (
                  <InsufficientActivityState onCapture={handleCapture} />
                ) : (
                  <DailyLessonActivityTimeline events={activities} onRemove={handleRemoveEvent} />
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
