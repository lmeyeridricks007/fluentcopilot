import type { MissionRuntimeState } from '@/lib/schemas/practice/missionRuntimeState.schema'

/**
 * Daily: new daily + skill-focus slots. Weekly: new weekly slot + rollup counters + scenario week tally.
 */
export function rolloverMissionPeriods(
  state: MissionRuntimeState,
  todayKey: string,
  weekKey: string
): MissionRuntimeState {
  let next: MissionRuntimeState = { ...state }

  if (state.dailyKey !== todayKey) {
    next = {
      ...next,
      dailyKey: todayKey,
      daily: null,
      skillFocus: null,
    }
  }

  if (state.weeklyKey !== weekKey) {
    next = {
      ...next,
      weeklyKey: weekKey,
      weekly: null,
      weekDistinctPracticeDays: [],
      weekSkillTrackIds: [],
      weekHealthScenarioCount: 0,
      weekExamPrepTotal: 0,
      weekExamPrepByDomain: {},
      weekExamPrepPracticeExamCount: 0,
      scenarioStreak: {
        ...next.scenarioStreak,
        weekKey,
        scenariosThisWeek: 0,
      },
    }
  } else if (next.scenarioStreak.weekKey !== weekKey) {
    next = {
      ...next,
      scenarioStreak: {
        ...next.scenarioStreak,
        weekKey,
        scenariosThisWeek: 0,
      },
    }
  }

  return next
}
