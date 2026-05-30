/**
 * View-model types for Practice Hub (presentation layer; not Zod content schemas).
 */

import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'

export type HubScenarioMode = PracticeConversationMode | 'speaking_focus' | 'listening_focus'

export interface ContinuePracticeItem {
  scenarioId: string
  title: string
  summary: string
  mode: HubScenarioMode
  estimatedMinutes: number
  href: string
  /** Human-readable “last active” from persisted continue state */
  lastActiveLabel?: string
  /** Premium-only depth */
  premiumDepth?: boolean
}

export interface DailyMissionVm {
  id: string
  /** Card eyebrow — daily / weekly / skill focus */
  scopeLabel?: string
  title: string
  description: string
  /** Short “why this mission” line when personalized */
  rationale?: string
  progressCurrent: number
  progressTarget: number
  xpReward: number
  countsForStreak: boolean
  ctaLabel: string
  href: string
  completed?: boolean
}

export type WeeklyMissionVm = DailyMissionVm

export type SkillFocusMissionVm = DailyMissionVm

export interface ScenarioStreakVm {
  consecutiveDays: number
  scenariosThisWeek: number
  longestConsecutive: number
  title: string
  description: string
  href: string
  ctaLabel: string
}

export interface RecommendationVm {
  id: string
  scenarioId: string
  title: string
  reason: string
  level: string
  mode: HubScenarioMode
  estimatedMinutes: number
  href: string
  premium?: boolean
  /** Hub card meta row: scenario mode vs skill track */
  practiceKind?: 'scenario' | 'skill_track'
}

export type WeakAreaActionVm = {
  id: string
  kind: 'scenario' | 'skill_track' | 'review'
  label: string
  href: string
  estimatedMinutes?: number
}

export interface WeakAreaVm {
  id: string
  /** Short title — often same as headline from weakness model */
  label: string
  /** Optional coach-style headline (weakness-driven) */
  headline?: string
  whyItMatters: string
  /** Plain-language “why we think this” */
  basedOn?: string
  ctaLabel: string
  href: string
  trend?: 'up' | 'down' | 'stable'
  /** Human-readable momentum from weakness trend (heuristic) */
  trendProgressLabel?: string
  /** Scenario titles where this shows up */
  seenInLabel?: string
  /** Short “best next” line */
  bestNextHint?: string
  /** Targeted next steps (scenario, track, review) */
  actions?: WeakAreaActionVm[]
}

export interface ScenarioCategoryVm {
  id: string
  title: string
  description: string
  icon: string
  scenarioCount: number
  href: string
  levelsHint?: string
}

export interface SkillTrackVm {
  id: string
  title: string
  description: string
  icon: string
  href: string
  premium?: boolean
}

export interface ConfidenceStrengthVm {
  label: string
}

export interface ConfidenceGapVm {
  label: string
}

export interface ConfidenceSectionVm {
  headline: string
  subline: string
  strengths: ConfidenceStrengthVm[]
  gaps: ConfidenceGapVm[]
  ctaLabel: string
  ctaHref: string
}

export interface PracticeHubStreakSnapshot {
  streak: number
  totalXp: number
}

export interface PracticeHubWeaknessCoachHintVm {
  headline: string
  subline: string
  href: string
  ctaLabel: string
}

export interface PracticeHubViewModel {
  continueItem: ContinuePracticeItem | null
  /** When no continue, show this primary CTA */
  fallbackPrimary: ContinuePracticeItem | null
  dailyMission: DailyMissionVm
  weeklyMission: WeeklyMissionVm | null
  skillFocusMission: SkillFocusMissionVm | null
  scenarioStreak: ScenarioStreakVm
  /** Top weakness-driven nudge (optional) */
  weaknessCoachHint: PracticeHubWeaknessCoachHintVm | null
  recommendations: RecommendationVm[]
  weakAreas: WeakAreaVm[]
  categories: ScenarioCategoryVm[]
  skillTracks: SkillTrackVm[]
  confidence: ConfidenceSectionVm
  streakSnapshot: PracticeHubStreakSnapshot
  tierLabel: string
  atScenarioCap: boolean
}
