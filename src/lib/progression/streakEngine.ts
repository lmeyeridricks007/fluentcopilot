/**
 * Streak rules: one meaningful completion per calendar day advances the streak at most once.
 * Callers should set `DailyActivity.streakCounted` after a successful `updateStreak` credit.
 */

/** Mirrors progression `UserProgress` — keep fields in sync when the domain model evolves. */
export type StreakUserProgress = {
  userId: string
  totalXP: number
  weeklyXP: number
  currentStreak: number
  longestStreak: number
  lastActiveDate: string
  streakGraceUsedAt?: string
  level?: number
}

/** Minimal daily rollup input for streak evaluation. */
export type StreakDailyActivity = {
  date: string
  completedUnits: number
  streakCounted: boolean
}

export type StreakCountableSession = {
  completed: boolean
  durationSeconds: number
  /** Platform-validated short completion (counts even when duration is under threshold). */
  meaningfulCompletion?: boolean
}

export type StreakEngineOptions = {
  /** IANA zone for normalizing `lastActiveDate` when it is a full ISO timestamp. */
  timeZone?: string
  /** Minimum session length to count as meaningful when `meaningfulCompletion` is not set. Default 60. */
  minMeaningfulDurationSeconds?: number
  /** Optional one-day streak freeze (exactly one calendar day missed). */
  grace?: {
    enabled: boolean
    /** Caller indicates the learner can consume a freeze for this update. */
    eligible: boolean
  }
  /** Written to `streakGraceUsedAt` when grace is consumed. */
  nowIso?: string
}

export type StreakUpdateOutcome = {
  newStreak: number
  streakChanged: boolean
  streakBroken: boolean
  longestUpdated: boolean
}

export type StreakUpdateResult = StreakUpdateOutcome & {
  /** Full progress row after applying streak fields; persist this snapshot. */
  nextUserProgress: StreakUserProgress
}

export type StreakLifecycleState =
  | 'never_started'
  | 'same_day_as_reference'
  | 'consecutive'
  | 'single_day_gap'
  | 'broken_gap'

export type StreakStatus = {
  referenceYmd: string
  lastActiveYmd: string | null
  /** Whole calendar days from last active to `referenceYmd` (0 = same day). Null if never active. */
  calendarDaysSinceLastActive: number | null
  state: StreakLifecycleState
  /** True if the next qualifying day would reset to 1 without grace (gap ≥ 2). */
  gapTooLargeForContinue: boolean
  /** True when grace could salvage a single missed day (`single_day_gap`). */
  graceCouldApply: boolean
}

const DEFAULT_MIN_DURATION = 60

function formatYmdInZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function getTodayISO(now: Date = new Date(), timeZone: string = 'UTC'): string {
  return formatYmdInZone(now, timeZone)
}

function toYmd(value: string, timeZone: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return null
  return formatYmdInZone(d, timeZone)
}

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return null
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
}

/** Non-negative whole calendar days from `earlierYmd` to `laterYmd` (`YYYY-MM-DD`). */
function calendarDaysFromTo(earlierYmd: string, laterYmd: string): number {
  const a = parseYmd(earlierYmd)
  const b = parseYmd(laterYmd)
  if (!a || !b) {
    throw new RangeError('calendarDaysFromTo expects YYYY-MM-DD')
  }
  const t0 = Date.UTC(a.y, a.m - 1, a.d)
  const t1 = Date.UTC(b.y, b.m - 1, b.d)
  const diff = Math.round((t1 - t0) / 86_400_000)
  return Math.max(0, diff)
}

export function shouldCountStreak(
  activity: StreakCountableSession,
  options?: Pick<StreakEngineOptions, 'minMeaningfulDurationSeconds'>,
): boolean {
  if (!activity.completed) return false
  if (activity.meaningfulCompletion) return true
  const threshold = options?.minMeaningfulDurationSeconds ?? DEFAULT_MIN_DURATION
  return activity.durationSeconds > threshold
}

export function calculateStreakStatus(
  userProgress: StreakUserProgress,
  options?: { referenceYmd?: string; timeZone?: string; graceEnabled?: boolean },
): StreakStatus {
  const timeZone = options?.timeZone ?? 'UTC'
  const referenceYmd = options?.referenceYmd ?? getTodayISO(new Date(), timeZone)
  const lastActiveYmd = toYmd(userProgress.lastActiveDate, timeZone)

  if (!lastActiveYmd) {
    return {
      referenceYmd,
      lastActiveYmd: null,
      calendarDaysSinceLastActive: null,
      state: 'never_started',
      gapTooLargeForContinue: false,
      graceCouldApply: false,
    }
  }

  const gap = calendarDaysFromTo(lastActiveYmd, referenceYmd)
  const graceEnabled = options?.graceEnabled ?? false

  let state: StreakLifecycleState
  if (gap === 0) state = 'same_day_as_reference'
  else if (gap === 1) state = 'consecutive'
  else if (gap === 2) state = 'single_day_gap'
  else state = 'broken_gap'

  return {
    referenceYmd,
    lastActiveYmd,
    calendarDaysSinceLastActive: gap,
    state,
    gapTooLargeForContinue: gap >= 2,
    graceCouldApply: graceEnabled && gap === 2,
  }
}

/**
 * Applies streak rules when the learner earns their first streak credit of `todayActivity.date`.
 * Idempotent when `todayActivity.streakCounted` is already true.
 */
export function updateStreak(
  userProgress: StreakUserProgress,
  todayActivity: StreakDailyActivity,
  options?: StreakEngineOptions,
): StreakUpdateResult {
  const timeZone = options?.timeZone ?? 'UTC'
  const todayYmd = todayActivity.date.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayYmd)) {
    throw new RangeError('todayActivity.date must be YYYY-MM-DD')
  }

  const prevStreak = userProgress.currentStreak
  const prevLongest = userProgress.longestStreak

  if (todayActivity.streakCounted || todayActivity.completedUnits < 1) {
    return {
      newStreak: prevStreak,
      streakChanged: false,
      streakBroken: false,
      longestUpdated: false,
      nextUserProgress: { ...userProgress },
    }
  }

  const lastYmd = toYmd(userProgress.lastActiveDate, timeZone)
  const hadPriorActiveDay = lastYmd !== null

  let newStreak: number
  let streakBroken = false
  let graceConsumed = false

  if (!hadPriorActiveDay) {
    newStreak = 1
  } else {
    const gap = calendarDaysFromTo(lastYmd, todayYmd)
    if (gap === 0) {
      newStreak = prevStreak
    } else if (gap === 1) {
      newStreak = prevStreak + 1
    } else if (gap === 2 && options?.grace?.enabled && options.grace.eligible) {
      newStreak = prevStreak + 1
      graceConsumed = true
    } else {
      newStreak = 1
      streakBroken = prevStreak > 0
    }
  }

  const nextLongest = Math.max(prevLongest, newStreak)
  const longestUpdated = nextLongest > prevLongest
  const streakChanged = newStreak !== prevStreak

  const nextUserProgress: StreakUserProgress = {
    ...userProgress,
    currentStreak: newStreak,
    longestStreak: nextLongest,
    lastActiveDate: todayYmd,
    streakGraceUsedAt:
      graceConsumed ? (options?.nowIso ?? new Date().toISOString()) : userProgress.streakGraceUsedAt,
  }

  return {
    newStreak,
    streakChanged,
    streakBroken,
    longestUpdated,
    nextUserProgress,
  }
}
