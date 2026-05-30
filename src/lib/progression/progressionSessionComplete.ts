import type { ExamXpMeta } from '@/lib/exam-system/types'
import type { ProgressionDailyActivity, ProgressionPersistedState, ProgressionStoredSession } from './serverProgressionStore'
import { mutateProgressionState } from './serverProgressionStore'
import {
  generateTodaySuggestion,
  type FromYourDaySuggestionHints,
  type SuggestionSessionSummary,
} from './suggestionEngine'
import { shouldCountStreak, updateStreak, type StreakDailyActivity } from './streakEngine'
import { calculateXP, type XpSessionSummary } from './xpEngine'

export type SessionCompleteBody = {
  sessionId: string
  userId: string
  type:
    | 'scenario'
    | 'coach'
    | 'read_aloud'
    | 'listening'
    | 'chat'
    | 'from_your_day'
    | 'exam_simulation'
    | 'exam_training'
  durationSeconds: number
  completed: boolean
  turns?: number
  improvements?: string[]
  weaknessesTargeted?: string[]
  xpAwarded?: number
  createdAt: string
  meaningfulCompletion?: boolean
  /** Personalized “From your day” pack depth — drives tiered XP when `type` is `from_your_day`. */
  practicePackMode?: 'quick_rep' | 'standard' | 'deeper_debrief'
  /** Exam system — drives tiered XP when `type` is `exam_*`. */
  examXpMeta?: ExamXpMeta
  examTasksCompleted?: number
  examMinTasks?: number
  xpBandSeed?: string
  examProfileId?: string
  examLevel?: 'A1' | 'A2' | 'B1'
}

export type SessionCompleteResult = {
  xpAwarded: number
  newStreak: number
  streakChanged: boolean
  suggestion: ReturnType<typeof generateTodaySuggestion>
}

export function formatProgressionYmd(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function sessionTypeToDailyKind(
  t: SessionCompleteBody['type'],
): ProgressionDailyActivity['activityTypes'][number] {
  if (t === 'chat') return 'coach'
  if (t === 'from_your_day') return 'from_your_day'
  if (t === 'exam_simulation') return 'exam_simulation'
  if (t === 'exam_training') return 'exam_training'
  return t
}

function toXpSession(body: SessionCompleteBody, extras?: Partial<XpSessionSummary>): XpSessionSummary {
  return {
    type: body.type,
    completed: body.completed,
    durationSeconds: body.durationSeconds,
    turns: body.turns,
    improvements: body.improvements,
    weaknessesTargeted: body.weaknessesTargeted,
    meaningfulCompletion: body.meaningfulCompletion,
    practicePackMode: body.practicePackMode,
    xpBandSeed: body.xpBandSeed ?? body.sessionId,
    examXpMeta: body.examXpMeta,
    examTasksCompleted: body.examTasksCompleted,
    examMinTasks: body.examMinTasks,
    ...extras,
  }
}

function toSuggestionSessions(sessions: ProgressionStoredSession[]): SuggestionSessionSummary[] {
  return [...sessions]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 20)
    .map((s) => ({
      sessionId: s.sessionId,
      type: s.type,
      completed: s.completed,
      durationSeconds: s.durationSeconds,
      weaknessesTargeted: s.weaknessesTargeted,
      improvements: s.improvements,
      createdAt: s.createdAt,
      turns: s.turns,
    }))
}

export async function applySessionComplete(
  body: SessionCompleteBody,
  options?: { timeZone?: string; fromYourDayHints?: FromYourDaySuggestionHints | null },
): Promise<SessionCompleteResult> {
  const timeZone = options?.timeZone ?? 'UTC'
  const todayYmd = formatProgressionYmd(new Date(body.createdAt), timeZone)
  const suggestionCtxBase = {
    fromYourDayHints: options?.fromYourDayHints ?? null,
    fromYourDayReadyCount: options?.fromYourDayHints?.practiceReadyCount,
  } as const

  return mutateProgressionState(body.userId, async (state) => {
    if (state.sessions.some((s) => s.sessionId === body.sessionId)) {
      const xpAwarded = state.sessions.find((s) => s.sessionId === body.sessionId)?.xpAwarded ?? 0
      const suggestion = generateTodaySuggestion({
        userProgress: state.userProgress,
        recentSessions: toSuggestionSessions(state.sessions),
        activeTrainingLoops: [],
        skillProfile: null,
        now: new Date(),
        timeZone,
        ...suggestionCtxBase,
      })
      return {
        xpAwarded,
        newStreak: state.userProgress.currentStreak,
        streakChanged: false,
        suggestion,
      }
    }

    const priorSameDayFromYourDay =
      body.type === 'from_your_day'
        ? state.sessions.filter((s) => {
            if (s.type !== 'from_your_day') return false
            const day = formatProgressionYmd(new Date(s.createdAt), timeZone)
            return day === todayYmd
          }).length
        : 0

    const examTypes = body.type === 'exam_simulation' || body.type === 'exam_training'
    const xpResult = calculateXP(
      toXpSession(body, { sameDayPriorFromYourDayCompletions: priorSameDayFromYourDay }),
      state.userProgress,
      examTypes
        ? {
            sessionXpCap: 90,
          }
        : undefined,
    )
    const xpAwarded = xpResult.totalXP
    /** Exam streak: only real completions (min tasks met), not idle time on an unfinished run. */
    const meaningful = examTypes
      ? Boolean(body.completed && body.meaningfulCompletion)
      : shouldCountStreak(
          {
            completed: body.completed,
            durationSeconds: body.durationSeconds,
            meaningfulCompletion: body.meaningfulCompletion,
          },
          {},
        )

    const oldDaily = state.dailyByDate[todayYmd]
    const nextCompletedUnits = (oldDaily?.completedUnits ?? 0) + (meaningful ? 1 : 0)
    const nextXpEarned = (oldDaily?.xpEarned ?? 0) + xpAwarded

    const kinds = new Set(oldDaily?.activityTypes ?? [])
    if (meaningful) {
      kinds.add(sessionTypeToDailyKind(body.type))
    }

    const streakDaily: StreakDailyActivity = {
      date: todayYmd,
      completedUnits: nextCompletedUnits,
      streakCounted: oldDaily?.streakCounted ?? false,
    }

    const streakResult = meaningful
      ? updateStreak(state.userProgress, streakDaily, { timeZone })
      : {
          newStreak: state.userProgress.currentStreak,
          streakChanged: false,
          streakBroken: false,
          longestUpdated: false,
          nextUserProgress: { ...state.userProgress },
        }

    const nextProgress: typeof state.userProgress = {
      ...streakResult.nextUserProgress,
      totalXP: streakResult.nextUserProgress.totalXP + xpAwarded,
      weeklyXP: streakResult.nextUserProgress.weeklyXP + xpAwarded,
    }

    const newStreakCounted = (oldDaily?.streakCounted ?? false) || meaningful

    state.dailyByDate[todayYmd] = {
      userId: body.userId,
      date: todayYmd,
      completedUnits: nextCompletedUnits,
      xpEarned: nextXpEarned,
      streakCounted: newStreakCounted,
      activityTypes: [...kinds],
    }

    state.userProgress = nextProgress

    const storedSession: ProgressionStoredSession = {
      sessionId: body.sessionId,
      userId: body.userId,
      type: body.type,
      durationSeconds: body.durationSeconds,
      completed: body.completed,
      turns: body.turns,
      improvements: body.improvements,
      weaknessesTargeted: body.weaknessesTargeted,
      xpAwarded,
      createdAt: body.createdAt,
      meaningfulCompletion: body.meaningfulCompletion,
      practicePackMode: body.practicePackMode,
      examProfileId: body.examProfileId,
      examLevel: body.examLevel,
      examRunMode: body.examXpMeta?.runMode,
    }
    state.sessions.push(storedSession)

    const suggestion = generateTodaySuggestion({
      userProgress: state.userProgress,
      recentSessions: toSuggestionSessions(state.sessions),
      activeTrainingLoops: [],
      skillProfile: null,
      now: new Date(),
      timeZone,
      ...suggestionCtxBase,
    })

    return {
      xpAwarded,
      newStreak: nextProgress.currentStreak,
      streakChanged: streakResult.streakChanged,
      suggestion,
    }
  })
}

/** Rolling sum of `xpEarned` for the last `days` calendar buckets in `timeZone` (approximate around DST). */
export function sumXpRollingDays(
  state: ProgressionPersistedState,
  now: Date,
  days: number,
  timeZone: string,
): number {
  let total = 0
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() - i * 86_400_000)
    const key = formatProgressionYmd(d, timeZone)
    total += state.dailyByDate[key]?.xpEarned ?? 0
  }
  return total
}
