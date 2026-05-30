import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type { StreakUserProgress } from './streakEngine'

export type ProgressionDailyActivity = {
  userId: string
  date: string
  completedUnits: number
  xpEarned: number
  streakCounted: boolean
  activityTypes: Array<
    'scenario' | 'coach' | 'read_aloud' | 'listening' | 'training_loop' | 'from_your_day' | 'exam_simulation' | 'exam_training'
  >
}

export type ProgressionStoredSession = {
  sessionId: string
  userId: string
  type: 'scenario' | 'coach' | 'read_aloud' | 'listening' | 'chat' | 'from_your_day' | 'exam_simulation' | 'exam_training'
  durationSeconds: number
  completed: boolean
  turns?: number
  improvements?: string[]
  weaknessesTargeted?: string[]
  xpAwarded: number
  createdAt: string
  meaningfulCompletion?: boolean
  practicePackMode?: 'quick_rep' | 'standard' | 'deeper_debrief'
  examProfileId?: string
  examLevel?: 'A1' | 'A2' | 'B1'
  /** Present when `type` is `exam_simulation` or `exam_training`. */
  examRunMode?: 'simulation' | 'training'
}

export type ProgressionPersistedState = {
  schemaVersion: 1
  userId: string
  userProgress: StreakUserProgress
  dailyByDate: Record<string, ProgressionDailyActivity>
  sessions: ProgressionStoredSession[]
}

const SCHEMA_VERSION = 1 as const
const MAX_SESSIONS = 400

function dataPath(userId: string): string {
  const safe = encodeURIComponent(userId)
  return join(process.cwd(), '.data', 'progression', `${safe}.json`)
}

function defaultUserProgress(userId: string): StreakUserProgress {
  return {
    userId,
    totalXP: 0,
    weeklyXP: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: '',
    streakGraceUsedAt: undefined,
    level: undefined,
  }
}

function normalizeState(raw: unknown, userId: string): ProgressionPersistedState {
  if (!raw || typeof raw !== 'object') {
    return {
      schemaVersion: SCHEMA_VERSION,
      userId,
      userProgress: defaultUserProgress(userId),
      dailyByDate: {},
      sessions: [],
    }
  }
  const o = raw as Record<string, unknown>
  const up = o.userProgress && typeof o.userProgress === 'object' ? (o.userProgress as StreakUserProgress) : defaultUserProgress(userId)
  const daily = o.dailyByDate && typeof o.dailyByDate === 'object' ? (o.dailyByDate as Record<string, ProgressionDailyActivity>) : {}
  const sessions = Array.isArray(o.sessions) ? (o.sessions as ProgressionStoredSession[]) : []
  return {
    schemaVersion: SCHEMA_VERSION,
    userId,
    userProgress: { ...defaultUserProgress(userId), ...up, userId },
    dailyByDate: daily,
    sessions: sessions.filter((s) => s && typeof s.sessionId === 'string'),
  }
}

async function ensureDir(file: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
}

const serializedTail = new Map<string, Promise<unknown>>()

function runSerialized<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const prev = serializedTail.get(userId) ?? Promise.resolve()
  const next: Promise<T> = prev.then(() => fn())
  serializedTail.set(userId, next.then(() => undefined, () => undefined))
  return next
}

export async function loadProgressionState(userId: string): Promise<ProgressionPersistedState> {
  const file = dataPath(userId)
  try {
    const raw = await readFile(file, 'utf8')
    return normalizeState(JSON.parse(raw) as unknown, userId)
  } catch {
    return normalizeState(null, userId)
  }
}

export async function saveProgressionState(state: ProgressionPersistedState): Promise<void> {
  const file = dataPath(state.userId)
  await ensureDir(file)
  const trimmed: ProgressionPersistedState = {
    ...state,
    sessions: state.sessions.slice(-MAX_SESSIONS),
  }
  await writeFile(file, JSON.stringify(trimmed, null, 2), 'utf8')
}

export async function mutateProgressionState<T>(
  userId: string,
  mutator: (draft: ProgressionPersistedState) => T | Promise<T>,
): Promise<T> {
  return runSerialized(userId, async () => {
    const draft = await loadProgressionState(userId)
    const out = await mutator(draft)
    await saveProgressionState(draft)
    return out
  })
}
