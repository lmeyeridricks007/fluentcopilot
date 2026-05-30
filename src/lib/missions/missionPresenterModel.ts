import type { AssignedMissionInstance } from '@/lib/schemas/practice/missionRuntimeState.schema'
import type { MissionRuntimeState } from '@/lib/schemas/practice/missionRuntimeState.schema'
import type { DailyMissionVm, ScenarioStreakVm, SkillFocusMissionVm, WeeklyMissionVm } from '@/features/practice-hub/types'

function toDailyLike(inst: AssignedMissionInstance | null, scopeLabel: string): DailyMissionVm | null {
  if (!inst) return null
  return {
    id: inst.templateId,
    scopeLabel,
    title: inst.title,
    description: inst.description,
    rationale: inst.rationale,
    progressCurrent: inst.current,
    progressTarget: inst.target,
    xpReward: inst.xpReward,
    countsForStreak: inst.countsForStreak,
    ctaLabel: inst.completed ? 'Completed' : inst.ctaLabel,
    href: inst.href,
    completed: inst.completed,
  }
}

export function buildScenarioStreakVm(state: MissionRuntimeState): ScenarioStreakVm {
  const s = state.scenarioStreak
  return {
    consecutiveDays: s.consecutiveDays,
    scenariosThisWeek: s.scenariosThisWeek,
    longestConsecutive: s.longestConsecutive,
    title: 'Scenario streak',
    description:
      s.consecutiveDays >= 2
        ? `${s.consecutiveDays} days in a row with at least one scenario — consistency builds fluency.`
        : 'Complete a scenario today to start a scenario streak — separate from your general practice streak.',
    href: '/app/practice/scenarios',
    ctaLabel: 'Browse scenarios',
  }
}

export interface MissionPresentationBundle {
  daily: DailyMissionVm | null
  weekly: WeeklyMissionVm | null
  skillFocus: SkillFocusMissionVm | null
  scenarioStreak: ScenarioStreakVm
}

export function buildMissionPresentationBundle(state: MissionRuntimeState): MissionPresentationBundle {
  return {
    daily: toDailyLike(state.daily, 'Today'),
    weekly: toDailyLike(state.weekly, 'Weekly mission') as WeeklyMissionVm | null,
    skillFocus: toDailyLike(state.skillFocus, 'Skill focus') as SkillFocusMissionVm | null,
    scenarioStreak: buildScenarioStreakVm(state),
  }
}
