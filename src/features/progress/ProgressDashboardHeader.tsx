'use client'

import {
  ReadinessB1MiniCard,
  ConfidenceTrendMiniCard,
  PracticeHabitStrip,
} from '@/features/dashboard'
import type { ProgressDashboardModel } from '@/features/progress/useProgressDashboardModel'
import { useProductEntitlements } from '@/features/entitlements/useProductEntitlements'

export function ProgressDashboardHeader({
  model,
  readinessDetailsHref,
  readinessDetailsLabel,
}: {
  model: ProgressDashboardModel
  readinessDetailsHref: string
  readinessDetailsLabel?: string
}) {
  const { canAccess } = useProductEntitlements()
  return (
    <section aria-label="Practice and mastery overview" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ReadinessB1MiniCard
          readiness={model.readiness}
          detailsHref={readinessDetailsHref}
          detailsLabel={readinessDetailsLabel}
          insightLocked={!canAccess('insights_readiness_detail')}
        />
        <ConfidenceTrendMiniCard summary={model.confidenceTrend} />
      </div>
      <PracticeHabitStrip
        retentionStreak={model.retentionStreak}
        retentionCaption={model.retentionStreakCaption}
        totalXp={model.totalXp}
        scenarioStreak={model.scenarioStreak}
      />
    </section>
  )
}
