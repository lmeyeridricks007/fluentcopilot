/**
 * Progression domain — streaks, XP, daily rollups, session summaries, and suggestion engine state.
 * Persistence is intentionally decoupled; see `../repositories/progressRepositoryInterfaces`.
 */

/** Activity kinds counted toward a calendar day (daily rollup / streak inputs). */
export type ProgressDailyActivityKind =
  | 'scenario'
  | 'coach'
  | 'read_aloud'
  | 'listening'
  | 'training_loop'

/** Session modality for stored session summaries. */
export type ProgressSessionKind = 'scenario' | 'coach' | 'read_aloud' | 'listening' | 'chat'

/** Aggregate XP, streak, and recency for a user (one row or document per user). */
export type UserProgress = {
  userId: string
  totalXP: number
  weeklyXP: number
  currentStreak: number
  longestStreak: number
  /** Calendar day the user was last considered active for streak/XP logic (YYYY-MM-DD or full ISO). */
  lastActiveDate: string
  /** When a streak grace token was last consumed, if any (ISO timestamp). */
  streakGraceUsedAt?: string
  /** Optional gamified level; reserved for future UX. */
  level?: number
}

/** Per-user, per-calendar-day practice rollup. */
export type DailyActivity = {
  userId: string
  /** Calendar bucket id, always `YYYY-MM-DD`. */
  date: string
  completedUnits: number
  xpEarned: number
  /** Whether this day has already advanced the streak to avoid double counting. */
  streakCounted: boolean
  activityTypes: ProgressDailyActivityKind[]
}

/** Immutable-ish record of a completed (or abandoned) learning session for analytics and XP audit. */
export type SessionSummary = {
  sessionId: string
  userId: string
  type: ProgressSessionKind
  durationSeconds: number
  completed: boolean
  turns?: number
  improvements?: string[]
  weaknessesTargeted?: string[]
  xpAwarded: number
  createdAt: string
}

/** Latest suggestion / training-loop pointers for de-duplication and continuity. */
export type SuggestionState = {
  userId: string
  lastSuggestionId?: string
  lastSuggestionType?: string
  activeTrainingLoopId?: string
  lastGeneratedAt: string
}
