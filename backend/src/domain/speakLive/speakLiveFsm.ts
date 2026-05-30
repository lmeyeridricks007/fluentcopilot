import type { ScenarioRuntimeConfig } from '../../models/contracts'
import {
  type LanguageCoachGuideCorrectionLoop,
  type LanguageCoachGuideRepeatMode,
  type LanguageCoachIssueType,
  type LanguageCoachNudgeEvent,
  type LanguageCoachNudgeSeverity,
  type LanguageCoachNudgeType,
  type LanguageCoachPendingNudgePlan,
  type LanguageCoachPersistedBlob,
  normalizeLanguageCoachConversationRole,
} from './languageCoachSessionTypes'
import { parseBookingReservationsScenarioRuntimeConfig } from './bookingReservationsScenario'
import { parseStoreServiceIssueScenarioRuntimeConfig } from './storeServiceIssueScenario'
import { parseWorkColleagueInteractionScenarioRuntimeConfig } from './workColleagueInteractionScenario'
import { parseHousingLandlordScenarioRuntimeConfig } from './housingLandlordScenario'
import { parseDirectionsGettingSomewhereScenarioRuntimeConfig } from './directionsGettingSomewhereScenario'
import { parseDoctorPharmacyScenarioRuntimeConfig } from './doctorPharmacyScenario'
import { parsePhoneCallScenarioRuntimeConfig } from './phoneCallScenario'
import { parseSmallTalkScenarioRuntimeConfig } from './smallTalkScenario'
import { parseMeetingNewPeopleScenarioRuntimeConfig } from './meetingNewPeopleScenario'
import { parsePartySocialScenarioRuntimeConfig } from './partySocialScenario'
import { parseExplainingSomethingScenarioRuntimeConfig } from './explainingSomethingScenario'
import { parseStorytellingScenarioRuntimeConfig } from './storytellingScenario'
import { parseOpinionsDiscussionsScenarioRuntimeConfig } from './opinionsDiscussionsScenario'
import { parseOrderingFoodScenarioRuntimeConfig } from './orderingFoodScenario'
import { parsePublicTransportScenarioRuntimeConfig } from './publicTransportScenario'
import { parseSupermarketShopScenarioRuntimeConfig } from './supermarketShopScenario'
import type { ScenarioSessionState } from './trainStationSlotState'
import { parseScenarioSessionState } from './trainStationSlotState'
import type { SpeakLiveSupportStrategy } from './speakLiveSupportStrategy'

/** Canonical Speak Live phases (ordered practice arc). */
export const SPEAK_LIVE_PHASES = [
  'greeting',
  'intent_detection',
  'clarification',
  'execution',
  'closing',
] as const

export type SpeakLivePhase = (typeof SPEAK_LIVE_PHASES)[number]

/** Model-provided hints consumed by the deterministic FSM (reply-only JSON). */
export type SpeakLiveSignals = {
  nextPhase?: SpeakLivePhase
  intentLabel?: string
  needsClarification?: boolean
  goalIndexesCompleted?: number[]
  advancePrimaryGoal?: boolean
  readyForClosing?: boolean
  rollingSummaryEnglish?: string
}

export type SpeakLivePersistedState = {
  version: 1
  phase: SpeakLivePhase
  /** Index into scenario `goals[]` currently being pursued in `execution`. */
  goalIndex: number
  /** Completed goal indexes (subset of 0..n-1). */
  goalsCompleted: number[]
  clarificationRounds: number
  /** Short English rolling context for prompts (also mirrored to thread summary when possible). */
  rollingSummaryEnglish: string
  intentLabel: string | null
  updatedAt: string
  /**
   * Internal coaching parameters (level/scenario-derived). Not shown as Guided/Free in product UI.
   * Older sessions may omit this — prompts fall back to legacy `thread.mode` wording.
   */
  supportStrategy?: SpeakLiveSupportStrategy
  /** Train Station: explicit slot/session tracking (optional). */
  scenarioSessionState?: ScenarioSessionState | null
  /** Speak Live scenario-specific runtime definition (ordering_food, future dynamic scenes). */
  scenarioRuntimeConfig?: ScenarioRuntimeConfig | null
  /**
   * Dev-only: last turn grounding / prompt snapshot (see `speakLiveGroundingDebugEnabled()`).
   * Omitted in production; stripped when debug is off server-side.
   */
  lastGroundingDebug?: Record<string, unknown> | null
  /** Free-form Language Coach session parameters + weakness memory (`language_coach` only). */
  languageCoach?: LanguageCoachPersistedBlob
}

const MAX_CLARIFICATION_ROUNDS = 4

const LANGUAGE_COACH_GOALS = new Set([
  'general',
  'fluency',
  'pronunciation',
  'grammar',
  'confidence',
  'storytelling',
  'follow_up_questions',
])
const LANGUAGE_COACH_FEEDBACK = new Set(['subtle_and_end', 'at_end_only', 'every_turn'])
const LANGUAGE_COACH_STYLES = new Set(['supportive', 'balanced', 'challenging'])
const LANGUAGE_COACH_PERSONAS = new Set(['local', 'coach', 'casual'])

const NUDGE_TYPES = new Set(['RECAST', 'CLARIFY', 'EXPAND', 'MODEL'])
const NUDGE_SEVERITIES = new Set(['minor', 'medium', 'major'])
const GUIDE_REPEAT_MODES = new Set<LanguageCoachGuideRepeatMode>(['start', 'retry'])
const ISSUE_TYPES = new Set<LanguageCoachIssueType>([
  'tense_issue',
  'word_order_issue',
  'article_preposition_issue',
  'question_form_issue',
  'weak_follow_up',
  'simple_structure_overuse',
  'word_choice_issue',
  'low_clarity',
])

function parseNudgeEvents(raw: unknown): LanguageCoachNudgeEvent[] {
  if (!Array.isArray(raw)) return []
  const out: LanguageCoachNudgeEvent[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const o = item as Record<string, unknown>
    const nt = o.nudgeType
    const sev = o.severity
    if (typeof nt !== 'string' || !NUDGE_TYPES.has(nt)) continue
    if (typeof sev !== 'string' || !NUDGE_SEVERITIES.has(sev)) continue
    const detected = Array.isArray(o.detectedIssueTypes)
      ? o.detectedIssueTypes.filter((x): x is LanguageCoachIssueType => typeof x === 'string' && ISSUE_TYPES.has(x as LanguageCoachIssueType))
      : []
    const lr = o.learnerRecoveredLater
    const recovered =
      lr === true || lr === false ? lr : lr === null ? null : null
    const coachTurnIndex = typeof o.coachTurnIndex === 'number' && o.coachTurnIndex >= 0 ? Math.floor(o.coachTurnIndex) : 0
    const createdAt = typeof o.createdAt === 'string' && o.createdAt.trim() ? o.createdAt.trim().slice(0, 40) : new Date().toISOString()
    out.push({
      nudgeType: nt as LanguageCoachNudgeType,
      learnerOriginal: typeof o.learnerOriginal === 'string' ? o.learnerOriginal.slice(0, 2000) : '',
      coachResponse: typeof o.coachResponse === 'string' ? o.coachResponse.slice(0, 4000) : '',
      detectedIssueTypes: detected.length ? detected : ['low_clarity'],
      severity: sev as LanguageCoachNudgeSeverity,
      learnerRecoveredLater: recovered,
      coachTurnIndex,
      createdAt,
    })
  }
  return out.slice(0, 48)
}

function parseSessionSignalsMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      out[k.slice(0, 48)] = Math.min(500, Math.floor(v))
    }
  }
  return out
}

function parseTopicsTokensMentioned(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.toLowerCase().replace(/[^a-zà-ÿ0-9-]/gi, '').slice(0, 32))
    .filter(Boolean)
    .slice(0, 24)
}

function parseRecentCoachLeadIns(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.replace(/\s+/g, ' ').trim().slice(0, 64))
    .filter(Boolean)
    .slice(-6)
}

function parseVocabStemHits(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      out[k.slice(0, 32)] = Math.min(200, Math.floor(v))
    }
  }
  return out
}

function parsePendingNudgePlan(raw: unknown): LanguageCoachPendingNudgePlan | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const nt = o.nudgeType
  const sev = o.severity
  if (typeof nt !== 'string' || !NUDGE_TYPES.has(nt)) return null
  if (typeof sev !== 'string' || !NUDGE_SEVERITIES.has(sev)) return null
  const detected = Array.isArray(o.detectedIssueTypes)
    ? o.detectedIssueTypes.filter((x): x is LanguageCoachIssueType => typeof x === 'string' && ISSUE_TYPES.has(x as LanguageCoachIssueType))
    : []
  const coachTurnIndexBeforeReply =
    typeof o.coachTurnIndexBeforeReply === 'number' && o.coachTurnIndexBeforeReply >= 0
      ? Math.floor(o.coachTurnIndexBeforeReply)
      : 0
  const promptDirective =
    typeof o.promptDirective === 'string' && o.promptDirective.trim() ? o.promptDirective.trim().slice(0, 1200) : ''
  if (!promptDirective) return null
  const guideRepeatModeRaw = o.guideRepeatMode
  const guideRepeatMode =
    typeof guideRepeatModeRaw === 'string' && GUIDE_REPEAT_MODES.has(guideRepeatModeRaw as LanguageCoachGuideRepeatMode)
      ? (guideRepeatModeRaw as LanguageCoachGuideRepeatMode)
      : undefined
  const guideRepeatCountRaw = o.guideRepeatCount
  const guideRepeatCount =
    typeof guideRepeatCountRaw === 'number' && Number.isFinite(guideRepeatCountRaw) && guideRepeatCountRaw > 0
      ? Math.min(3, Math.floor(guideRepeatCountRaw))
      : undefined
  return {
    nudgeType: nt as LanguageCoachNudgeType,
    learnerOriginal: typeof o.learnerOriginal === 'string' ? o.learnerOriginal.slice(0, 2000) : '',
    detectedIssueTypes: detected.length ? detected : ['low_clarity'],
    severity: sev as LanguageCoachNudgeSeverity,
    coachTurnIndexBeforeReply,
    promptDirective,
    ...(guideRepeatMode ? { guideRepeatMode } : {}),
    ...(guideRepeatCount != null ? { guideRepeatCount } : {}),
  }
}

function parseGuideCorrectionLoop(raw: unknown): LanguageCoachGuideCorrectionLoop | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const targetLine = typeof o.targetLine === 'string' ? o.targetLine.replace(/\s+/g, ' ').trim().slice(0, 240) : ''
  if (!targetLine) return null
  const issueTypes = Array.isArray(o.issueTypes)
    ? o.issueTypes.filter((x): x is LanguageCoachIssueType => typeof x === 'string' && ISSUE_TYPES.has(x as LanguageCoachIssueType))
    : []
  const severity = o.severity
  if (typeof severity !== 'string' || !NUDGE_SEVERITIES.has(severity)) return null
  const repeatCountRaw = o.repeatCount
  const repeatCount =
    typeof repeatCountRaw === 'number' && Number.isFinite(repeatCountRaw) && repeatCountRaw > 0
      ? Math.min(3, Math.floor(repeatCountRaw))
      : 1
  const coachTurnIndexStartedRaw = o.coachTurnIndexStarted
  const coachTurnIndexStarted =
    typeof coachTurnIndexStartedRaw === 'number' && Number.isFinite(coachTurnIndexStartedRaw) && coachTurnIndexStartedRaw >= 0
      ? Math.floor(coachTurnIndexStartedRaw)
      : 0
  return {
    targetLine,
    issueTypes: issueTypes.length ? issueTypes : ['low_clarity'],
    severity: severity as LanguageCoachNudgeSeverity,
    repeatCount,
    sourceLearnerOriginal: typeof o.sourceLearnerOriginal === 'string' ? o.sourceLearnerOriginal.slice(0, 400) : '',
    coachTurnIndexStarted,
  }
}

function parseLanguageCoachPersisted(raw: unknown): LanguageCoachPersistedBlob | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const o = raw as Record<string, unknown>
  const cg = o.conversationGoal
  const fs = o.feedbackStyle
  const cs = o.coachStyle
  const ps = o.personaStyle
  if (typeof cg !== 'string' || !LANGUAGE_COACH_GOALS.has(cg)) return undefined
  if (typeof fs !== 'string' || !LANGUAGE_COACH_FEEDBACK.has(fs)) return undefined
  if (typeof cs !== 'string' || !LANGUAGE_COACH_STYLES.has(cs)) return undefined
  if (typeof ps !== 'string' || !LANGUAGE_COACH_PERSONAS.has(ps)) return undefined
  const learnerFactLinesEnglish = Array.isArray(o.learnerFactLinesEnglish)
    ? o.learnerFactLinesEnglish.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 400))
    : []
  const weaknessHits: Record<string, number> = {}
  if (o.weaknessHits && typeof o.weaknessHits === 'object' && !Array.isArray(o.weaknessHits)) {
    for (const [k, v] of Object.entries(o.weaknessHits as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) weaknessHits[k.slice(0, 48)] = Math.min(500, Math.floor(v))
    }
  }
  const coachTurnIndex = typeof o.coachTurnIndex === 'number' && o.coachTurnIndex >= 0 ? Math.floor(o.coachTurnIndex) : 0
  const sessionFocusChip =
    typeof o.sessionFocusChip === 'string' && o.sessionFocusChip.trim() ? o.sessionFocusChip.trim().slice(0, 120) : null
  const learnerPinnedLessonFocusEnglish =
    typeof o.learnerPinnedLessonFocusEnglish === 'string' && o.learnerPinnedLessonFocusEnglish.trim()
      ? o.learnerPinnedLessonFocusEnglish.trim().slice(0, 220)
      : null
  const nudgeEvents = parseNudgeEvents(o.nudgeEvents)
  const pendingNudgePlan = parsePendingNudgePlan(o.pendingNudgePlan)
  const lastNudgeCoachTurnIndexRaw = o.lastNudgeCoachTurnIndex
  const lastNudgeCoachTurnIndex =
    typeof lastNudgeCoachTurnIndexRaw === 'number' && Number.isFinite(lastNudgeCoachTurnIndexRaw)
      ? Math.max(-1, Math.floor(lastNudgeCoachTurnIndexRaw))
      : -1
  const sessionSignals = parseSessionSignalsMap(o.sessionSignals)
  const topicsTokensMentioned = parseTopicsTokensMentioned(o.topicsTokensMentioned)
  const recentCoachLeadIns = parseRecentCoachLeadIns(o.recentCoachLeadIns)
  const vocabStemHits = parseVocabStemHits(o.vocabStemHits)
  const activeGuideCorrection = parseGuideCorrectionLoop(o.activeGuideCorrection)
  const conversationRole = normalizeLanguageCoachConversationRole(o.conversationRole)
  const guideRaw = o.coachGuideWhileSpeaking
  const coachGuideWhileSpeaking =
    conversationRole === 'coach' &&
    (guideRaw === true || guideRaw === 'true' || guideRaw === 1 || guideRaw === '1')
  return {
    conversationGoal: cg as LanguageCoachPersistedBlob['conversationGoal'],
    feedbackStyle: fs as LanguageCoachPersistedBlob['feedbackStyle'],
    coachStyle: cs as LanguageCoachPersistedBlob['coachStyle'],
    personaStyle: ps as LanguageCoachPersistedBlob['personaStyle'],
    conversationRole,
    coachGuideWhileSpeaking,
    learnerFactLinesEnglish: learnerFactLinesEnglish.slice(0, 24),
    weaknessHits,
    coachTurnIndex,
    sessionFocusChip,
    learnerPinnedLessonFocusEnglish,
    nudgeEvents,
    pendingNudgePlan,
    lastNudgeCoachTurnIndex,
    ...(activeGuideCorrection ? { activeGuideCorrection } : {}),
    sessionSignals,
    topicsTokensMentioned,
    recentCoachLeadIns,
    vocabStemHits,
  }
}

function isPhase(x: string): x is SpeakLivePhase {
  return (SPEAK_LIVE_PHASES as readonly string[]).includes(x)
}

/** Allowed single-step transitions (current → next). Model hints outside this set are clamped. */
const ALLOWED: Record<SpeakLivePhase, Set<SpeakLivePhase>> = {
  greeting: new Set(['greeting', 'intent_detection']),
  intent_detection: new Set(['intent_detection', 'clarification', 'execution']),
  clarification: new Set(['clarification', 'execution', 'intent_detection']),
  execution: new Set(['execution', 'clarification', 'closing']),
  closing: new Set(['closing']),
}

function parseSupportStrategy(raw: unknown): SpeakLiveSupportStrategy | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const o = raw as Record<string, unknown>
  const coachingTightness = o.coachingTightness
  const assistanceLevel = o.assistanceLevel
  const interruptionPolicy = o.interruptionPolicy
  const hintFrequency = o.hintFrequency
  if (
    coachingTightness !== 'loose' &&
    coachingTightness !== 'balanced' &&
    coachingTightness !== 'tight'
  )
    return undefined
  if (assistanceLevel !== 'light' && assistanceLevel !== 'standard' && assistanceLevel !== 'high') return undefined
  if (
    interruptionPolicy !== 'defer_to_learner' &&
    interruptionPolicy !== 'balanced' &&
    interruptionPolicy !== 'coach_forward'
  )
    return undefined
  if (hintFrequency !== 'minimal' && hintFrequency !== 'normal' && hintFrequency !== 'rich') return undefined
  return { coachingTightness, assistanceLevel, interruptionPolicy, hintFrequency }
}

export function defaultSpeakLiveState(): SpeakLivePersistedState {
  const now = new Date().toISOString()
  return {
    version: 1,
    phase: 'greeting',
    goalIndex: 0,
    goalsCompleted: [],
    clarificationRounds: 0,
    rollingSummaryEnglish: '',
    intentLabel: null,
    updatedAt: now,
  }
}

export function parseSpeakLiveState(raw: string | null | undefined): SpeakLivePersistedState | null {
  if (!raw?.trim()) return null
  try {
    const j = JSON.parse(raw) as Partial<SpeakLivePersistedState>
    if (j.version !== 1 || !j.phase || !isPhase(j.phase)) return null
    const scenarioSessionState =
      'scenarioSessionState' in j ? parseScenarioSessionState((j as { scenarioSessionState?: unknown }).scenarioSessionState) : null
    const scenarioRuntimeConfig =
      'scenarioRuntimeConfig' in j
        ? parsePublicTransportScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig) ??
          parseBookingReservationsScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig) ??
          parseStoreServiceIssueScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig) ??
          parseWorkColleagueInteractionScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig) ??
          parseHousingLandlordScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig) ??
          parseDoctorPharmacyScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig) ??
          parseOrderingFoodScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig) ??
          parseSupermarketShopScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig) ??
          parseDirectionsGettingSomewhereScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig) ??
          parsePhoneCallScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig) ??
          parsePartySocialScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig) ??
          parseExplainingSomethingScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig) ??
          parseStorytellingScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig) ??
          parseOpinionsDiscussionsScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig) ??
          parseMeetingNewPeopleScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig) ??
          parseSmallTalkScenarioRuntimeConfig((j as { scenarioRuntimeConfig?: unknown }).scenarioRuntimeConfig)
        : null
    const lastGroundingDebugRaw = (j as { lastGroundingDebug?: unknown }).lastGroundingDebug
    const lastGroundingDebug =
      lastGroundingDebugRaw && typeof lastGroundingDebugRaw === 'object' && !Array.isArray(lastGroundingDebugRaw)
        ? (lastGroundingDebugRaw as Record<string, unknown>)
        : undefined
    const supportStrategy = parseSupportStrategy((j as { supportStrategy?: unknown }).supportStrategy)
    const languageCoach = parseLanguageCoachPersisted((j as { languageCoach?: unknown }).languageCoach)
    return {
      version: 1,
      phase: j.phase,
      goalIndex: typeof j.goalIndex === 'number' && j.goalIndex >= 0 ? Math.floor(j.goalIndex) : 0,
      goalsCompleted: Array.isArray(j.goalsCompleted)
        ? j.goalsCompleted.filter((x): x is number => typeof x === 'number' && x >= 0).map((x) => Math.floor(x))
        : [],
      clarificationRounds:
        typeof j.clarificationRounds === 'number' && j.clarificationRounds >= 0
          ? Math.min(MAX_CLARIFICATION_ROUNDS + 2, Math.floor(j.clarificationRounds))
          : 0,
      rollingSummaryEnglish:
        typeof j.rollingSummaryEnglish === 'string' ? j.rollingSummaryEnglish.slice(0, 4000) : '',
      intentLabel: typeof j.intentLabel === 'string' ? j.intentLabel.slice(0, 200) : null,
      updatedAt: typeof j.updatedAt === 'string' ? j.updatedAt : new Date().toISOString(),
      ...(supportStrategy ? { supportStrategy } : {}),
      ...(scenarioSessionState ? { scenarioSessionState } : {}),
      ...(scenarioRuntimeConfig ? { scenarioRuntimeConfig } : {}),
      ...(lastGroundingDebug ? { lastGroundingDebug } : {}),
      ...(languageCoach ? { languageCoach } : {}),
    }
  } catch {
    return null
  }
}

export function serializeSpeakLiveState(s: SpeakLivePersistedState): string {
  return JSON.stringify({ ...s, updatedAt: new Date().toISOString() })
}

/**
 * Append a compact English line to `rollingSummaryEnglish` so the next request’s `threadSummary` / Mem block
 * carries what was already said (reduces repeated questions). Includes seeded assistant-only openings (`A: …`).
 */
/** Scenarios where we keep cumulative Mem lines for Speak Live. */
const CUMULATIVE_SPEAK_LIVE_MEMORY_SLUGS = new Set([
  'doctor_pharmacy',
  'booking_reservations',
  'store_service_issue',
  'work_colleague_interaction',
  'housing_landlord',
  'ordering_food',
  'supermarket_shop',
  'phone_call',
  'small_talk',
  'meeting_new_people',
  'party_social',
  'explaining_something',
  'storytelling',
  'opinions_discussions',
  'language_coach',
])

export function appendCumulativeSpeakLiveMemoryTurn(params: {
  scenarioSlug: string
  rollingSummaryEnglish: string
  userTextTrimmed: string
  assistantTextTrimmed: string
}): string {
  const slug = params.scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (!CUMULATIVE_SPEAK_LIVE_MEMORY_SLUGS.has(slug)) {
    return params.rollingSummaryEnglish
  }
  /** Monologue practice: learner turns are long; a 280-char cap hid later steps from Mem / thread summary. */
  const userMemCap = slug === 'explaining_something' || slug === 'storytelling' ? 1200 : 280
  const u = params.userTextTrimmed.trim().replace(/\s+/g, ' ').slice(0, userMemCap)
  const a = params.assistantTextTrimmed.trim().replace(/\s+/g, ' ').slice(0, 420)
  if (!u && !a) return params.rollingSummaryEnglish
  // Assistant-only line (e.g. seeded opening before any user utterance) — still lands in Mem.
  const line = u && a ? `U: ${u} — A: ${a}` : a ? `A: ${a}` : `U: ${u}`
  const base = params.rollingSummaryEnglish.trim()
  if (!base) return line.slice(0, 4000)
  return `${base}\n${line}`.slice(0, 4000)
}

export function threadCurrentStageFromPhase(phase: SpeakLivePhase): string {
  return `speak_live_${phase}`
}

function clampPhase(from: SpeakLivePhase, proposed: SpeakLivePhase | undefined): SpeakLivePhase {
  if (!proposed || !ALLOWED[from].has(proposed)) return from
  return proposed
}

/**
 * Deterministic transition with model **hints** (`speakLiveSignals`) plus scenario goal bookkeeping.
 */
export function computeNextSpeakLiveState(input: {
  prev: SpeakLivePersistedState
  scenarioGoalCount: number
  signals: SpeakLiveSignals | null | undefined
  shouldConversationEnd: boolean
  userTextTrimmed: string
  /** When `language_coach`, FSM stays in open conversation (no rigid goal arc). */
  scenarioSlug?: string | null
}): SpeakLivePersistedState {
  const { prev, scenarioGoalCount, signals, shouldConversationEnd, userTextTrimmed } = input
  const slugNorm = (input.scenarioSlug ?? '').trim().toLowerCase().replace(/-/g, '_')
  const isLanguageCoach = slugNorm === 'language_coach'
  let phase = prev.phase
  let goalIndex = prev.goalIndex
  const goalsCompleted = [...new Set(prev.goalsCompleted)].sort((a, b) => a - b)
  let clarificationRounds = prev.clarificationRounds
  let intentLabel = prev.intentLabel
  let rolling = prev.rollingSummaryEnglish

  if (signals?.rollingSummaryEnglish?.trim()) {
    rolling = signals.rollingSummaryEnglish.trim().slice(0, 4000)
  }

  if (signals?.intentLabel?.trim()) {
    intentLabel = signals.intentLabel.trim().slice(0, 200)
  }

  // Model-requested phase (validated against adjacency graph).
  if (signals?.nextPhase && isPhase(signals.nextPhase)) {
    phase = clampPhase(phase, signals.nextPhase)
  }

  // Hard progress: any user speech while still greeting moves at least to intent detection.
  if (phase === 'greeting' && userTextTrimmed.length > 0) {
    phase = 'intent_detection'
  }

  if (signals?.needsClarification && (phase === 'intent_detection' || phase === 'execution')) {
    phase = 'clarification'
    clarificationRounds += 1
  }

  if (phase === 'clarification' && clarificationRounds > MAX_CLARIFICATION_ROUNDS) {
    phase = 'execution'
  }

  if (signals?.readyForClosing && (phase === 'execution' || phase === 'intent_detection')) {
    phase = 'closing'
  }

  if (shouldConversationEnd) {
    phase = 'closing'
  }

  // Goal advancement only in execution (or intent resolved into execution path).
  const goalCount = isLanguageCoach ? 0 : Math.max(0, scenarioGoalCount)
  if (phase === 'execution' && goalCount > 0) {
    const completed = new Set(goalsCompleted)
    const hinted = signals?.goalIndexesCompleted?.filter((x) => typeof x === 'number' && x >= 0) ?? []
    for (const idx of hinted) {
      if (idx < goalCount) completed.add(Math.floor(idx))
    }
    if (signals?.advancePrimaryGoal && goalIndex < goalCount) {
      completed.add(goalIndex)
    }
    // Auto-complete current index if model marked it explicitly.
    if (hinted.includes(goalIndex)) {
      completed.add(goalIndex)
    }
    const sorted = [...completed].sort((a, b) => a - b)
    goalsCompleted.length = 0
    goalsCompleted.push(...sorted)

    // Advance cursor to first not completed.
    let nextIdx = 0
    while (nextIdx < goalCount && sorted.includes(nextIdx)) nextIdx++
    goalIndex = Math.min(nextIdx, Math.max(0, goalCount - 1))

    if (sorted.length >= goalCount && goalCount > 0) {
      phase = 'closing'
    }
  }

  if (isLanguageCoach) {
    phase = phase === 'closing' ? 'closing' : 'execution'
  }

  return {
    version: 1,
    phase,
    goalIndex,
    goalsCompleted,
    clarificationRounds,
    rollingSummaryEnglish: rolling,
    intentLabel,
    updatedAt: new Date().toISOString(),
    ...(input.prev.supportStrategy ? { supportStrategy: input.prev.supportStrategy } : {}),
    ...(input.prev.scenarioSessionState != null ? { scenarioSessionState: input.prev.scenarioSessionState } : {}),
    ...(input.prev.scenarioRuntimeConfig != null ? { scenarioRuntimeConfig: input.prev.scenarioRuntimeConfig } : {}),
    ...(input.prev.lastGroundingDebug ? { lastGroundingDebug: input.prev.lastGroundingDebug } : {}),
    ...(input.prev.languageCoach ? { languageCoach: input.prev.languageCoach } : {}),
  }
}
