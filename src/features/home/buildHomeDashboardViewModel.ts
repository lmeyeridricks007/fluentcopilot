/**
 * Composes Home dashboard from Practice Hub VM + mastery + readiness (pure, testable).
 */
import type { PracticeHubViewModel } from '@/features/practice-hub/types'
import type { AbilityCardVm } from '@/lib/mastery/masteryPresenterModel'
import type { ReadinessEvaluation } from '@/lib/post-a2/types'
import type { NextBestActionVm } from '@/lib/dashboard/nextBestAction'
import type { ConfidenceTrendSummaryVm } from '@/lib/dashboard/confidenceTrendSummary'
import type { HomeDashboardViewModel } from '@/features/home/homeDashboardTypes'
import type { RecommendationVm } from '@/features/practice-hub/types'
import { buildMasterySnapshotRows } from '@/lib/dashboard/masterySnapshot'

function pickFeaturedScenario(recs: RecommendationVm[], nextBestHref: string): RecommendationVm | null {
  for (const r of recs) {
    if (r.href !== nextBestHref) return r
  }
  return null
}

export function buildHomeDashboardViewModel(input: {
  practice: PracticeHubViewModel
  nextBest: NextBestActionVm
  readiness: ReadinessEvaluation
  confidenceTrend: ConfidenceTrendSummaryVm
  masteryFlat: AbilityCardVm[]
  retentionStreak: number
  retentionStreakCaption: string
  totalXp: number
}): HomeDashboardViewModel {
  const { practice, nextBest, readiness, confidenceTrend, masteryFlat, retentionStreak, retentionStreakCaption, totalXp } =
    input

  return {
    nextBest,
    dailyMission: practice.dailyMission,
    weeklyMission: practice.weeklyMission,
    skillFocusMission: practice.skillFocusMission,
    featuredScenario: pickFeaturedScenario(practice.recommendations, nextBest.href),
    weakAreasTop: practice.weakAreas.slice(0, 3),
    readinessB1: readiness,
    confidenceTrend,
    masterySnapshot: buildMasterySnapshotRows(masteryFlat),
    scenarioStreak: practice.scenarioStreak,
    retentionStreak,
    retentionStreakCaption,
    totalXp,
  }
}
