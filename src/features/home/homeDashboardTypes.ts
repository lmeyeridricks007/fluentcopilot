import type { ReadinessEvaluation } from '@/lib/post-a2/types'
import type { NextBestActionVm } from '@/lib/dashboard/nextBestAction'
import type { ConfidenceTrendSummaryVm } from '@/lib/dashboard/confidenceTrendSummary'
import type {
  DailyMissionVm,
  RecommendationVm,
  WeakAreaVm,
  ScenarioStreakVm,
} from '@/features/practice-hub/types'
import type { MasterySnapshotRowVm } from '@/lib/dashboard/dashboardTypes'

export type { MasterySnapshotRowVm }

export type HomeDashboardViewModel = {
  nextBest: NextBestActionVm
  dailyMission: DailyMissionVm
  weeklyMission: DailyMissionVm | null
  skillFocusMission: DailyMissionVm | null
  /** Top scenario/track rec that isn’t the same link as next best */
  featuredScenario: RecommendationVm | null
  weakAreasTop: WeakAreaVm[]
  readinessB1: ReadinessEvaluation
  confidenceTrend: ConfidenceTrendSummaryVm
  masterySnapshot: MasterySnapshotRowVm[]
  scenarioStreak: ScenarioStreakVm
  retentionStreak: number
  retentionStreakCaption: string
  totalXp: number
}
