/**
 * Learner retention profile — habit, XP, abilities, milestones (client persistence; server-ready shape).
 */

export type RetentionActivityType = 'lesson_complete' | 'review_daily' | 'review_mistake_fix'

export type XpReason =
  | 'lesson_complete'
  | 'review_daily'
  | 'review_mistake_fix'
  | 'streak_milestone'
  | 'module_complete'
  | 'first_lesson_bonus'
  | 'checkpoint_bonus'
  | 'practice_scenario_complete'
  | 'skill_track_session'
  | 'daily_mission_complete'
  | 'weekly_mission_complete'
  | 'skill_mission_complete'
  /** Exam prep — integrated with main ledger & weekly XP */
  | 'exam_prep_session'
  | 'exam_prep_improvement_bonus'
  | 'exam_prep_milestone_bonus'
  /** Personalized practice built from Quick Capture (“From your day”) */
  | 'from_your_day_practice'
  /** Optional tiny XP for a substantive Quick Capture log — capped daily, never affects streak. */
  | 'quick_capture_meaningful'

export interface XpLedgerEntry {
  id: string
  at: string
  amount: number
  reason: XpReason
  ref?: string
}

export interface StreakState {
  current: number
  longest: number
  /** Last calendar day (local) that counted toward streak */
  lastActiveLocalDate: string | null
}

export interface AbilityUnlock {
  id: string
  moduleId: string
  headline: string
  unlockedAt: string
}

export interface MilestoneState {
  seenIds: string[]
}

export interface LeaderboardLocalState {
  /** ISO week key e.g. 2025-W13 */
  weekKey: string
  /** XP earned this week (this device) */
  weeklyXp: number
}

export interface RetentionProfile {
  version: 1
  userId: string
  streak: StreakState
  totalXp: number
  ledger: XpLedgerEntry[]
  completedLessonIds: string[]
  /** Modules that have already triggered the one-time module-completion XP bonus */
  completedModuleIds: string[]
  abilities: AbilityUnlock[]
  milestones: MilestoneState
  leaderboard: LeaderboardLocalState
  metadata: Record<string, unknown>
}

export interface MilestoneHit {
  id: string
  title: string
  body: string
  bonusXp?: number
}

export interface RecordLessonCompleteInput {
  lessonId: string
  moduleId: string
  lessonTitle: string
}

export interface RecordReviewCompleteInput {
  mode: 'daily' | 'mistake_fix'
  correct: number
  wrong: number
  total: number
}

export type RetentionAnalyticsPayload = {
  event: string
  properties?: Record<string, unknown>
}
