import {
  APP_EXAM_SIMULATION_SETUP,
  APP_EXAM_TRAIN_SETUP,
  APP_LANGUAGE_COACH,
  APP_LIBRARY_FROM_YOUR_DAY,
  APP_LISTENING_MODE,
  appTalkTrainingLoopHref,
  readAloudEntryHref,
  speakLiveRunHref,
} from '@/lib/routing/appRoutes'
import type { FromYourDaySuggestionHints } from '@/lib/progression/fromYourDaySuggestionHeuristics'
import { calculateStreakStatus, type StreakUserProgress } from './streakEngine'
import { computePersonalizedPackXp } from './personalizedPackXp'
import { calculateXP, type XpSessionSummary } from './xpEngine'

export type { FromYourDaySuggestionHints } from '@/lib/progression/fromYourDaySuggestionHeuristics'

/** Recent sessions (newest-first recommended); aligns with `SessionSummary`. */
export type SuggestionSessionSummary = {
  sessionId: string
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
  weaknessesTargeted?: string[]
  improvements?: string[]
  createdAt: string
  turns?: number
}

/** Minimal active loop card — compatible with `TalkTrainingLoopCard` / `ApiPersonalizedTrainingLoop`. */
export type SuggestionActiveTrainingLoop = {
  id: string
  title: string
  subtitle?: string | null
  reason: string
  loopType: string
  status: string
  estimatedMinutes?: number
  loopSlot?: number | null
}

/** Optional skills snapshot for stretch / balance heuristics. */
export type SuggestionSkillProfile = {
  overallSkillScore: number | null
  weakestSkills?: string[]
  coldStart?: boolean
}

export type TodaySuggestionUserContext = {
  userProgress: StreakUserProgress
  recentSessions: SuggestionSessionSummary[]
  activeTrainingLoops: SuggestionActiveTrainingLoop[]
  skillProfile?: SuggestionSkillProfile | null
  now: Date
  timeZone?: string
  /** @deprecated Prefer {@link TodaySuggestionUserContext.fromYourDayHints}. Legacy: ready-ish capture count. */
  fromYourDayReadyCount?: number
  /** Rich signals from Quick Capture summary (practice-ready count, struggles, topics). */
  fromYourDayHints?: FromYourDaySuggestionHints | null
}

export type SuggestionKind = 'quick_win' | 'repair' | 'stretch' | 'balance' | 'momentum'

export type SuggestionActionType = 'scenario' | 'listening' | 'read_aloud' | 'coach'

export type Suggestion = {
  id: string
  type: SuggestionKind
  title: string
  description: string
  reason: string
  estimatedTime: number
  xpRewardEstimate: number
  action: {
    type: SuggestionActionType
    config: Record<string, unknown>
  }
}

/** Must match `ScenarioDefinitions.Slug` (e.g. seed `002_seed_mock_scenarios.sql`: `train-station`). */
const DEFAULT_QUICK_SCENARIO_ID = 'train-station'
const DEFAULT_QUICK_LEVEL = 'A2'
const RECENT_WINDOW = 14
const MIN_SESSIONS_IMBALANCE = 5
const LISTENING_SHARE_THRESHOLD = 0.22
const STRETCH_SCORE_THRESHOLD = 62

const SPEAKING_HEAVY_TYPES = new Set<SuggestionSessionSummary['type']>([
  'scenario',
  'coach',
  'read_aloud',
  'chat',
  'exam_simulation',
  'exam_training',
])

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}:${crypto.randomUUID()}`
  }
  return `${prefix}:${Date.now()}:${Math.random().toString(16).slice(2)}`
}

function formatTodayYmd(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function practicedToday(ctx: TodaySuggestionUserContext): boolean {
  const tz = ctx.timeZone ?? 'UTC'
  const referenceYmd = formatTodayYmd(ctx.now, tz)
  const status = calculateStreakStatus(ctx.userProgress, { referenceYmd, timeZone: tz })
  return status.state === 'same_day_as_reference'
}

function isLoopActive(loop: SuggestionActiveTrainingLoop): boolean {
  const s = loop.status.trim().toLowerCase()
  return s === 'active' || s === 'in_progress'
}

function pickPrimaryLoop(loops: SuggestionActiveTrainingLoop[]): SuggestionActiveTrainingLoop | null {
  const active = loops.filter(isLoopActive)
  if (!active.length) return null
  return [...active].sort((a, b) => (a.loopSlot ?? 99) - (b.loopSlot ?? 99))[0] ?? null
}

function sortSessionsRecentFirst(sessions: SuggestionSessionSummary[]): SuggestionSessionSummary[] {
  return [...sessions].sort((a, b) => {
    const ta = Date.parse(a.createdAt)
    const tb = Date.parse(b.createdAt)
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
  })
}

function recentSlice(sessions: SuggestionSessionSummary[]): SuggestionSessionSummary[] {
  const sorted = sortSessionsRecentFirst(sessions)
  return sorted.slice(0, RECENT_WINDOW)
}

function collectWeaknesses(sessions: SuggestionSessionSummary[], max: number): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const s of sessions) {
    const ws = s.weaknessesTargeted
    if (!ws?.length) continue
    for (const w of ws) {
      const t = typeof w === 'string' ? w.trim() : ''
      if (!t || seen.has(t.toLowerCase())) continue
      seen.add(t.toLowerCase())
      out.push(t)
      if (out.length >= max) return out
    }
  }
  return out
}

function weaknessHintsListening(text: string): boolean {
  const t = text.toLowerCase()
  return (
    t.includes('listen') ||
    t.includes('audio') ||
    t.includes('number') ||
    t.includes('time') ||
    t.includes('detail') ||
    t.includes('fast speech')
  )
}

function loopTypeToActionType(loopType: string): SuggestionActionType {
  const t = loopType.toLowerCase()
  if (t.includes('listen')) return 'listening'
  if (t.includes('read_aloud')) return 'read_aloud'
  return 'scenario'
}

function xpEstimate(
  type: XpSessionSummary['type'],
  streak: number,
  patch: Partial<Pick<XpSessionSummary, 'improvements' | 'weaknessesTargeted' | 'turns' | 'durationSeconds'>>,
): number {
  if (type === 'from_your_day') {
    return computePersonalizedPackXp({
      mode: 'standard',
      sessionId: 'suggestion-estimate',
      weaknessesTargeted: patch.weaknessesTargeted ?? [],
      improvements: patch.improvements ?? ['real-life capture practice'],
      sameDayPriorFromYourDayCompletions: 0,
    }).totalXP
  }
  if (type === 'exam_simulation' || type === 'exam_training') {
    return calculateXP(
      {
        type,
        completed: true,
        durationSeconds: patch.durationSeconds ?? 420,
        turns: patch.turns ?? 6,
        meaningfulCompletion: true,
        examXpMeta: {
          scope: 'section',
          runMode: type === 'exam_simulation' ? 'simulation' : 'training',
          timedTraining: type === 'exam_training',
        },
        examTasksCompleted: 5,
        examMinTasks: 3,
        xpBandSeed: 'suggestion-estimate',
      },
      { currentStreak: streak },
    ).totalXP
  }
  return calculateXP(
    {
      type,
      completed: true,
      durationSeconds: patch.durationSeconds ?? 280,
      turns: patch.turns ?? 6,
      improvements: patch.improvements,
      weaknessesTargeted: patch.weaknessesTargeted,
      meaningfulCompletion: false,
    },
    { currentStreak: streak },
  ).totalXP
}

function buildExamReadAloudTimedSuggestion(ctx: TodaySuggestionUserContext, weaknesses: string[]): Suggestion {
  const streak = ctx.userProgress.currentStreak
  return {
    id: newId('exam_read_aloud_pressure'),
    type: 'repair',
    title: 'Read aloud — rebuild pacing under pressure',
    description:
      'Exam timers squeezed delivery; slow read-throughs restore clear articulation before the next timed block.',
    reason: `Your recent exam work flagged timed speaking pressure (${weaknesses.slice(0, 2).join(' · ')}).`,
    estimatedTime: 12,
    xpRewardEstimate: xpEstimate('read_aloud', streak, {
      weaknessesTargeted: weaknesses.slice(0, 4),
      durationSeconds: 360,
      turns: 4,
    }),
    action: {
      type: 'read_aloud',
      config: {
        intent: 'exam_timer_recovery',
        focusKeys: weaknesses,
        readAloudProfile: 'exam_pressure',
        href: readAloudEntryHref('exam_pressure'),
      },
    },
  }
}

function buildExamScenarioFlowSuggestion(ctx: TodaySuggestionUserContext, weaknesses: string[]): Suggestion {
  const streak = ctx.userProgress.currentStreak
  const href = speakLiveRunHref({
    scenarioId: 'social_plans',
    level: DEFAULT_QUICK_LEVEL,
  })
  return {
    id: newId('exam_scenario_flow'),
    type: 'repair',
    title: 'Speak Live — keep the conversation moving',
    description: 'Short roleplay-style turns practice reacting, follow-ups, and natural flow.',
    reason: `Exam signals point at conversational follow-through (${weaknesses.slice(0, 2).join(' · ')}).`,
    estimatedTime: 14,
    xpRewardEstimate: xpEstimate('scenario', streak, {
      weaknessesTargeted: weaknesses.slice(0, 4),
      durationSeconds: 420,
      turns: 8,
    }),
    action: {
      type: 'scenario',
      config: {
        intent: 'exam_roleplay_followup',
        scenarioId: 'social_plans',
        level: DEFAULT_QUICK_LEVEL,
        href,
      },
    },
  }
}

function buildExamTimedSimulationSuggestion(ctx: TodaySuggestionUserContext): Suggestion {
  const streak = ctx.userProgress.currentStreak
  return {
    id: newId('exam_sim_timing'),
    type: 'momentum',
    title: 'Timed simulation — check readiness under exam clocks',
    description: 'A strict simulation validates whether skills hold when timers advance the flow automatically.',
    reason: 'Readiness is close but not locked — a short simulation timing pass is the honest next check.',
    estimatedTime: 22,
    xpRewardEstimate: xpEstimate('exam_simulation', streak, { durationSeconds: 900, turns: 6 }),
    action: {
      type: 'coach',
      config: {
        intent: 'exam_simulation_timing',
        href: APP_EXAM_SIMULATION_SETUP,
      },
    },
  }
}

function buildExamCoachReasoningSuggestion(ctx: TodaySuggestionUserContext, weaknesses: string[]): Suggestion {
  const streak = ctx.userProgress.currentStreak
  return {
    id: newId('exam_coach_reasoning'),
    type: 'stretch',
    title: 'Coach mode — stretch opinions and reasons',
    description: 'Free-form coaching lets you rehearse stance, nuance, and connectors without exam prompts.',
    reason: `Exam evidence suggests tightening reasoning and nuance (${weaknesses.slice(0, 2).join(' · ')}).`,
    estimatedTime: 16,
    xpRewardEstimate: xpEstimate('coach', streak, {
      weaknessesTargeted: weaknesses.slice(0, 4),
      durationSeconds: 520,
      turns: 10,
    }),
    action: {
      type: 'coach',
      config: {
        intent: 'exam_reasoning_coach',
        href: APP_LANGUAGE_COACH,
        difficultyBias: 'balanced',
      },
    },
  }
}

function buildExamFocusSuggestion(ctx: TodaySuggestionUserContext): Suggestion {
  const streak = ctx.userProgress.currentStreak
  return {
    id: newId('exam_focus'),
    type: 'repair',
    title: 'Exam Train — tighten readiness',
    description: 'Guided oral tasks with hints, retries, and coaching — then retry a timed check.',
    reason: 'Recent exam work flagged a readiness gap; short Train reps convert that into stable skill.',
    estimatedTime: 18,
    xpRewardEstimate: xpEstimate('exam_training', streak, { durationSeconds: 560, turns: 7 }),
    action: {
      type: 'coach',
      config: {
        intent: 'exam_readiness',
        href: APP_EXAM_TRAIN_SETUP,
      },
    },
  }
}

function buildStreakQuickWin(ctx: TodaySuggestionUserContext): Suggestion {
  const streak = ctx.userProgress.currentStreak
  const href = speakLiveRunHref({
    scenarioId: DEFAULT_QUICK_SCENARIO_ID,
    level: DEFAULT_QUICK_LEVEL,
  })
  return {
    id: newId('streak_quick'),
    type: 'quick_win',
    title: 'One quick scenario today',
    description: 'A short Speak Live practice keeps your streak on track.',
    reason: 'Keep your streak alive with one meaningful session today.',
    estimatedTime: 8,
    xpRewardEstimate: xpEstimate('scenario', streak, { durationSeconds: 240, turns: 5 }),
    action: {
      type: 'scenario',
      config: {
        intent: 'streak_quick_win',
        scenarioId: DEFAULT_QUICK_SCENARIO_ID,
        level: DEFAULT_QUICK_LEVEL,
        href,
      },
    },
  }
}

function buildRepairFromLoop(ctx: TodaySuggestionUserContext, loop: SuggestionActiveTrainingLoop): Suggestion {
  const actionType = loopTypeToActionType(loop.loopType)
  const streak = ctx.userProgress.currentStreak
  const minutes = typeof loop.estimatedMinutes === 'number' && loop.estimatedMinutes > 0 ? loop.estimatedMinutes : 10
  return {
    id: newId('repair_loop'),
    type: 'repair',
    title: loop.title || 'Finish your training loop',
    description: loop.subtitle?.trim() || 'Pick up the personalized loop from your last session.',
    reason: loop.reason?.trim() || 'You have an active loop waiting — closing it locks in your progress.',
    estimatedTime: minutes,
    xpRewardEstimate: xpEstimate(actionType === 'listening' ? 'listening' : actionType === 'read_aloud' ? 'read_aloud' : 'scenario', streak, {
      durationSeconds: minutes * 60,
      turns: 8,
    }),
    action: {
      type: actionType,
      config: {
        intent: 'active_training_loop',
        loopId: loop.id,
        loopType: loop.loopType,
        href: appTalkTrainingLoopHref(loop.id),
      },
    },
  }
}

function buildWeaknessDrill(ctx: TodaySuggestionUserContext, weaknesses: string[]): Suggestion {
  const streak = ctx.userProgress.currentStreak
  const primary = weaknesses[0] ?? 'recent feedback'
  const preferListening = weaknesses.some(weaknessHintsListening)
  if (preferListening) {
    return {
      id: newId('weakness_listen'),
      type: 'momentum',
      title: 'Practice fast transport replies',
      description: 'Short listening bursts sharpen the details you just missed in conversation.',
      reason: `Recent practice flagged listening-focused gaps (${primary}).`,
      estimatedTime: 12,
      xpRewardEstimate: xpEstimate('listening', streak, {
        weaknessesTargeted: weaknesses.slice(0, 3),
        durationSeconds: 360,
        turns: 4,
      }),
      action: {
        type: 'listening',
        config: {
          intent: 'weakness_listening',
          focusKeys: weaknesses,
          href: APP_LISTENING_MODE,
          presetLevel: DEFAULT_QUICK_LEVEL,
        },
      },
    }
  }

  const profileSlug = primary
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48)

  return {
    id: newId('weakness_read'),
    type: 'repair',
    title: 'Read aloud to improve pacing',
    description: 'Slow, clear read-throughs rebuild muscle memory for tricky phrases.',
    reason: `Your last sessions highlighted: ${weaknesses.slice(0, 3).join(' · ')}.`,
    estimatedTime: 10,
    xpRewardEstimate: xpEstimate('read_aloud', streak, {
      weaknessesTargeted: weaknesses.slice(0, 3),
      durationSeconds: 300,
      turns: 3,
    }),
    action: {
      type: 'read_aloud',
      config: {
        intent: 'weakness_read_aloud',
        focusKeys: weaknesses,
        readAloudProfile: profileSlug || 'general',
        href: readAloudEntryHref(profileSlug || null),
      },
    },
  }
}

function modalityListeningImbalance(sessions: SuggestionSessionSummary[]): boolean {
  if (sessions.length < MIN_SESSIONS_IMBALANCE) return false
  let speak = 0
  let listen = 0
  for (const s of sessions) {
    if (s.type === 'listening') listen += 1
    else if (SPEAKING_HEAVY_TYPES.has(s.type)) speak += 1
  }
  const denom = speak + listen
  if (denom < MIN_SESSIONS_IMBALANCE) return false
  const share = listen / denom
  return share < LISTENING_SHARE_THRESHOLD
}

function buildListeningBalance(ctx: TodaySuggestionUserContext): Suggestion {
  const streak = ctx.userProgress.currentStreak
  return {
    id: newId('balance_listen'),
    type: 'balance',
    title: 'Balance speaking with listening',
    description: 'Give your ears a dedicated workout so comprehension keeps pace with production.',
    reason: 'Recent sessions skew heavily toward speaking — listening rounds out retention.',
    estimatedTime: 15,
    xpRewardEstimate: xpEstimate('listening', streak, { durationSeconds: 420, turns: 6 }),
    action: {
      type: 'listening',
      config: {
        intent: 'modality_balance',
        href: APP_LISTENING_MODE,
        presetLevel: DEFAULT_QUICK_LEVEL,
      },
    },
  }
}

function buildStretchCoach(ctx: TodaySuggestionUserContext): Suggestion {
  const streak = ctx.userProgress.currentStreak
  return {
    id: newId('stretch_coach'),
    type: 'stretch',
    title: 'Stretch with a coach challenge',
    description: 'A longer, freer conversation pushes fluency beyond scripted scenarios.',
    reason: 'Your recent performance looks strong — time to stretch with adaptive coaching.',
    estimatedTime: 18,
    xpRewardEstimate: xpEstimate('coach', streak, { durationSeconds: 540, turns: 12, improvements: ['flow'] }),
    action: {
      type: 'coach',
      config: {
        intent: 'progression_stretch',
        href: APP_LANGUAGE_COACH,
        difficultyBias: 'stretch',
      },
    },
  }
}

function buildStretchScenario(ctx: TodaySuggestionUserContext): Suggestion {
  const streak = ctx.userProgress.currentStreak
  const href = speakLiveRunHref({
    scenarioId: 'ordering_food',
    level: 'B1',
  })
  return {
    id: newId('stretch_scenario'),
    type: 'stretch',
    title: 'Try a harder scenario',
    description: 'Level up to a B1 ordering flow with richer vocabulary and faster turns.',
    reason: 'Solid streaks deserve a stretch goal — bump the difficulty and keep momentum.',
    estimatedTime: 14,
    xpRewardEstimate: xpEstimate('scenario', streak, { durationSeconds: 400, turns: 10, improvements: ['richer replies'] }),
    action: {
      type: 'scenario',
      config: {
        intent: 'progression_stretch',
        scenarioId: 'ordering_food',
        level: 'B1',
        href,
      },
    },
  }
}

function strongRecentPerformance(sessions: SuggestionSessionSummary[]): boolean {
  const completed = sessions.filter((s) => s.completed && s.durationSeconds >= 90)
  if (completed.length < 3) return false
  let imp = 0
  for (const s of completed.slice(0, 6)) {
    imp += s.improvements?.length ?? 0
  }
  return imp >= 3
}

function shouldStretch(ctx: TodaySuggestionUserContext, recent: SuggestionSessionSummary[]): boolean {
  const score = ctx.skillProfile?.overallSkillScore
  const cold = ctx.skillProfile?.coldStart
  if (score != null && score >= STRETCH_SCORE_THRESHOLD && !cold) return true
  return strongRecentPerformance(recent)
}

function hadFromYourDaySessionToday(
  recent: SuggestionSessionSummary[],
  ymd: string,
  timeZone: string,
): boolean {
  for (const s of recent) {
    if (s.type !== 'from_your_day') continue
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(s.createdAt))
    if (day === ymd) return true
  }
  return false
}

function effectiveFromYourDayReadyCount(ctx: TodaySuggestionUserContext): number {
  if (ctx.fromYourDayHints && Number.isFinite(ctx.fromYourDayHints.practiceReadyCount)) {
    return ctx.fromYourDayHints.practiceReadyCount
  }
  return ctx.fromYourDayReadyCount ?? 0
}

function weakOverlapFromHints(
  hints: FromYourDaySuggestionHints,
  sessionWeaknesses: string[],
  weakestSkills?: string[] | null,
): number {
  const hay = [...hints.primarySnippets, ...hints.previewFragments].join(' ').toLowerCase()
  if (!hay.trim()) return 0
  const bag = [...sessionWeaknesses, ...(weakestSkills ?? [])]
    .map((w) => (typeof w === 'string' ? w.trim().toLowerCase() : ''))
    .filter((w) => w.length >= 4)
  let score = 0
  for (const w of bag.slice(0, 12)) {
    if (hay.includes(w)) score += 16
    else {
      for (const part of w.split(/[^a-z0-9]+/).filter((p) => p.length >= 5).slice(0, 4)) {
        if (hay.includes(part)) score += 9
      }
    }
  }
  return Math.min(44, score)
}

function shouldPrioritizeFromYourDayBeforeWeaknesses(
  ctx: TodaySuggestionUserContext,
  hints: FromYourDaySuggestionHints | null | undefined,
  weaknesses: string[],
): boolean {
  const n = effectiveFromYourDayReadyCount(ctx)
  if (n < 1) return false
  if (!hints) return n >= 2
  if (hints.struggleCaptureCount >= 1) return true
  if (hints.maxSameTopicRepeats >= 2) return true
  if (hints.practiceReadyCount >= 3) return true
  if (hints.suggestionPriorityScore >= 44) return true
  if (weakOverlapFromHints(hints, weaknesses, ctx.skillProfile?.weakestSkills) >= 12) return true
  return false
}

function buildFromYourDaySuggestion(
  ctx: TodaySuggestionUserContext,
  readyCount: number,
  ymd: string,
  hints?: FromYourDaySuggestionHints | null,
): Suggestion {
  const streak = ctx.userProgress.currentStreak
  const href = `${APP_LIBRARY_FROM_YOUR_DAY}?date=${encodeURIComponent(ymd)}`
  const recent = recentSlice(ctx.recentSessions)
  const weaknessList = collectWeaknesses(recent, 5)
  const preview =
    hints?.previewFragments?.length ? hints.previewFragments.slice(0, 3).join(' + ') : null

  let title = 'Practice the Dutch you captured today'
  if (hints && hints.struggleCaptureCount >= 1 && readyCount >= 1) {
    title = "Turn today's sticky Dutch into practice"
  } else if (readyCount >= 3) {
    title = `You saved ${readyCount} useful Dutch moments today`
  } else if (readyCount === 1 && preview) {
    title = 'Practice the Dutch you saved today'
  }

  const defaultDescription =
    'A short pack built from real words, phrases, and moments you captured — clustered, not a long list.'
  const description = preview
    ? `Moments from your day: ${preview}. One compact pack so it is easy to finish tonight.`
    : defaultDescription

  let reason =
    readyCount === 1
      ? 'You have one useful moment ready in Library.'
      : `You have ${readyCount} useful Dutch moments ready to practice.`
  if (hints && hints.struggleCaptureCount >= 1) {
    reason =
      'You marked real friction while out — a short pack replays those lines before the context fades.'
  } else if (hints && hints.maxSameTopicRepeats >= 2) {
    reason = 'Several saves point at the same kind of situation — one pass now beats scattered reviews later.'
  } else if (hints && weakOverlapFromHints(hints, weaknessList, ctx.skillProfile?.weakestSkills) >= 12) {
    reason = 'What you captured today lines up with skills you are already tightening — efficient consolidation.'
  }

  const estimatedTime = Math.min(10, 4 + Math.min(4, readyCount) + (hints?.struggleCaptureCount ? 1 : 0))

  return {
    id: newId('from_your_day'),
    type: 'momentum',
    title,
    description,
    reason,
    estimatedTime,
    xpRewardEstimate: xpEstimate('from_your_day', streak, { durationSeconds: 220 + readyCount * 35, turns: 4 }),
    action: {
      type: 'read_aloud',
      config: {
        intent: 'from_your_day_pack',
        href,
        previewLine: preview ?? undefined,
        capturePriorityScore: hints?.suggestionPriorityScore,
      },
    },
  }
}

function buildDefaultBalance(ctx: TodaySuggestionUserContext): Suggestion {
  const streak = ctx.userProgress.currentStreak
  const href = speakLiveRunHref({ scenarioId: DEFAULT_QUICK_SCENARIO_ID, level: DEFAULT_QUICK_LEVEL })
  return {
    id: newId('default_balance'),
    type: 'balance',
    title: 'Light scenario + listening mix',
    description: 'Pair a compact Speak Live drill with a short listening set.',
    reason: 'A balanced block keeps skills from drifting toward a single modality.',
    estimatedTime: 20,
    xpRewardEstimate: xpEstimate('scenario', streak, { durationSeconds: 360, turns: 7 }),
    action: {
      type: 'scenario',
      config: {
        intent: 'default_balance',
        scenarioId: DEFAULT_QUICK_SCENARIO_ID,
        level: DEFAULT_QUICK_LEVEL,
        href,
        companionListeningHref: APP_LISTENING_MODE,
      },
    },
  }
}

/**
 * Priority: streak risk → active training loop → from-your-day (2+ ready, or high-priority signals) → weaknesses →
 * from-your-day (single / softer signals) → modality imbalance → stretch → balanced default.
 */
export function generateTodaySuggestion(ctx: TodaySuggestionUserContext): Suggestion {
  const recent = recentSlice(ctx.recentSessions)
  const tz = ctx.timeZone ?? 'UTC'
  const ymd = formatTodayYmd(ctx.now, tz)
  const hints = ctx.fromYourDayHints ?? null
  const fyReady = effectiveFromYourDayReadyCount(ctx)
  const fyEligible = fyReady >= 1 && !hadFromYourDaySessionToday(recent, ymd, tz)

  if (!practicedToday(ctx)) {
    return buildStreakQuickWin(ctx)
  }

  const loop = pickPrimaryLoop(ctx.activeTrainingLoops)
  if (loop) {
    return buildRepairFromLoop(ctx, loop)
  }

  const weaknesses = collectWeaknesses(recent, 5)

  if (
    weaknesses.some(
      (w) =>
        w.includes('exam_pronunciation_timer') ||
        w.includes('exam_timed_speaking') ||
        w.includes('exam_pronunciation_weak'),
    )
  ) {
    return buildExamReadAloudTimedSuggestion(ctx, weaknesses)
  }

  if (weaknesses.some((w) => w.includes('exam_roleplay_weak') || w.includes('exam_followup_weak'))) {
    return buildExamScenarioFlowSuggestion(ctx, weaknesses)
  }

  if (
    weaknesses.some(
      (w) =>
        w.includes('exam_simulation_next') ||
        w.includes('exam_readiness_focus') ||
        w.toLowerCase().includes('exam_readiness'),
    )
  ) {
    return buildExamTimedSimulationSuggestion(ctx)
  }

  if (weaknesses.some((w) => w.includes('exam_reasoning_weak'))) {
    return buildExamCoachReasoningSuggestion(ctx, weaknesses)
  }

  if (
    weaknesses.some(
      (w) =>
        w.toLowerCase().includes('exam_readiness') ||
        w.toLowerCase().startsWith('exam_dim:') ||
        w.toLowerCase().includes('exam_borderline'),
    )
  ) {
    return buildExamFocusSuggestion(ctx)
  }

  if (fyEligible && fyReady >= 2) {
    return buildFromYourDaySuggestion(ctx, fyReady, ymd, hints)
  }

  if (fyEligible && shouldPrioritizeFromYourDayBeforeWeaknesses(ctx, hints, weaknesses)) {
    return buildFromYourDaySuggestion(ctx, fyReady, ymd, hints)
  }

  if (weaknesses.length) {
    return buildWeaknessDrill(ctx, weaknesses)
  }

  if (fyEligible) {
    return buildFromYourDaySuggestion(ctx, fyReady, ymd, hints)
  }

  if (modalityListeningImbalance(recent)) {
    return buildListeningBalance(ctx)
  }

  if (shouldStretch(ctx, recent)) {
    return ctx.userProgress.currentStreak >= 5 ? buildStretchScenario(ctx) : buildStretchCoach(ctx)
  }

  return buildDefaultBalance(ctx)
}
