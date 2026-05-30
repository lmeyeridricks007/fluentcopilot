import type { ExamXpMeta } from '@/lib/exam-system/types'
import { computeExamXpBand } from '@/lib/exam-system/xpExamBands'
import { shouldCountStreak, type StreakUserProgress } from './streakEngine'
import { computePersonalizedPackXp, type PracticePackMode } from './personalizedPackXp'

/**
 * Session fields required for XP (aligned with progression `SessionSummary`).
 * Extra `meaningfulCompletion` matches streak “validated short completion”.
 */
export type XpSessionSummary = {
  type:
    | 'scenario'
    | 'coach'
    | 'read_aloud'
    | 'listening'
    | 'chat'
    | 'from_your_day'
    | 'exam_simulation'
    | 'exam_training'
  completed: boolean
  durationSeconds: number
  turns?: number
  improvements?: string[]
  weaknessesTargeted?: string[]
  meaningfulCompletion?: boolean
  /** When set with `from_your_day`, XP uses tiered personalized pack rules. */
  practicePackMode?: PracticePackMode
  /** Prior completed `from_your_day` sessions today (same calendar date, learner TZ) — anti-farm decay. */
  sameDayPriorFromYourDayCompletions?: number
  /** Stable seed for band pick inside the tier (e.g. session id). */
  xpBandSeed?: string
  examXpMeta?: ExamXpMeta
  examTasksCompleted?: number
  examMinTasks?: number
}

export type XpBreakdown = {
  base: number
  completion: number
  effort: number
  improvement: number
  recovery: number
  streak: number
}

export type XpCalculationResult = {
  totalXP: number
  breakdown: XpBreakdown
}

export type XpEngineOptions = {
  /** Per-session ceiling after all components. Default 50. */
  sessionXpCap?: number
  /** Same semantics as streak engine (default 60s). */
  minMeaningfulDurationSeconds?: number
  /** Max effort bonus (+1 per turn). Default 10. */
  maxEffortBonus?: number
}

const DEFAULT_CAP = 50
const DEFAULT_MAX_EFFORT = 10

const BASE_BY_TYPE: Record<XpSessionSummary['type'], number> = {
  scenario: 20,
  coach: 18,
  read_aloud: 15,
  listening: 12,
  chat: 10,
  from_your_day: 14,
  exam_simulation: 0,
  exam_training: 0,
}

function emptyBreakdown(): XpBreakdown {
  return { base: 0, completion: 0, effort: 0, improvement: 0, recovery: 0, streak: 0 }
}

function sumBreakdown(b: XpBreakdown): number {
  return b.base + b.completion + b.effort + b.improvement + b.recovery + b.streak
}

function nonEmptyStrings(xs: string[] | undefined): string[] {
  if (!xs?.length) return []
  return xs.filter((s) => typeof s === 'string' && s.trim().length > 0)
}

function boundedLinearBonus(count: number, minBonus: number, maxBonus: number): number {
  if (count < 1) return 0
  return Math.min(maxBonus, minBonus + (count - 1))
}

function effortBonus(turns: number | undefined, maxBonus: number): number {
  const t = typeof turns === 'number' && Number.isFinite(turns) ? Math.max(0, Math.floor(turns)) : 0
  return Math.min(maxBonus, t)
}

function streakBonusFromCount(currentStreak: number): number {
  if (currentStreak >= 8) return 6
  if (currentStreak >= 4) return 4
  if (currentStreak >= 2) return 2
  return 0
}

/**
 * When uncapped total exceeds `cap`, scale integer components so they sum to `cap`
 * (largest fractional remainders get the extra +1s).
 */
function applySessionCap(raw: XpBreakdown, cap: number): XpBreakdown {
  const sum = sumBreakdown(raw)
  if (sum <= cap) return raw
  if (sum === 0) return emptyBreakdown()

  const keys = ['base', 'completion', 'effort', 'improvement', 'recovery', 'streak'] as const
  const scaled = keys.map((k) => (raw[k] * cap) / sum)
  const floors = scaled.map((v) => Math.floor(v))
  let remainder = cap - floors.reduce((a, b) => a + b, 0)
  const order = keys
    .map((_k, i) => ({ i, frac: scaled[i] - floors[i] }))
    .sort((a, b) => b.frac - a.frac)

  let o = 0
  while (remainder > 0 && o < keys.length * 100) {
    floors[order[o % order.length].i] += 1
    remainder -= 1
    o += 1
  }

  return {
    base: floors[0],
    completion: floors[1],
    effort: floors[2],
    improvement: floors[3],
    recovery: floors[4],
    streak: floors[5],
  }
}

type UserProgressForXp = Pick<StreakUserProgress, 'currentStreak'>

/**
 * Awards XP for a single session from completion, effort, improvement, weakness recovery, and streak.
 * Returns all zeros when the session is incomplete or below the meaningful-effort bar (same as streak engine).
 */
export function calculateXP(
  sessionSummary: XpSessionSummary,
  userProgress: UserProgressForXp,
  options?: XpEngineOptions,
): XpCalculationResult {
  const cap = options?.sessionXpCap ?? DEFAULT_CAP
  const maxEffort = options?.maxEffortBonus ?? DEFAULT_MAX_EFFORT

  const qualifies = shouldCountStreak(
    {
      completed: sessionSummary.completed,
      durationSeconds: sessionSummary.durationSeconds,
      meaningfulCompletion: sessionSummary.meaningfulCompletion,
    },
    { minMeaningfulDurationSeconds: options?.minMeaningfulDurationSeconds },
  )

  if (!qualifies) {
    return { totalXP: 0, breakdown: emptyBreakdown() }
  }

  if (sessionSummary.type === 'from_your_day') {
    return computePersonalizedPackXp({
      mode: sessionSummary.practicePackMode ?? 'standard',
      sessionId: sessionSummary.xpBandSeed ?? 'from-your-day',
      weaknessesTargeted: sessionSummary.weaknessesTargeted ?? [],
      improvements: sessionSummary.improvements,
      sameDayPriorFromYourDayCompletions: sessionSummary.sameDayPriorFromYourDayCompletions ?? 0,
    })
  }

  if (sessionSummary.type === 'exam_simulation' || sessionSummary.type === 'exam_training') {
    const meta = sessionSummary.examXpMeta
    const tasksDone = sessionSummary.examTasksCompleted ?? 0
    const minT = sessionSummary.examMinTasks ?? 99
    if (!meta || !sessionSummary.completed) {
      return { totalXP: 0, breakdown: emptyBreakdown() }
    }
    /** No XP for abandoned / trivial runs: must meet profile min unique tasks (FluentCopilot exam rules). */
    if (tasksDone < minT) {
      return { totalXP: 0, breakdown: emptyBreakdown() }
    }
    const band = computeExamXpBand({
      sessionId: sessionSummary.xpBandSeed ?? 'exam',
      meta,
      tasksCompleted: tasksDone,
      minTasksRequired: minT,
    })
    const streak = streakBonusFromCount(userProgress.currentStreak)
    const effort = effortBonus(sessionSummary.turns, maxEffort)
    const improvement = sessionSummary.improvements?.length ? 3 : 0
    const recovery = band.weaknessBonus + band.timedBonus + band.readinessBonus
    const raw: XpBreakdown = {
      base: band.base,
      completion: 0,
      effort,
      improvement,
      recovery,
      streak,
    }
    const breakdown = applySessionCap(raw, cap)
    return { totalXP: sumBreakdown(breakdown), breakdown }
  }

  const base = BASE_BY_TYPE[sessionSummary.type] ?? 0
  const completion = sessionSummary.completed ? 10 : 0
  const effort = effortBonus(sessionSummary.turns, maxEffort)
  const improvementCount = nonEmptyStrings(sessionSummary.improvements).length
  const improvement = boundedLinearBonus(improvementCount, 5, 10)
  const weaknessCount = nonEmptyStrings(sessionSummary.weaknessesTargeted).length
  const recovery = boundedLinearBonus(weaknessCount, 5, 12)
  const streak = streakBonusFromCount(userProgress.currentStreak)

  const raw: XpBreakdown = {
    base,
    completion,
    effort,
    improvement,
    recovery,
    streak,
  }

  const breakdown = applySessionCap(raw, cap)
  return { totalXP: sumBreakdown(breakdown), breakdown }
}
