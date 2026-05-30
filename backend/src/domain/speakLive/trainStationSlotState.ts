import type { ConversationMode, ThreadStatus } from '../../models/contracts'
import { ALL_TRAIN_STATION_GOALS, type TrainStationGoalId } from './trainStationGoals'
import {
  ALL_SPEAK_LIVE_TRANSPORT_PATTERN_RULES,
  pickBestMatchesPerGoal,
  TIER_CONFIDENCE,
  type TrainMatchTier,
} from './trainStationPatternRules'
import { normalizeTrainStationUtterance } from './trainStationTranscriptNormalize'

export type { TrainStationGoalId } from './trainStationGoals'
export { ALL_TRAIN_STATION_GOALS } from './trainStationGoals'
export type { TrainMatchTier } from './trainStationPatternRules'
export { normalizeTrainStationUtterance } from './trainStationTranscriptNormalize'

export type GoalHitSource = 'rule' | 'llm' | 'hybrid'

/** Evidence row when a slot fires (deterministic layer). */
export type GoalHit = {
  goalId: TrainStationGoalId
  matchedText: string
  transcriptTurnId: string
  confidence: number
  source: GoalHitSource
  /** Rule tier: `exact` / `strong` auto-hit goals; `possible` is soft-hint only. Omitted on legacy persisted rows. */
  matchTier?: TrainMatchTier
}

export type TrainUserTurnFacts = {
  askedDepartureTime: boolean
  askedDelayStatus: boolean
  askedPlatform: boolean
  askedDestination: boolean
  politeClosing: boolean
  confirmDetail: boolean
}

export type TrainAssistantTurnFacts = {
  answeredDepartureTime: boolean
  answeredDelayStatus: boolean
  answeredPlatform: boolean
  answeredDestination: boolean
}

export type TrainStationTurnFactRecord = {
  turnId: string
  role: 'user' | 'assistant'
  at: string
  userFacts?: TrainUserTurnFacts
  assistantFacts?: TrainAssistantTurnFacts
  hits?: GoalHit[]
  /** Lower-confidence pattern matches (not promoted to achieved goals). */
  softHits?: GoalHit[]
}

/**
 * Persisted structured session for Train Station Speak Live (nested under SpeakLivePersistedState).
 * Mirrors product ask for explicit scenario slot tracking.
 */
export type ScenarioSessionState = {
  schemaVersion: 1
  scenarioSlug: 'train-station'
  sessionId: string
  scenarioId: string
  locale: string
  mode: ConversationMode
  status: ThreadStatus
  achievedGoals: GoalHit[]
  pendingGoals: TrainStationGoalId[]
  mentionedEntities: string[]
  turnFacts: TrainStationTurnFactRecord[]
  lastUpdatedAt: string
}

function sliceEvidenceCanonical(canonical: string, start: number, len: number): string {
  const t = canonical.trim()
  const s = Math.max(0, start)
  const e = Math.min(t.length, s + Math.max(len, 24))
  return t.slice(s, e).trim() || canonical.trim().slice(0, 80)
}

export type TrainSlotDetection = {
  /** `exact` + `strong` matches — drive goals + userFacts. */
  hits: GoalHit[]
  /** `possible` tier only — soft hints for prompts / UI. */
  possibleHits: GoalHit[]
  userFacts: TrainUserTurnFacts
}

export function detectTrainStationSlots(userText: string, transcriptTurnId: string): TrainSlotDetection {
  const raw = userText.trim()
  const canonical = normalizeTrainStationUtterance(raw)
  const hits: GoalHit[] = []
  const possibleHits: GoalHit[] = []

  if (!canonical) {
    return {
      hits,
      possibleHits,
      userFacts: {
        askedDepartureTime: false,
        askedDelayStatus: false,
        askedPlatform: false,
        askedDestination: false,
        politeClosing: false,
        confirmDetail: false,
      },
    }
  }

  const bestByGoal = pickBestMatchesPerGoal(canonical, ALL_SPEAK_LIVE_TRANSPORT_PATTERN_RULES)

  const toHit = (rule: (typeof ALL_SPEAK_LIVE_TRANSPORT_PATTERN_RULES)[number], m: RegExpExecArray): GoalHit => ({
    goalId: rule.goal,
    matchedText: sliceEvidenceCanonical(canonical, m.index, m[0].length + 12),
    transcriptTurnId,
    confidence: TIER_CONFIDENCE[rule.tier],
    source: 'rule',
    matchTier: rule.tier,
  })

  for (const { rule, m } of bestByGoal.values()) {
    const h = toHit(rule, m)
    if (rule.tier === 'possible') possibleHits.push(h)
    else hits.push(h)
  }

  const userFacts: TrainUserTurnFacts = {
    askedDepartureTime: hits.some((h) => h.goalId === 'ASK_DEPARTURE_TIME'),
    askedDelayStatus: hits.some((h) => h.goalId === 'ASK_DELAY_STATUS'),
    askedPlatform: hits.some((h) => h.goalId === 'ASK_PLATFORM'),
    askedDestination: hits.some((h) => h.goalId === 'ASK_DESTINATION'),
    politeClosing: hits.some((h) => h.goalId === 'THANK_AND_CLOSE'),
    confirmDetail: hits.some((h) => h.goalId === 'CONFIRM_DETAIL'),
  }

  return { hits, possibleHits, userFacts }
}

/** Heuristic: which slots the assistant answer likely addressed (Dutch). */
export function inferAssistantTrainFacts(assistantText: string): TrainAssistantTurnFacts {
  const t = normalizeTrainStationUtterance(assistantText)
  const delayPhrase = /\b(op tijd|vertraging|vertraagd|geen vertraging|minuten te laat)\b/i.test(assistantText)
  const trainContext = /\b(trein|perron|spoor|vertrek|vertrekt|hij|die|deze|intercity|sprinter)\b/i.test(
    assistantText
  )
  /** Do not treat desk *questions* (“Wat is uw bestemming?”) as having supplied destination info. */
  const destinationClarificationQuestion =
    /\?/.test(assistantText) &&
    /\b(wat\s+is|welke\s+bestemming|naar\s+welke|waar\s+naartoe|waarheen|eindbestemming)\b/i.test(
      assistantText
    )
  return {
    answeredPlatform: /\b(perron|spoor)\s*\d|\bspoor\b|\bperron\b/i.test(assistantText),
    answeredDepartureTime: /\b(\d{1,2}[.:]\d{2}|uur|minuten)\b/i.test(assistantText) || /\bvertrek\b/i.test(t),
    /** Require station context so generic “op tijd” in a closing line does not suppress the next delay question. */
    answeredDelayStatus: delayPhrase && trainContext,
    answeredDestination:
      /\b(naar|bestemming|richting)\b/i.test(assistantText) &&
      /\b[a-z]{3,}\b/i.test(t) &&
      !destinationClarificationQuestion,
  }
}

/** Map slot hits to seeded scenario goal indices (platform / schedule+extras / close). */
export function scenarioGoalIndexesFromTrainHits(hits: Pick<GoalHit, 'goalId'>[]): number[] {
  const s = new Set<number>()
  for (const h of hits) {
    if (h.goalId === 'ASK_PLATFORM') s.add(0)
    if (
      h.goalId === 'ASK_DEPARTURE_TIME' ||
      h.goalId === 'ASK_DELAY_STATUS' ||
      h.goalId === 'ASK_DESTINATION' ||
      h.goalId === 'CONFIRM_DETAIL'
    ) {
      s.add(1)
    }
    if (h.goalId === 'THANK_AND_CLOSE') s.add(2)
  }
  return [...s].sort((a, b) => a - b)
}

export function initialTrainStationScenarioSession(params: {
  sessionId: string
  scenarioId: string
  locale: string
  mode: ConversationMode
  status: ThreadStatus
}): ScenarioSessionState {
  const now = new Date().toISOString()
  return {
    schemaVersion: 1,
    scenarioSlug: 'train-station',
    sessionId: params.sessionId,
    scenarioId: params.scenarioId,
    locale: params.locale,
    mode: params.mode,
    status: params.status,
    achievedGoals: [],
    pendingGoals: [...ALL_TRAIN_STATION_GOALS],
    mentionedEntities: [],
    turnFacts: [],
    lastUpdatedAt: now,
  }
}

export function parseScenarioSessionState(raw: unknown): ScenarioSessionState | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.schemaVersion !== 1 || o.scenarioSlug !== 'train-station') return null
  const sessionId = typeof o.sessionId === 'string' ? o.sessionId : ''
  const scenarioId = typeof o.scenarioId === 'string' ? o.scenarioId : ''
  if (!sessionId) return null
  const achieved: GoalHit[] = Array.isArray(o.achievedGoals)
    ? (o.achievedGoals as unknown[]).filter(isGoalHit)
    : []
  const pending = Array.isArray(o.pendingGoals)
    ? (o.pendingGoals as unknown[]).filter((x): x is TrainStationGoalId => typeof x === 'string' && ALL_TRAIN_STATION_GOALS.includes(x as TrainStationGoalId))
    : [...ALL_TRAIN_STATION_GOALS]
  const entities = Array.isArray(o.mentionedEntities)
    ? (o.mentionedEntities as unknown[]).filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 64))
    : []
  const turnFacts = Array.isArray(o.turnFacts)
    ? (o.turnFacts as unknown[]).filter(isTurnFact)
    : []
  return {
    schemaVersion: 1,
    scenarioSlug: 'train-station',
    sessionId,
    scenarioId,
    locale: typeof o.locale === 'string' ? o.locale.slice(0, 16) : 'nl-NL',
    mode: (o.mode === 'free' || o.mode === 'guided' ? o.mode : 'guided') as ConversationMode,
    status: (o.status === 'active' || o.status === 'paused' || o.status === 'completed' ? o.status : 'active') as ThreadStatus,
    achievedGoals: achieved,
    pendingGoals: pending.length ? pending : [...ALL_TRAIN_STATION_GOALS],
    mentionedEntities: entities,
    turnFacts,
    lastUpdatedAt: typeof o.lastUpdatedAt === 'string' ? o.lastUpdatedAt : new Date().toISOString(),
  }
}

function isGoalHit(x: unknown): x is GoalHit {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  const tierOk =
    o.matchTier === undefined ||
    o.matchTier === 'exact' ||
    o.matchTier === 'strong' ||
    o.matchTier === 'possible'
  return (
    typeof o.goalId === 'string' &&
    ALL_TRAIN_STATION_GOALS.includes(o.goalId as TrainStationGoalId) &&
    typeof o.matchedText === 'string' &&
    typeof o.transcriptTurnId === 'string' &&
    typeof o.confidence === 'number' &&
    (o.source === 'rule' || o.source === 'llm' || o.source === 'hybrid') &&
    tierOk
  )
}

function isTurnFact(x: unknown): x is TrainStationTurnFactRecord {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (o.role !== 'user' && o.role !== 'assistant') return false
  return typeof o.turnId === 'string' && typeof o.at === 'string'
}

/** Merge one user+assistant turn into session state (call after assistant text is known). */
export function mergeTrainStationScenarioSession(params: {
  prev: ScenarioSessionState | null | undefined
  sessionId: string
  scenarioId: string
  locale: string
  mode: ConversationMode
  status: ThreadStatus
  userMessageId: string
  userText: string
  assistantMessageId: string
  assistantText: string
}): ScenarioSessionState {
  const base =
    params.prev ??
    initialTrainStationScenarioSession({
      sessionId: params.sessionId,
      scenarioId: params.scenarioId,
      locale: params.locale,
      mode: params.mode,
      status: params.status,
    })

  const { hits, possibleHits, userFacts } = detectTrainStationSlots(params.userText, params.userMessageId)
  const assistantFacts = inferAssistantTrainFacts(params.assistantText)
  const now = new Date().toISOString()

  const achievedGoals: GoalHit[] = [...base.achievedGoals]
  for (const h of hits) {
    if (!achievedGoals.some((x) => x.goalId === h.goalId)) achievedGoals.push(h)
  }

  const pendingGoals = ALL_TRAIN_STATION_GOALS.filter((g) => !achievedGoals.some((h) => h.goalId === g))

  const destM = /\b(naar|tot|richting)\s+([a-záàâäéèêëíìîïóòôöúùûüß0-9]+(?:\s+[a-záàâäéèêëíìîïóòôöúùûüß0-9]+){0,4})\b/i.exec(
    params.userText.trim()
  )
  const newEntities = destM?.[2] ? [destM[2].trim().replace(/\s+/g, ' ').slice(0, 80)] : []
  const mentionedEntities = [...new Set([...base.mentionedEntities, ...newEntities])].slice(0, 20)

  const userRow: TrainStationTurnFactRecord = {
    turnId: params.userMessageId,
    role: 'user',
    at: now,
    userFacts,
    ...(hits.length ? { hits } : {}),
    ...(possibleHits.length ? { softHits: possibleHits } : {}),
  }
  const assistantRow: TrainStationTurnFactRecord = {
    turnId: params.assistantMessageId,
    role: 'assistant',
    at: now,
    assistantFacts,
  }
  const turnFacts: TrainStationTurnFactRecord[] = [...base.turnFacts, userRow, assistantRow].slice(-80)

  return {
    ...base,
    sessionId: params.sessionId,
    scenarioId: params.scenarioId,
    locale: params.locale,
    mode: params.mode,
    status: params.status,
    achievedGoals,
    pendingGoals,
    mentionedEntities,
    turnFacts,
    lastUpdatedAt: now,
  }
}

/** Compact English block for LLM system prompt + recap. */
export function formatTrainStationSlotBlock(state: ScenarioSessionState | null | undefined): string | null {
  if (!state) return null
  const lines: string[] = ['--- Train station slot state (authoritative) ---']
  if (state.achievedGoals.length) {
    lines.push(
      `Achieved slots: ${state.achievedGoals.map((h) => `${h.goalId} (“${h.matchedText.slice(0, 48)}…”)`).join('; ')}`
    )
  }
  if (state.pendingGoals.length) {
    lines.push(`Pending slots: ${state.pendingGoals.join(', ')}`)
  }
  if (state.mentionedEntities.length) {
    lines.push(`Mentioned destinations/places: ${state.mentionedEntities.join(', ')}`)
  }
  const lastUser = [...state.turnFacts].reverse().find((f) => f.role === 'user')
  if (lastUser?.userFacts) {
    const u = lastUser.userFacts
    lines.push(
      `Last user turn flags: departureTime=${u.askedDepartureTime} delay=${u.askedDelayStatus} platform=${u.askedPlatform} destination=${u.askedDestination} confirm=${u.confirmDetail} thanks=${u.politeClosing}`
    )
  }
  const lastAsst = [...state.turnFacts].reverse().find((f) => f.role === 'assistant')
  if (lastAsst?.assistantFacts) {
    const a = lastAsst.assistantFacts
    lines.push(
      `Last assistant turn flags: time=${a.answeredDepartureTime} delay=${a.answeredDelayStatus} platform=${a.answeredPlatform} destination=${a.answeredDestination}`
    )
  }
  return lines.join('\n')
}

/** JSON-ish summary for recap LLM (short). */
export function trainStationRecapSlotSummary(state: ScenarioSessionState | null | undefined): string | null {
  if (!state) return null
  const achieved = state.achievedGoals.map((h) => h.goalId).join(', ')
  const pending = state.pendingGoals.join(', ')
  return `TrainStation slots — achieved: [${achieved || 'none'}]; pending: [${pending}]; entities: [${state.mentionedEntities.join(', ') || 'none'}]`
}
