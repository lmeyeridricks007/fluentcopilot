import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { isoWeekKey } from '@/lib/retention/xp'
import { localDateKey } from '@/lib/retention/streak'
import { getOrCreateMissionRuntimeStateSync, saveMissionRuntimeStateSync } from '@/lib/missions/missionPersistence'
import { pickDailyTemplate, pickSkillFocusTemplate, pickWeeklyTemplate } from '@/lib/missions/missionGenerator'
import { rolloverMissionPeriods } from '@/lib/missions/missionResetService'
import type { AssignedMissionInstance } from '@/lib/schemas/practice/missionRuntimeState.schema'
import type { MissionRuntimeState } from '@/lib/schemas/practice/missionRuntimeState.schema'
import type { MissionGeneratorContext } from '@/lib/missions/types'
import { isExamPrepMissionTemplateId } from '@/lib/missions/examPrepMissionHelpers'
import { getMissionTemplate } from '@/lib/missions/missionRegistry'

function firstScenarioIdFromWeakness(ctx: MissionGeneratorContext): string | undefined {
  const top = ctx.weaknessInsights[0]
  const sc = top?.actions.find((a) => a.kind === 'scenario')
  if (!sc) return undefined
  return sc.id.replace(/^wa-sc-/, '')
}

function instantiateMission(
  templateId: string,
  ctx: MissionGeneratorContext
): AssignedMissionInstance | null {
  const t = getMissionTemplate(templateId)
  if (!t) return null
  if (t.requiresPremium && ctx.tier === 'free') return null
  const weaknessScenarioId = firstScenarioIdFromWeakness(ctx)
  const action = t.buildAction({
    tier: ctx.tier,
    atScenarioCap: ctx.atScenarioCap,
    suggestedScenarioId: weaknessScenarioId,
    category: ctx.inferredCategory,
  })
  const rationale = t.rationale?.(ctx)
  const inst: AssignedMissionInstance = {
    templateId: t.id,
    title: t.title,
    description: t.description,
    rationale,
    current: 0,
    target: t.target,
    xpReward: t.xpReward,
    countsForStreak: t.countsForStreak,
    href: action.href,
    ctaLabel: action.ctaLabel,
    completed: false,
    rewardGranted: false,
    rule: t.rule,
  }
  return inst
}

function assignIfEmpty(
  state: MissionRuntimeState,
  slot: 'daily' | 'weekly' | 'skill_focus',
  inst: AssignedMissionInstance | null
): MissionRuntimeState {
  if (!inst) return state
  if (slot === 'daily' && state.daily) return state
  if (slot === 'weekly' && state.weekly) return state
  if (slot === 'skill_focus' && state.skillFocus) return state
  if (typeof window !== 'undefined') {
    track(ANALYTICS_EVENTS.mission_assigned, {
      missionSlot: slot,
      templateId: inst.templateId,
      target: inst.target,
    })
    if (isExamPrepMissionTemplateId(inst.templateId)) {
      track(ANALYTICS_EVENTS.exam_mission_generated, {
        missionSlot: slot,
        templateId: inst.templateId,
        target: inst.target,
      })
    }
  }
  if (slot === 'daily') return { ...state, daily: inst }
  if (slot === 'weekly') return { ...state, weekly: inst }
  return { ...state, skillFocus: inst }
}

export function emptyMissionStateForSsr(userId: string): MissionRuntimeState {
  const dk = localDateKey()
  const wk = isoWeekKey()
  return {
    version: 1,
    userId,
    dailyKey: dk,
    weeklyKey: wk,
    daily: null,
    weekly: null,
    skillFocus: null,
    scenarioStreak: {
      lastScenarioPracticeLocalDate: null,
      consecutiveDays: 0,
      longestConsecutive: 0,
      weekKey: wk,
      scenariosThisWeek: 0,
    },
    weekDistinctPracticeDays: [],
    weekSkillTrackIds: [],
    weekHealthScenarioCount: 0,
    weekExamPrepTotal: 0,
    weekExamPrepByDomain: {},
    lastExamCategoryScores: {},
    weekExamPrepPracticeExamCount: 0,
  }
}

/** Roll day/week boundaries and assign any null mission slots (no persist). */
export function rollAndFillMissionSlots(state: MissionRuntimeState, ctx: MissionGeneratorContext): MissionRuntimeState {
  const dk = localDateKey()
  const wk = isoWeekKey()
  let next = rolloverMissionPeriods(state, dk, wk)

  const ctxForPick: MissionGeneratorContext = {
    ...ctx,
    userId: ctx.userId ?? state.userId,
    hasExamPrepActivityThisWeek: next.weekExamPrepTotal > 0,
  }

  const dailyTpl = pickDailyTemplate(ctxForPick)
  next = assignIfEmpty(next, 'daily', instantiateMission(dailyTpl.id, ctxForPick))

  const weeklyTpl = pickWeeklyTemplate(ctxForPick, wk)
  next = assignIfEmpty(next, 'weekly', instantiateMission(weeklyTpl.id, ctxForPick))

  const skillTpl = pickSkillFocusTemplate(ctxForPick, dk, state.userId)
  next = assignIfEmpty(next, 'skill_focus', instantiateMission(skillTpl.id, ctxForPick))

  return next
}

/**
 * Load, roll periods, assign missing slots, persist. Safe to call from client presentation layer.
 */
export function ensureMissionRuntimeHydrated(
  userId: string,
  ctx: MissionGeneratorContext
): MissionRuntimeState {
  if (typeof window === 'undefined') {
    return emptyMissionStateForSsr(userId)
  }

  const dk = localDateKey()
  const wk = isoWeekKey()
  let state = getOrCreateMissionRuntimeStateSync(userId, dk, wk)
  state = rollAndFillMissionSlots(state, ctx)

  saveMissionRuntimeStateSync(state)
  return state
}
