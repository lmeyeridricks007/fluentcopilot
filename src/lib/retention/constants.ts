/** XP — meaningful actions only */
export const XP_LESSON_COMPLETE = 28
export const XP_REVIEW_DAILY = 16
export const XP_REVIEW_MISTAKE_FIX = 22
export const XP_FIRST_LESSON_BONUS = 12
export const XP_MODULE_COMPLETE = 95
export const XP_STREAK_MILESTONE: Record<number, number> = {
  3: 10,
  7: 25,
  14: 40,
  30: 80,
}
export const XP_REVIEW_PARTIAL = 6
/**
 * @deprecated Pack XP is awarded via progression (`/api/progression/session-complete`).
 * Kept for reference / tooling that still reads the constant name.
 */
export const XP_FROM_YOUR_DAY_PRACTICE = 20

/** Raw Quick Capture: max bonus XP from “meaningful log” per local calendar day (anti-spam). */
export const XP_QUICK_CAPTURE_MEANINGFUL_DAILY_CAP = 5
/** Per capture that passes substance checks (1–2 typical). */
export const XP_QUICK_CAPTURE_MEANINGFUL_CHUNK = 2
/** Scenario conversation (guided / semi / free) — tuned below lesson complete */
export const XP_PRACTICE_SCENARIO_MIN = 10
export const XP_PRACTICE_SCENARIO_MAX = 26
export const XP_SKILL_TRACK_MIN = 6
export const XP_SKILL_TRACK_MAX = 16
/** Same calendar day, same scenario: soft anti-farm for XP */
export const XP_PRACTICE_SAME_DAY_REPEAT_FACTOR = 0.7
export const XP_PRACTICE_SAME_DAY_FLOOR = 8
/** Skill track same day repeat */
export const XP_SKILL_TRACK_SAME_DAY_REPEAT_FACTOR = 0.75
export const XP_SKILL_TRACK_SAME_DAY_FLOOR = 5

/** Review session: minimum cards + min accuracy for “full” XP + streak */
export const REVIEW_MIN_CARDS_FOR_CREDIT = 1
export const REVIEW_STREAK_MIN_CARDS = 3
export const REVIEW_STREAK_MIN_ACCURACY = 0.45

export const STREAK_MILESTONE_DAYS = [3, 7, 14, 30, 60, 100] as const

export const RETENTION_STORAGE_KEY = 'language-tutor-retention-profile-v1'
export const LEADERBOARD_COHORT_KEY = 'language-tutor-retention-leaderboard-cohort-v1'

export const RETENTION_PROFILE_VERSION = 1 as const
