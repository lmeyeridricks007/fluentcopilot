import {
  missionRuntimeStateSchema,
  type MissionRuntimeState,
} from '@/lib/schemas/practice/missionRuntimeState.schema'

const STORAGE_PREFIX = 'language-tutor-mission-runtime-v1-'

function keyForUser(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

const defaultScenarioStreak = (weekKey: string): MissionRuntimeState['scenarioStreak'] => ({
  lastScenarioPracticeLocalDate: null,
  consecutiveDays: 0,
  longestConsecutive: 0,
  weekKey,
  scenariosThisWeek: 0,
})

export function emptyMissionRuntimeState(userId: string, dailyKey: string, weeklyKey: string): MissionRuntimeState {
  return {
    version: 1,
    userId,
    dailyKey,
    weeklyKey,
    daily: null,
    weekly: null,
    skillFocus: null,
    scenarioStreak: defaultScenarioStreak(weeklyKey),
    weekDistinctPracticeDays: [],
    weekSkillTrackIds: [],
    weekHealthScenarioCount: 0,
    weekExamPrepTotal: 0,
    weekExamPrepByDomain: {},
    lastExamCategoryScores: {},
    weekExamPrepPracticeExamCount: 0,
  }
}

export function loadMissionRuntimeStateSync(userId: string): MissionRuntimeState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(keyForUser(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return missionRuntimeStateSchema.parse(parsed)
  } catch {
    return null
  }
}

export function saveMissionRuntimeStateSync(state: MissionRuntimeState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(keyForUser(state.userId), JSON.stringify(state))
  } catch {
    // ignore quota
  }
}

export function getOrCreateMissionRuntimeStateSync(
  userId: string,
  dailyKey: string,
  weeklyKey: string
): MissionRuntimeState {
  const existing = loadMissionRuntimeStateSync(userId)
  if (existing && existing.userId === userId) {
    return existing
  }
  return emptyMissionRuntimeState(userId, dailyKey, weeklyKey)
}
