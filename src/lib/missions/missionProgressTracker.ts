import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { isoWeekKey } from '@/lib/retention/xp'
import { localDateKey } from '@/lib/retention/streak'
import { getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'
import { getOrCreateMissionRuntimeStateSync, saveMissionRuntimeStateSync } from '@/lib/missions/missionPersistence'
import { rollAndFillMissionSlots, emptyMissionStateForSsr } from '@/lib/missions/missionAssigner'
import { grantMissionRewardIfNeeded } from '@/lib/missions/missionRewardService'
import type { AssignedMissionInstance } from '@/lib/schemas/practice/missionRuntimeState.schema'
import type { MissionRuntimeState } from '@/lib/schemas/practice/missionRuntimeState.schema'
import type { MissionProgressRule } from '@/lib/schemas/practice/missionRuntimeState.schema'
import type { MissionGeneratorContext, MissionSignal, MissionSlot } from '@/lib/missions/types'
import { normalizeConversationMode } from '@/lib/missions/types'
import type { ScenarioCatalogCategory } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import { isExamPrepMissionTemplateId } from '@/lib/missions/examPrepMissionHelpers'
import { onDailyMissionCompletedClient } from '@/lib/device/deviceFeedback'

const REVIEW_MIN_FOR_PRACTICE_DAY = 1

const DERIVED_WEEKLY_RULE_KINDS: MissionProgressRule['kind'][] = [
  'practice_days_week',
  'distinct_skill_tracks_week',
  'health_scenarios_week',
  'exam_prep_week_count',
  'exam_prep_practice_exam_week',
]

function previousLocalDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y!, m! - 1, d!)
  dt.setDate(dt.getDate() - 1)
  return localDateKey(dt)
}

function addDistinctDay(state: MissionRuntimeState, day: string): MissionRuntimeState {
  if (state.weekDistinctPracticeDays.includes(day)) return state
  return {
    ...state,
    weekDistinctPracticeDays: [...state.weekDistinctPracticeDays, day],
  }
}

function addSkillTrackWeek(state: MissionRuntimeState, trackId: string): MissionRuntimeState {
  if (state.weekSkillTrackIds.includes(trackId)) return state
  return {
    ...state,
    weekSkillTrackIds: [...state.weekSkillTrackIds, trackId],
  }
}

function bumpScenarioStreak(state: MissionRuntimeState, todayKey: string): MissionRuntimeState {
  const prev = state.scenarioStreak
  const last = prev.lastScenarioPracticeLocalDate
  const wk = isoWeekKey()
  let scenariosThisWeek = prev.weekKey === wk ? prev.scenariosThisWeek : 0
  scenariosThisWeek += 1

  let consecutiveDays = prev.consecutiveDays
  let longest = prev.longestConsecutive
  if (last !== todayKey) {
    if (last === previousLocalDay(todayKey)) {
      consecutiveDays = prev.consecutiveDays + 1
    } else {
      consecutiveDays = 1
    }
    longest = Math.max(longest, consecutiveDays)
  }

  const nextStreak = {
    lastScenarioPracticeLocalDate: todayKey,
    consecutiveDays,
    longestConsecutive: longest,
    weekKey: wk,
    scenariosThisWeek,
  }
  track(ANALYTICS_EVENTS.scenario_streak_updated, {
    consecutiveDays,
    scenariosThisWeek,
    longestConsecutive: longest,
  })
  return { ...state, scenarioStreak: nextStreak }
}

function ruleDelta(
  rule: MissionProgressRule,
  signal: MissionSignal,
  scenarioCategory: ScenarioCatalogCategory | undefined,
  modeNorm: ReturnType<typeof normalizeConversationMode>
): number {
  switch (rule.kind) {
    case 'scenario_complete': {
      if (signal.type !== 'scenario_complete') return 0
      if (rule.modes?.length) {
        if (!modeNorm || !rule.modes.includes(modeNorm)) return 0
      }
      if (rule.category && scenarioCategory !== rule.category) return 0
      return 1
    }
    case 'scenario_completes_week': {
      return signal.type === 'scenario_complete' ? 1 : 0
    }
    case 'skill_track_complete': {
      if (signal.type !== 'skill_track_complete') return 0
      if (rule.trackIds?.length) {
        return rule.trackIds.includes(signal.trackId) ? 1 : 0
      }
      if (rule.anyTrack) return 1
      return 0
    }
    case 'distinct_skill_tracks_week':
    case 'practice_days_week':
    case 'health_scenarios_week':
      return 0
    case 'mistake_fix_sessions': {
      if (signal.type !== 'review_complete') return 0
      if (signal.mode !== 'mistake_fix') return 0
      return signal.total >= rule.minCards ? 1 : 0
    }
    case 'daily_review_sessions': {
      if (signal.type !== 'review_complete') return 0
      if (signal.mode !== 'daily') return 0
      return signal.total >= rule.minCards ? 1 : 0
    }
    case 'exam_prep_completion': {
      if (signal.type !== 'exam_prep_complete') return 0
      if (rule.domains?.length && !rule.domains.includes(signal.domain)) return 0
      if (rule.modes?.length && !rule.modes.includes(signal.mode)) return 0
      if (rule.minNormalizedPercent != null) {
        if (typeof signal.normalizedPercent !== 'number' || signal.normalizedPercent < rule.minNormalizedPercent) {
          return 0
        }
      }
      return 1
    }
    case 'exam_prep_week_count':
    case 'exam_prep_practice_exam_week':
    case 'exam_category_improved':
      return 0
    default:
      return 0
  }
}

function syncDerivedWeeklyProgress(state: MissionRuntimeState, inst: AssignedMissionInstance): AssignedMissionInstance {
  const r = inst.rule
  if (r.kind === 'practice_days_week') {
    return {
      ...inst,
      current: Math.min(inst.target, state.weekDistinctPracticeDays.length),
    }
  }
  if (r.kind === 'distinct_skill_tracks_week') {
    return {
      ...inst,
      current: Math.min(inst.target, state.weekSkillTrackIds.length),
    }
  }
  if (r.kind === 'health_scenarios_week') {
    return {
      ...inst,
      current: Math.min(inst.target, state.weekHealthScenarioCount),
    }
  }
  if (r.kind === 'exam_prep_week_count') {
    const n = r.domain ? (state.weekExamPrepByDomain[r.domain] ?? 0) : state.weekExamPrepTotal
    return {
      ...inst,
      current: Math.min(inst.target, n),
    }
  }
  return inst
}

function advanceAssignment(
  inst: AssignedMissionInstance,
  delta: number,
  state: MissionRuntimeState,
  slot: MissionSlot
): AssignedMissionInstance {
  if (inst.completed || delta <= 0) return inst
  const prevCurrent = inst.current
  let next: AssignedMissionInstance = {
    ...inst,
    current: Math.min(inst.target, inst.current + delta),
  }
  next = syncDerivedWeeklyProgress(state, next)
  if (next.current > prevCurrent) {
    track(ANALYTICS_EVENTS.mission_progressed, {
      missionSlot: slot,
      templateId: next.templateId,
      current: next.current,
      target: next.target,
    })
    if (isExamPrepMissionTemplateId(next.templateId)) {
      track(ANALYTICS_EVENTS.exam_mission_progressed, {
        missionSlot: slot,
        templateId: next.templateId,
        current: next.current,
        target: next.target,
      })
    }
  }
  return next
}

function completeIfNeeded(
  userId: string,
  slot: MissionSlot,
  inst: AssignedMissionInstance
): AssignedMissionInstance {
  if (inst.completed) return inst
  if (inst.current < inst.target) return inst

  const { granted } = grantMissionRewardIfNeeded({
    userId,
    slot,
    templateId: inst.templateId,
    xpAmount: inst.xpReward,
    alreadyGranted: inst.rewardGranted,
  })

  track(ANALYTICS_EVENTS.mission_completed, {
    missionSlot: slot,
    templateId: inst.templateId,
    xpReward: inst.xpReward,
  })
  if (isExamPrepMissionTemplateId(inst.templateId)) {
    track(ANALYTICS_EVENTS.exam_mission_completed, {
      missionSlot: slot,
      templateId: inst.templateId,
      xpReward: inst.xpReward,
    })
  }

  if (slot === 'daily' && typeof window !== 'undefined') {
    onDailyMissionCompletedClient()
  }

  return {
    ...inst,
    completed: true,
    rewardGranted: inst.rewardGranted || granted,
  }
}

/**
 * Apply learning-surface signals to mission progress (client-only).
 */
export function applyMissionSignal(userId: string, signal: MissionSignal, ctx: MissionGeneratorContext): void {
  if (typeof window === 'undefined') return

  const todayKey = localDateKey()

  let state = getOrCreateMissionRuntimeStateSync(userId, todayKey, isoWeekKey())
  state = rollAndFillMissionSlots(state, ctx)
  const scoreBaseline = { ...state.lastExamCategoryScores }

  const modeNorm =
    signal.type === 'scenario_complete' ? normalizeConversationMode(signal.mode) : null
  const scenarioCategory =
    signal.type === 'scenario_complete'
      ? getScenarioCatalogEntry(signal.scenarioId)?.category
      : undefined

  if (signal.type === 'scenario_complete') {
    state = bumpScenarioStreak(state, todayKey)
    if (scenarioCategory === 'health') {
      state = { ...state, weekHealthScenarioCount: state.weekHealthScenarioCount + 1 }
    }
    state = addDistinctDay(state, todayKey)
  } else if (signal.type === 'skill_track_complete') {
    state = addSkillTrackWeek(state, signal.trackId)
    state = addDistinctDay(state, todayKey)
  } else if (signal.type === 'review_complete' && signal.total >= REVIEW_MIN_FOR_PRACTICE_DAY) {
    state = addDistinctDay(state, todayKey)
  } else if (signal.type === 'exam_prep_complete') {
    state = {
      ...state,
      weekExamPrepTotal: state.weekExamPrepTotal + 1,
      weekExamPrepByDomain: {
        ...state.weekExamPrepByDomain,
        [signal.domain]: (state.weekExamPrepByDomain[signal.domain] ?? 0) + 1,
      },
      weekExamPrepPracticeExamCount:
        signal.mode === 'practice_exam'
          ? state.weekExamPrepPracticeExamCount + 1
          : state.weekExamPrepPracticeExamCount,
    }
    state = addDistinctDay(state, todayKey)
  }

  const applySlot = (slot: MissionSlot, cur: AssignedMissionInstance | null): AssignedMissionInstance | null => {
    if (!cur) return cur
    let next = cur

    if (cur.rule.kind === 'exam_category_improved' && signal.type === 'exam_prep_complete') {
      let delta = 0
      if (signal.domain === cur.rule.domain) {
        const newV = signal.categoryScores?.[cur.rule.categoryKey]
        if (typeof newV === 'number') {
          const key = `${cur.rule.domain}:${cur.rule.categoryKey}`
          const oldV = scoreBaseline[key]
          if (oldV !== undefined && newV >= oldV + cur.rule.minDelta) delta = 1
        }
      }
      if (delta > 0) {
        next = advanceAssignment(next, delta, state, slot)
      } else {
        next = syncDerivedWeeklyProgress(state, next)
      }
      next = completeIfNeeded(userId, slot, next)
      return next
    }

    const delta = ruleDelta(cur.rule, signal, scenarioCategory, modeNorm)
    if (delta > 0 && !DERIVED_WEEKLY_RULE_KINDS.includes(cur.rule.kind)) {
      next = advanceAssignment(next, delta, state, slot)
    }
    if (DERIVED_WEEKLY_RULE_KINDS.includes(cur.rule.kind)) {
      next = syncDerivedWeeklyProgress(state, next)
      if (next.current > cur.current) {
        track(ANALYTICS_EVENTS.mission_progressed, {
          missionSlot: slot,
          templateId: next.templateId,
          current: next.current,
          target: next.target,
        })
        if (isExamPrepMissionTemplateId(next.templateId)) {
          track(ANALYTICS_EVENTS.exam_mission_progressed, {
            missionSlot: slot,
            templateId: next.templateId,
            current: next.current,
            target: next.target,
          })
        }
      }
    }
    next = completeIfNeeded(userId, slot, next)
    return next
  }

  state = {
    ...state,
    daily: applySlot('daily', state.daily),
    weekly: applySlot('weekly', state.weekly),
    skillFocus: applySlot('skill_focus', state.skillFocus),
  }

  if (signal.type === 'exam_prep_complete' && signal.categoryScores) {
    const merged = { ...state.lastExamCategoryScores }
    for (const [k, v] of Object.entries(signal.categoryScores)) {
      if (typeof v === 'number') merged[`${signal.domain}:${k}`] = v
    }
    state = { ...state, lastExamCategoryScores: merged }
  }

  saveMissionRuntimeStateSync(state)
}

/** Server / tests: no-op progress; use empty state shape. */
export function missionSignalNoopState(userId: string): MissionRuntimeState {
  return emptyMissionStateForSsr(userId)
}
