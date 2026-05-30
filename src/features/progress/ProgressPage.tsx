'use client'

import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { MOCK_PROGRESS } from '@/mocks/progress'
import { MOCK_LESSON_PROGRESS } from '@/mocks/lessonProgress'
import { isCurriculumPathUiEnabled } from '@/config/curriculumFeature'
import { CurriculumProgressSummary } from '@/features/curriculum/CurriculumProgressSummary'
import { WeakAreasCard } from '@/features/curriculum/WeakAreasCard'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { MasteryMapSection } from '@/features/progress/MasteryMapSection'
import { useStudyContextStore } from '@/store/studyContextStore'
import { isA2PathCompleteMerged, POST_A2_TRANSITION_HREF } from '@/lib/post-a2'
import { postA2PathwayShortLabel, readPostA2PathwayState } from '@/lib/post-a2-pathways'
import { useProgressDashboardModel } from '@/features/progress/useProgressDashboardModel'
import { ProgressDashboardHeader } from '@/features/progress/ProgressDashboardHeader'

export function ProgressPage() {
  const p = MOCK_PROGRESS
  const { completedLessonIds, profile } = useRetentionProfile()
  const activeStudyLevel = useStudyContextStore((s) => s.activeStudyLevel)
  const showPostA2 =
    activeStudyLevel === 'A2' && isA2PathCompleteMerged(completedLessonIds, MOCK_LESSON_PROGRESS)
  const progressDash = useProgressDashboardModel()
  const readinessHref = showPostA2 ? POST_A2_TRANSITION_HREF : '/app/progress#mastery-map'
  const readinessLabel = showPostA2 ? 'Review or change path →' : 'Explore ability map →'
  const pathwayChoice = readPostA2PathwayState(profile).choice

  return (
    <div className="px-4 py-6 space-y-8">
      <div>
        <h1 className="text-title font-bold text-ink-primary">Progress</h1>
        <p className="text-body-sm text-ink-secondary mt-1">
          Real-life confidence and exam readiness — tied back to what you practice in Talk.
        </p>
        <Link
          href="/app/exam-prep"
          className="inline-block mt-2 text-body-sm font-semibold text-primary-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
        >
          Exam prep hub →
        </Link>
      </div>

      <ProgressDashboardHeader
        model={progressDash}
        readinessDetailsHref={readinessHref}
        readinessDetailsLabel={readinessLabel}
      />

      {showPostA2 ? (
        <Link
          href={POST_A2_TRANSITION_HREF}
          className="flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50/40 px-3 py-3 hover:bg-primary-50/70 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
        >
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-primary-700" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-ink-primary">Next chapter after A2</p>
            <p className="text-caption text-ink-secondary mt-1 leading-snug">
              {pathwayChoice
                ? `Current focus: ${postA2PathwayShortLabel(pathwayChoice)}. Open to compare B1, A2 Mastery, and Exam preparation.`
                : 'Choose B1, A2 Mastery, or Exam preparation — you can switch later.'}
            </p>
            <span className="text-caption font-medium text-primary-700 mt-1 inline-block">Open pathway screen →</span>
          </div>
        </Link>
      ) : null}

      <MasteryMapSection />

      {isCurriculumPathUiEnabled() && (
        <>
          <CurriculumProgressSummary />
          <WeakAreasCard />
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card variant="outlined" padding="md">
          <CardTitle className="text-body">Lessons done</CardTitle>
          <p className="text-display font-bold text-ink-primary mt-1">{completedLessonIds.length}</p>
          <CardDescription>On this device</CardDescription>
        </Card>
        <Card variant="outlined" padding="md">
          <CardTitle className="text-body">This week</CardTitle>
          <p className="text-display font-bold text-ink-primary mt-1">{p.weeklyMinutes} min</p>
          <CardDescription>Study time (demo)</CardDescription>
        </Card>
      </div>
    </div>
  )
}
