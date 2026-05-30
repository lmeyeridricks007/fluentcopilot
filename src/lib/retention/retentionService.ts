import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { DEFAULT_REVIEW_USER_ID } from '@/lib/review-engine/reviewPersistence'
import { useAuthStore } from '@/store/authStore'
import { getSchemaRegistrationByModuleId } from '@/features/learning-path/schemaModuleRegistry'
import { schedulePathNodeCelebration } from '@/lib/learning-path/pathNodeCelebration'
import {
  findModuleIdForLesson,
  isModuleComplete,
  maybeUnlockAbility,
} from '@/lib/retention/abilities'
import {
  XP_FIRST_LESSON_BONUS,
  XP_LESSON_COMPLETE,
  XP_MODULE_COMPLETE,
  XP_REVIEW_DAILY,
  XP_REVIEW_MISTAKE_FIX,
  XP_REVIEW_PARTIAL,
  XP_STREAK_MILESTONE,
  XP_PRACTICE_SCENARIO_MAX,
  XP_PRACTICE_SCENARIO_MIN,
  XP_PRACTICE_SAME_DAY_FLOOR,
  XP_PRACTICE_SAME_DAY_REPEAT_FACTOR,
  XP_SKILL_TRACK_MAX,
  XP_SKILL_TRACK_MIN,
  XP_SKILL_TRACK_SAME_DAY_FLOOR,
  XP_SKILL_TRACK_SAME_DAY_REPEAT_FACTOR,
  REVIEW_MIN_CARDS_FOR_CREDIT,
  XP_QUICK_CAPTURE_MEANINGFUL_CHUNK,
  XP_QUICK_CAPTURE_MEANINGFUL_DAILY_CAP,
} from '@/lib/retention/constants'
import {
  loadRetentionProfileSync,
  saveRetentionProfileSync,
} from '@/lib/retention/persistence'
import { applyStreakActivity, localDateKey, streakMilestoneJustReached } from '@/lib/retention/streak'
import { fromYourDayPackProgressCountsQualify } from '@/lib/progression/fromYourDayPackRules'
import type {
  AbilityUnlock,
  MilestoneHit,
  RetentionProfile,
  XpReason,
} from '@/lib/retention/types'
import { appendXp } from '@/lib/retention/xp'
import { recordAbilityReviewSignal } from '@/lib/mastery/recordAbilitySignals'
import { computeExamPrepRewardPlan } from '@/lib/exam-rewards/computeExamPrepRewardPlan'
import { applyExamXpAntiFarm } from '@/lib/exam-rewards/examAntiFarm'
import type { ExamPrepRetentionInput, ExamPrepRetentionSummary } from '@/lib/exam-rewards/types'
import { notifyExamPrepMissionProgress } from '@/lib/missions/examPrepMissionSignals'
import { applyMissionSignal } from '@/lib/missions/missionProgressTracker'
import type { MissionGeneratorContext } from '@/lib/missions/types'
import { pickPrimaryMilestone } from '@/lib/retention/milestoneDisplay'
import {
  readPostA2PathwayState,
  withPostA2PathwayCommitted,
} from '@/lib/post-a2-pathways/postA2PathwayState'
import type { PostA2NextOptionId } from '@/lib/post-a2/types'

export type ReviewRetentionMode = 'daily' | 'mistake_fix'

export interface SessionCompleteMeta {
  xpGained: number
  streak: number
  streakExtended: boolean
  milestones: MilestoneHit[]
  profile: RetentionProfile
  /** Present when `recordExamPrepActivityComplete` ran */
  examPrep?: ExamPrepRetentionSummary
}

export type LessonCompleteMeta = SessionCompleteMeta & {
  abilityUnlocked: AbilityUnlock | null
}

function mergeMetadata(p: RetentionProfile): RetentionProfile {
  return {
    ...p,
    metadata: {
      firstDailyReviewDone: false,
      firstMistakeFixDone: false,
      ...p.metadata,
    },
  }
}

function awardXp(
  profile: RetentionProfile,
  amount: number,
  reason: XpReason,
  ref?: string
): RetentionProfile {
  const next = appendXp({
    total: profile.totalXp,
    ledger: profile.ledger,
    weeklyXp: profile.leaderboard.weeklyXp,
    ledgerWeekKey: profile.leaderboard.weekKey,
    amount,
    reason,
    ref,
  })
  return {
    ...profile,
    totalXp: next.total,
    ledger: next.ledger,
    leaderboard: {
      weekKey: next.ledgerWeekKey,
      weeklyXp: next.weeklyXp,
    },
  }
}

function appendSeenMilestones(profile: RetentionProfile, ids: string[]): RetentionProfile {
  const seen = new Set([...profile.milestones.seenIds, ...ids])
  return { ...profile, milestones: { seenIds: [...seen] } }
}

function readMetaBool(profile: RetentionProfile, k: string): boolean {
  return Boolean(profile.metadata[k])
}

function setMeta(profile: RetentionProfile, k: string, v: unknown): RetentionProfile {
  return { ...profile, metadata: { ...profile.metadata, [k]: v } }
}

/** Mission assigner uses richer context on Practice Hub; learning hooks use a safe default. */
function defaultMissionGeneratorContext(): MissionGeneratorContext {
  return {
    tier: 'free',
    atScenarioCap: false,
    weaknessInsights: [],
  }
}

function bumpSameDayScenarioCompletionCount(scenarioId: string): number {
  if (typeof window === 'undefined') return 1
  const k = `lt-practice-completion-count-${scenarioId}-${localDateKey()}`
  const n = parseInt(sessionStorage.getItem(k) ?? '0', 10) + 1
  sessionStorage.setItem(k, String(n))
  return n
}

function applyScenarioXpAntiFarm(scenarioId: string, amount: number): number {
  const n = bumpSameDayScenarioCompletionCount(scenarioId)
  if (n <= 1) return amount
  return Math.max(XP_PRACTICE_SAME_DAY_FLOOR, Math.floor(amount * XP_PRACTICE_SAME_DAY_REPEAT_FACTOR))
}

function bumpSameDaySkillTrackCompletionCount(trackId: string): number {
  if (typeof window === 'undefined') return 1
  const k = `lt-skilltrack-completion-count-${trackId}-${localDateKey()}`
  const n = parseInt(sessionStorage.getItem(k) ?? '0', 10) + 1
  sessionStorage.setItem(k, String(n))
  return n
}

function applySkillTrackXpAntiFarm(trackId: string, amount: number): number {
  const n = bumpSameDaySkillTrackCompletionCount(trackId)
  if (n <= 1) return amount
  return Math.max(XP_SKILL_TRACK_SAME_DAY_FLOOR, Math.floor(amount * XP_SKILL_TRACK_SAME_DAY_REPEAT_FACTOR))
}

/**
 * Active learner id for retention/review/progress. Uses authenticated session when present
 * so each beta account gets isolated storage keys; falls back to demo id when no session.
 */
export function getRetentionUserId(): string {
  if (typeof window === 'undefined') return DEFAULT_REVIEW_USER_ID
  const id = useAuthStore.getState().user?.id
  if (id && id.length > 0) return id
  return DEFAULT_REVIEW_USER_ID
}

export function getRetentionProfile(userId: string = getRetentionUserId()): RetentionProfile {
  return mergeMetadata(loadRetentionProfileSync(userId))
}

/**
 * First-time lesson completion: XP, streak, module/ability unlocks, milestone lines.
 */
export function recordLessonComplete(input: {
  userId?: string
  lessonId: string
  moduleId: string
  lessonTitle: string
}): LessonCompleteMeta {
  const userId = input.userId ?? getRetentionUserId()
  let profile = mergeMetadata(loadRetentionProfileSync(userId))
  if (profile.completedLessonIds.includes(input.lessonId)) {
    return {
      xpGained: 0,
      streak: profile.streak.current,
      streakExtended: false,
      milestones: [],
      abilityUnlocked: null,
      profile,
    }
  }

  const firstEver = profile.completedLessonIds.length === 0
  const today = localDateKey()
  const prevStreak = profile.streak.current
  profile = {
    ...profile,
    completedLessonIds: [...profile.completedLessonIds, input.lessonId],
  }
  profile = { ...profile, streak: applyStreakActivity(profile.streak, today) }

  track(ANALYTICS_EVENTS.streak_updated, {
    current: profile.streak.current,
    source: 'lesson_complete',
  })
  const streakExtended = profile.streak.current > prevStreak
  if (streakExtended) {
    track(ANALYTICS_EVENTS.streak_extended, {
      streak: profile.streak.current,
      source: 'lesson_complete',
    })
  }

  let xpGained = 0
  const milestones: MilestoneHit[] = []

  const mileDay = streakMilestoneJustReached(prevStreak, profile.streak.current)
  if (mileDay) {
    track(ANALYTICS_EVENTS.streak_milestone_reached, { days: mileDay, source: 'lesson' })
    const bonus = XP_STREAK_MILESTONE[mileDay as keyof typeof XP_STREAK_MILESTONE]
    if (bonus) {
      profile = awardXp(profile, bonus, 'streak_milestone', `streak-${mileDay}`)
      xpGained += bonus
      track(ANALYTICS_EVENTS.xp_awarded, { amount: bonus, reason: 'streak_milestone' })
    }
    milestones.push({
      id: `streak_${mileDay}`,
      title: `${mileDay}-day streak`,
      body: `You’ve practiced Dutch ${mileDay} days in a row.`,
      bonusXp: bonus,
    })
  }

  profile = awardXp(profile, XP_LESSON_COMPLETE, 'lesson_complete', input.lessonId)
  xpGained += XP_LESSON_COMPLETE
  track(ANALYTICS_EVENTS.xp_awarded, {
    amount: XP_LESSON_COMPLETE,
    reason: 'lesson_complete',
    lessonId: input.lessonId,
  })

  if (firstEver) {
    profile = awardXp(profile, XP_FIRST_LESSON_BONUS, 'first_lesson_bonus', input.lessonId)
    xpGained += XP_FIRST_LESSON_BONUS
    track(ANALYTICS_EVENTS.xp_awarded, {
      amount: XP_FIRST_LESSON_BONUS,
      reason: 'first_lesson_bonus',
    })
    milestones.push({
      id: 'first_lesson',
      title: 'First lesson done',
      body: 'Nice start — short sessions add up.',
    })
  }

  const modId = input.moduleId || findModuleIdForLesson(input.lessonId) || ''
  const completedSet = new Set(profile.completedLessonIds)
  const nowIso = new Date().toISOString()
  let abilityUnlocked: AbilityUnlock | null = null
  if (modId) {
    const { abilities, newlyUnlocked } = maybeUnlockAbility(
      profile.abilities,
      modId,
      completedSet,
      nowIso
    )
    profile = { ...profile, abilities }
    if (newlyUnlocked) {
      abilityUnlocked = newlyUnlocked
      track(ANALYTICS_EVENTS.ability_unlocked, {
        abilityId: newlyUnlocked.id,
        moduleId: modId,
      })
      milestones.push({
        id: `ability_${newlyUnlocked.id}`,
        title: 'New capability',
        body: newlyUnlocked.headline,
      })
    }
    if (
      isModuleComplete(modId, completedSet) &&
      !profile.completedModuleIds.includes(modId)
    ) {
      profile = {
        ...profile,
        completedModuleIds: [...profile.completedModuleIds, modId],
      }
      profile = awardXp(profile, XP_MODULE_COMPLETE, 'module_complete', modId)
      xpGained += XP_MODULE_COMPLETE
      track(ANALYTICS_EVENTS.xp_awarded, {
        amount: XP_MODULE_COMPLETE,
        reason: 'module_complete',
        moduleId: modId,
      })
      track(ANALYTICS_EVENTS.module_completed, { moduleId: modId })
      const reg = getSchemaRegistrationByModuleId(modId)
      milestones.push({
        id: `module_complete_${modId}`,
        title: 'Module complete',
        body: reg ? `You finished “${reg.module.title}”.` : 'You finished a module.',
      })
    }
  }

  const newIds = milestones.map((m) => m.id)
  profile = appendSeenMilestones(profile, newIds)
  saveRetentionProfileSync(profile)
  schedulePathNodeCelebration(input.lessonId)

  return {
    xpGained,
    streak: profile.streak.current,
    streakExtended,
    milestones,
    abilityUnlocked,
    profile,
  }
}

/**
 * Review / mistake-fix session end — XP and optional streak when performance is meaningful.
 */
export function recordReviewSessionComplete(input: {
  userId?: string
  mode: ReviewRetentionMode
  correct: number
  wrong: number
  total: number
}): SessionCompleteMeta {
  const userId = input.userId ?? getRetentionUserId()
  let profile = mergeMetadata(loadRetentionProfileSync(userId))
  const { correct, wrong, total, mode } = input
  if (total < REVIEW_MIN_CARDS_FOR_CREDIT) {
    return {
      xpGained: 0,
      streak: profile.streak.current,
      streakExtended: false,
      milestones: [],
      profile,
    }
  }

  const acc = correct / total
  const qualifiesStreak =
    mode === 'daily' ? acc >= 0.55 : acc >= 0.5

  const prevStreak = profile.streak.current
  let streakExtended = false
  if (qualifiesStreak) {
    profile = { ...profile, streak: applyStreakActivity(profile.streak, localDateKey()) }
    streakExtended = profile.streak.current > prevStreak
    track(ANALYTICS_EVENTS.streak_updated, {
      current: profile.streak.current,
      source: mode,
    })
    if (streakExtended) {
      track(ANALYTICS_EVENTS.streak_extended, {
        streak: profile.streak.current,
        source: mode,
      })
    }
  }

  const fullXpAmount =
    mode === 'daily'
      ? acc >= 0.55
        ? XP_REVIEW_DAILY
        : XP_REVIEW_PARTIAL
      : acc >= 0.5
        ? XP_REVIEW_MISTAKE_FIX
        : XP_REVIEW_PARTIAL

  const reason: XpReason = mode === 'daily' ? 'review_daily' : 'review_mistake_fix'
  profile = awardXp(profile, fullXpAmount, reason, mode)
  track(ANALYTICS_EVENTS.xp_awarded, {
    amount: fullXpAmount,
    reason,
    mode,
    accuracy: acc,
  })

  let xpGained = fullXpAmount
  const milestones: MilestoneHit[] = []

  const mileDay = qualifiesStreak
    ? streakMilestoneJustReached(prevStreak, profile.streak.current)
    : null
  if (mileDay) {
    track(ANALYTICS_EVENTS.streak_milestone_reached, { days: mileDay, source: mode })
    const bonus = XP_STREAK_MILESTONE[mileDay as keyof typeof XP_STREAK_MILESTONE]
    if (bonus) {
      profile = awardXp(profile, bonus, 'streak_milestone', `streak-${mileDay}`)
      xpGained += bonus
      track(ANALYTICS_EVENTS.xp_awarded, { amount: bonus, reason: 'streak_milestone' })
    }
    milestones.push({
      id: `streak_${mileDay}`,
      title: `${mileDay}-day streak`,
      body: `You’ve practiced Dutch ${mileDay} days in a row.`,
      bonusXp: bonus,
    })
  }

  if (mode === 'daily' && !readMetaBool(profile, 'firstDailyReviewDone')) {
    profile = setMeta(profile, 'firstDailyReviewDone', true)
    milestones.push({
      id: 'first_daily_review',
      title: 'Review habit',
      body: 'Spaced practice is what makes Dutch stick.',
    })
  }
  if (mode === 'mistake_fix' && !readMetaBool(profile, 'firstMistakeFixDone')) {
    profile = setMeta(profile, 'firstMistakeFixDone', true)
    milestones.push({
      id: 'first_mistake_fix',
      title: 'Mistakes practice',
      body: 'Fixing errors early saves time later.',
    })
  }

  const newIds = milestones.map((m) => m.id)
  profile = appendSeenMilestones(profile, newIds)
  saveRetentionProfileSync(profile)

  recordAbilityReviewSignal(userId, acc)

  track(ANALYTICS_EVENTS.review_completed, {
    mode,
    correct,
    wrong,
    total,
    accuracy: acc,
  })
  if (mode === 'mistake_fix') {
    track(ANALYTICS_EVENTS.fix_mistakes_completed, {
      correct,
      wrong,
      total,
      xpGained,
    })
  }

  applyMissionSignal(
    userId,
    { type: 'review_complete', mode, total },
    defaultMissionGeneratorContext()
  )

  return {
    xpGained,
    streak: profile.streak.current,
    streakExtended,
    milestones,
    profile,
  }
}

/**
 * Completing a generated “From your day” practice pack — mission hooks only.
 * XP and daily streak are awarded via `/api/progression/session-complete` (progression store).
 */
export function recordFromYourDayPracticeComplete(input: {
  userId?: string
  packId: string
  stepsTotal: number
  stepsCompleted: number
  completed: boolean
}): SessionCompleteMeta {
  const userId = input.userId ?? getRetentionUserId()
  const profile = mergeMetadata(loadRetentionProfileSync(userId))
  const total = Math.max(0, input.stepsTotal)
  const done = Math.max(0, input.stepsCompleted)
  const qualifies = Boolean(
    input.completed && fromYourDayPackProgressCountsQualify({ stepsTotal: total, stepsCompleted: done }),
  )

  if (!qualifies) {
    return {
      xpGained: 0,
      streak: profile.streak.current,
      streakExtended: false,
      milestones: [],
      profile,
    }
  }

  applyMissionSignal(
    userId,
    { type: 'scenario_complete', scenarioId: 'from-your-day', mode: 'from_your_day' },
    defaultMissionGeneratorContext(),
  )

  return {
    xpGained: 0,
    streak: profile.streak.current,
    streakExtended: false,
    milestones: [],
    profile,
  }
}

type QuickCaptureMeaningfulInput = {
  userId?: string
  captureId: string
  captureType: string
  bodyPrimary?: string | null
  bodySecondary?: string | null
  transcript?: string | null
  rawJson?: string | null
}

function quickCaptureTextMass(input: QuickCaptureMeaningfulInput): number {
  const a = (input.bodyPrimary ?? '').trim().length
  const b = (input.bodySecondary ?? '').trim().length
  const t = (input.transcript ?? '').trim().length
  return a + b + t
}

function quickCaptureLooksMediaHeavy(input: QuickCaptureMeaningfulInput): boolean {
  const raw = input.rawJson?.trim()
  if (!raw) return false
  try {
    const j = JSON.parse(raw) as Record<string, unknown>
    if (typeof j.voiceAudioBase64 === 'string' && j.voiceAudioBase64.length > 200) return true
    if (typeof j.imageBase64 === 'string' && j.imageBase64.length > 200) return true
  } catch {
    return false
  }
  return false
}

/**
 * Optional tiny retention XP for a substantive Quick Capture (never streak).
 * Capped per calendar day and once per capture id — not farmable from empty taps.
 */
export function recordQuickCaptureMeaningfulBonus(input: QuickCaptureMeaningfulInput): SessionCompleteMeta {
  const userId = input.userId ?? getRetentionUserId()
  let profile = mergeMetadata(loadRetentionProfileSync(userId))
  const today = localDateKey()
  const meta = (profile.metadata ?? {}) as Record<string, unknown>
  const guardRaw = meta.quickCaptureXpGuard
  const guard =
    guardRaw && typeof guardRaw === 'object'
      ? (guardRaw as { day?: string; awarded?: number; refs?: string[] })
      : { day: today, awarded: 0, refs: [] as string[] }

  const refs = Array.isArray(guard.refs) ? [...guard.refs] : []
  if (refs.includes(input.captureId)) {
    return { xpGained: 0, streak: profile.streak.current, streakExtended: false, milestones: [], profile }
  }

  let awardedToday = typeof guard.awarded === 'number' && Number.isFinite(guard.awarded) ? guard.awarded : 0
  if (guard.day !== today) {
    awardedToday = 0
    refs.length = 0
  }

  const mass = quickCaptureTextMass(input)
  const substantive =
    mass >= 72 ||
    (mass >= 40 && (input.captureType === 'log_struggle' || input.captureType === 'voice_note')) ||
    quickCaptureLooksMediaHeavy(input)

  if (!substantive) {
    return { xpGained: 0, streak: profile.streak.current, streakExtended: false, milestones: [], profile }
  }

  const chunk = XP_QUICK_CAPTURE_MEANINGFUL_CHUNK
  const cap = XP_QUICK_CAPTURE_MEANINGFUL_DAILY_CAP
  const room = cap - awardedToday
  if (room <= 0) {
    return { xpGained: 0, streak: profile.streak.current, streakExtended: false, milestones: [], profile }
  }
  const amount = Math.min(chunk, room)
  profile = awardXp(profile, amount, 'quick_capture_meaningful', input.captureId)
  track(ANALYTICS_EVENTS.xp_awarded, { amount, reason: 'quick_capture_meaningful' })

  refs.push(input.captureId)
  profile = {
    ...profile,
    metadata: {
      ...profile.metadata,
      quickCaptureXpGuard: {
        day: today,
        awarded: awardedToday + amount,
        refs,
      },
    },
  }
  saveRetentionProfileSync(profile)

  return {
    xpGained: amount,
    streak: profile.streak.current,
    streakExtended: false,
    milestones: [],
    profile,
  }
}

/**
 * Practice scenario wrap-up: XP + optional streak tick (communicative activity).
 */
export function recordPracticeScenarioComplete(input: {
  userId?: string
  scenarioId: string
  mode: string
  outcome: string
  xpAmount?: number
  qualifiesStreak?: boolean
}): SessionCompleteMeta {
  const userId = input.userId ?? getRetentionUserId()
  let profile = mergeMetadata(loadRetentionProfileSync(userId))
  const raw = input.xpAmount ?? XP_PRACTICE_SCENARIO_MIN
  const rawCapped = Math.max(XP_PRACTICE_SCENARIO_MIN, Math.min(XP_PRACTICE_SCENARIO_MAX, raw))
  const amount = applyScenarioXpAntiFarm(input.scenarioId, rawCapped)

  const prevStreak = profile.streak.current
  let streakExtended = false
  if (input.qualifiesStreak !== false) {
    profile = { ...profile, streak: applyStreakActivity(profile.streak, localDateKey()) }
    streakExtended = profile.streak.current > prevStreak
    if (streakExtended) {
      track(ANALYTICS_EVENTS.streak_extended, {
        streak: profile.streak.current,
        source: 'practice_scenario',
      })
      track(ANALYTICS_EVENTS.streak_extended_by_practice, {
        streak: profile.streak.current,
        scenarioId: input.scenarioId,
        practice_kind: 'scenario',
      })
      track(ANALYTICS_EVENTS.practice_streak_applied, {
        streak: profile.streak.current,
        scenarioId: input.scenarioId,
        extended: true,
      })
    }
    track(ANALYTICS_EVENTS.streak_updated, {
      current: profile.streak.current,
      source: 'practice_scenario',
    })
  }

  profile = awardXp(profile, amount, 'practice_scenario_complete', input.scenarioId)
  track(ANALYTICS_EVENTS.xp_awarded, {
    amount,
    reason: 'practice_scenario_complete',
    scenarioId: input.scenarioId,
    mode: input.mode,
    outcome: input.outcome,
  })
  track(ANALYTICS_EVENTS.practice_xp_awarded, {
    amount,
    scenarioId: input.scenarioId,
    mode: input.mode,
    outcome: input.outcome,
    sameDayRepeatAdjusted: amount < rawCapped,
  })

  let xpGained = amount
  const milestones: MilestoneHit[] = []

  if (input.qualifiesStreak !== false) {
    const mileDay = streakMilestoneJustReached(prevStreak, profile.streak.current)
    if (mileDay) {
      track(ANALYTICS_EVENTS.streak_milestone_reached, { days: mileDay, source: 'practice_scenario' })
      const bonus = XP_STREAK_MILESTONE[mileDay as keyof typeof XP_STREAK_MILESTONE]
      if (bonus) {
        profile = awardXp(profile, bonus, 'streak_milestone', `streak-${mileDay}`)
        xpGained += bonus
        track(ANALYTICS_EVENTS.xp_awarded, { amount: bonus, reason: 'streak_milestone' })
      }
      milestones.push({
        id: `streak_${mileDay}`,
        title: `${mileDay}-day streak`,
        body: `You’ve practiced Dutch ${mileDay} days in a row.`,
        bonusXp: bonus,
      })
    }
  }

  const newIds = milestones.map((m) => m.id)
  profile = appendSeenMilestones(profile, newIds)

  saveRetentionProfileSync(profile)

  applyMissionSignal(
    userId,
    { type: 'scenario_complete', scenarioId: input.scenarioId, mode: input.mode },
    defaultMissionGeneratorContext()
  )

  return {
    xpGained,
    streak: profile.streak.current,
    streakExtended,
    milestones,
    profile,
  }
}

/**
 * Skill track micro-session: lighter XP than full scenarios; still counts as daily practice.
 */
export function recordSkillTrackSessionComplete(input: {
  userId?: string
  trackId: string
  levelIndex: number
  score: number
  xpAmount?: number
}): SessionCompleteMeta {
  const userId = input.userId ?? getRetentionUserId()
  let profile = mergeMetadata(loadRetentionProfileSync(userId))
  const raw = input.xpAmount ?? XP_SKILL_TRACK_MIN
  const rawCapped = Math.max(XP_SKILL_TRACK_MIN, Math.min(XP_SKILL_TRACK_MAX, raw))
  const amount = applySkillTrackXpAntiFarm(input.trackId, rawCapped)

  const qualifiesStreak = input.score >= 0.45
  const prevStreak = profile.streak.current
  let streakExtended = false
  if (qualifiesStreak) {
    profile = { ...profile, streak: applyStreakActivity(profile.streak, localDateKey()) }
    streakExtended = profile.streak.current > prevStreak
    if (streakExtended) {
      track(ANALYTICS_EVENTS.streak_extended, {
        streak: profile.streak.current,
        source: 'skill_track',
      })
      track(ANALYTICS_EVENTS.streak_extended_by_practice, {
        streak: profile.streak.current,
        trackId: input.trackId,
        practice_kind: 'skill_track',
      })
      track(ANALYTICS_EVENTS.practice_streak_applied, {
        streak: profile.streak.current,
        trackId: input.trackId,
        extended: true,
      })
    }
    track(ANALYTICS_EVENTS.streak_updated, {
      current: profile.streak.current,
      source: 'skill_track',
    })
  }

  profile = awardXp(profile, amount, 'skill_track_session', input.trackId)
  track(ANALYTICS_EVENTS.xp_awarded, {
    amount,
    reason: 'skill_track_session',
    trackId: input.trackId,
    levelIndex: input.levelIndex,
    score: input.score,
  })
  track(ANALYTICS_EVENTS.practice_xp_awarded, {
    amount,
    trackId: input.trackId,
    levelIndex: input.levelIndex,
    score: input.score,
    sameDayRepeatAdjusted: amount < rawCapped,
  })

  let xpGained = amount
  const milestones: MilestoneHit[] = []

  if (qualifiesStreak) {
    const mileDay = streakMilestoneJustReached(prevStreak, profile.streak.current)
    if (mileDay) {
      track(ANALYTICS_EVENTS.streak_milestone_reached, { days: mileDay, source: 'skill_track' })
      const bonus = XP_STREAK_MILESTONE[mileDay as keyof typeof XP_STREAK_MILESTONE]
      if (bonus) {
        profile = awardXp(profile, bonus, 'streak_milestone', `streak-${mileDay}`)
        xpGained += bonus
        track(ANALYTICS_EVENTS.xp_awarded, { amount: bonus, reason: 'streak_milestone' })
      }
      milestones.push({
        id: `streak_${mileDay}`,
        title: `${mileDay}-day streak`,
        body: `You’ve practiced Dutch ${mileDay} days in a row.`,
        bonusXp: bonus,
      })
    }
  }

  profile = appendSeenMilestones(profile, milestones.map((m) => m.id))

  saveRetentionProfileSync(profile)

  applyMissionSignal(
    userId,
    { type: 'skill_track_complete', trackId: input.trackId },
    defaultMissionGeneratorContext()
  )

  return {
    xpGained,
    streak: profile.streak.current,
    streakExtended,
    milestones,
    profile,
  }
}

/**
 * Exam prep wrap-up: dedicated XP reasons, main streak, parallel exam-habit streak (metadata),
 * improvement + pass/readiness milestones, mission signals. Replaces generic scenario XP for exam flows.
 */
export function recordExamPrepActivityComplete(input: ExamPrepRetentionInput): SessionCompleteMeta {
  const userId = input.userId ?? getRetentionUserId()
  let profile = mergeMetadata(loadRetentionProfileSync(userId))
  const todayKey = localDateKey()
  const plan = computeExamPrepRewardPlan(profile, input, todayKey)

  const baseXp = applyExamXpAntiFarm(plan.antiFarmRef, plan.baseXpRaw)

  const prevStreak = profile.streak.current
  let streakExtended = false
  if (plan.qualifiesMainStreak) {
    profile = { ...profile, streak: applyStreakActivity(profile.streak, todayKey) }
    streakExtended = profile.streak.current > prevStreak
    if (streakExtended) {
      track(ANALYTICS_EVENTS.streak_extended, {
        streak: profile.streak.current,
        source: 'exam_prep',
      })
      track(ANALYTICS_EVENTS.streak_extended_by_practice, {
        streak: profile.streak.current,
        practice_kind: 'exam_prep',
      })
      track(ANALYTICS_EVENTS.exam_streak_extended, {
        streak: profile.streak.current,
        exam_activity: input.kind,
      })
      track(ANALYTICS_EVENTS.practice_streak_applied, {
        streak: profile.streak.current,
        extended: true,
        practice_kind: 'exam_prep',
      })
    }
    track(ANALYTICS_EVENTS.streak_updated, {
      current: profile.streak.current,
      source: 'exam_prep',
    })
  }

  let xpGained = 0

  profile = awardXp(profile, baseXp, 'exam_prep_session', plan.antiFarmRef)
  xpGained += baseXp
  track(ANALYTICS_EVENTS.xp_awarded, {
    amount: baseXp,
    reason: 'exam_prep_session',
    exam_activity: input.kind,
  })
  track(ANALYTICS_EVENTS.exam_xp_awarded, {
    amount: baseXp,
    layer: 'base',
    exam_activity: input.kind,
  })
  track(ANALYTICS_EVENTS.practice_xp_awarded, {
    amount: baseXp,
    practice_kind: 'exam_prep',
    exam_activity: input.kind,
    sameDayRepeatAdjusted: baseXp < plan.baseXpRaw,
  })

  if (plan.improvementBonusXp > 0) {
    profile = awardXp(profile, plan.improvementBonusXp, 'exam_prep_improvement_bonus', `exam-imp-${input.kind}`)
    xpGained += plan.improvementBonusXp
    track(ANALYTICS_EVENTS.xp_awarded, {
      amount: plan.improvementBonusXp,
      reason: 'exam_prep_improvement_bonus',
      exam_activity: input.kind,
    })
    track(ANALYTICS_EVENTS.exam_improvement_bonus_awarded, {
      amount: plan.improvementBonusXp,
      exam_activity: input.kind,
    })
    track(ANALYTICS_EVENTS.exam_xp_awarded, {
      amount: plan.improvementBonusXp,
      layer: 'improvement',
      exam_activity: input.kind,
    })
  }

  const milestones: MilestoneHit[] = [...plan.milestones]

  for (const m of plan.milestones) {
    if (m.bonusXp && m.bonusXp > 0) {
      profile = awardXp(profile, m.bonusXp, 'exam_prep_milestone_bonus', m.id)
      xpGained += m.bonusXp
      track(ANALYTICS_EVENTS.xp_awarded, {
        amount: m.bonusXp,
        reason: 'exam_prep_milestone_bonus',
        milestone_id: m.id,
      })
      track(ANALYTICS_EVENTS.exam_xp_awarded, {
        amount: m.bonusXp,
        layer: 'milestone',
        milestone_id: m.id,
      })
      if (m.id.startsWith('exam_pass_pe_')) {
        track(ANALYTICS_EVENTS.exam_pass_milestone_reached, { milestone_id: m.id, title: m.title })
      }
      if (m.id.startsWith('exam_readiness_ready_')) {
        track(ANALYTICS_EVENTS.exam_readiness_milestone_reached, { milestone_id: m.id, title: m.title })
      }
      track(ANALYTICS_EVENTS.exam_badge_earned, {
        milestone_id: m.id,
        title: m.title,
        xp: m.bonusXp,
      })
    }
  }

  if (plan.qualifiesMainStreak) {
    const mileDay = streakMilestoneJustReached(prevStreak, profile.streak.current)
    if (mileDay) {
      track(ANALYTICS_EVENTS.streak_milestone_reached, { days: mileDay, source: 'exam_prep' })
      const bonus = XP_STREAK_MILESTONE[mileDay as keyof typeof XP_STREAK_MILESTONE]
      if (bonus) {
        profile = awardXp(profile, bonus, 'streak_milestone', `streak-${mileDay}`)
        xpGained += bonus
        track(ANALYTICS_EVENTS.xp_awarded, { amount: bonus, reason: 'streak_milestone' })
      }
      milestones.push({
        id: `streak_${mileDay}`,
        title: `${mileDay}-day streak`,
        body: `You’ve practiced Dutch ${mileDay} days in a row.`,
        bonusXp: bonus,
      })
    }
  }

  for (const [k, v] of Object.entries(plan.metadataUpdates)) {
    profile = setMeta(profile, k, v)
  }

  profile = appendSeenMilestones(profile, plan.seenIdsToAppend)
  const streakSeen = milestones.filter((m) => m.id.startsWith('streak_')).map((m) => m.id)
  if (streakSeen.length) {
    profile = appendSeenMilestones(profile, streakSeen)
  }

  saveRetentionProfileSync(profile)

  notifyExamPrepMissionProgress({
    domain: plan.missionNotify.domain,
    mode: plan.missionNotify.mode,
    normalizedPercent: plan.missionNotify.normalizedPercent,
    categoryScores: plan.missionNotify.categoryScores,
  })

  const primaryMilestone = pickPrimaryMilestone(milestones)
  const habitBonusXp = plan.milestones
    .filter((m) => m.id.startsWith('exam_habit_streak_'))
    .reduce((s, m) => s + (m.bonusXp ?? 0), 0)

  const examPrepSummary: ExamPrepRetentionSummary = {
    totalXp: xpGained,
    baseXp,
    improvementBonusXp: plan.improvementBonusXp,
    examHabitBonusXp: habitBonusXp,
    examHabitStreak: plan.examHabitStreakNext.current,
    examHabitStreakExtended: plan.examHabitExtended,
    mainStreakExtended: streakExtended,
    primaryLine: plan.summaryLines.primary,
    secondaryLine: plan.summaryLines.secondary,
    badgeLine: plan.summaryLines.badge ?? primaryMilestone?.title,
  }

  return {
    xpGained,
    streak: profile.streak.current,
    streakExtended,
    milestones,
    profile,
    examPrep: examPrepSummary,
  }
}

/** Persists post-A2 pathway choice and emits analytics (single source for selection). */
export function recordPostA2PathwayChoice(input: {
  userId?: string
  choice: PostA2NextOptionId
  recommendedId?: PostA2NextOptionId
}): void {
  const userId = input.userId ?? getRetentionUserId()
  let profile = mergeMetadata(loadRetentionProfileSync(userId))
  const prev = readPostA2PathwayState(profile).choice
  profile = withPostA2PathwayCommitted(profile, input.choice, input.recommendedId)
  saveRetentionProfileSync(profile)

  track(ANALYTICS_EVENTS.post_a2_option_selected, {
    optionId: input.choice,
    recommendedOption: input.recommendedId,
    changedFrom: prev ?? undefined,
  })
  track(ANALYTICS_EVENTS.post_a2_path_routed, {
    choice: input.choice,
    recommendedId: input.recommendedId,
  })
  if (prev && prev !== input.choice) {
    track(ANALYTICS_EVENTS.post_a2_option_changed, {
      from: prev,
      to: input.choice,
    })
  }
}
