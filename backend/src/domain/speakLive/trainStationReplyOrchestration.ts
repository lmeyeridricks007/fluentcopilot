import type { ScenarioConfig } from '../../models/contracts'
import type { ScenarioSessionState, TrainStationGoalId } from './trainStationSlotState'
import { ALL_TRAIN_STATION_GOALS, detectTrainStationSlots } from './trainStationSlotState'
import { mapDifficultyBandToCefr } from './trainStationLiveSessionModel'
import { normalizeTrainStationUtterance } from './trainStationTranscriptNormalize'

/**
 * When rule `hits` are empty (STT noise, out-of-grammar phrasing), still steer the model
 * from normalized text — never used to mutate persisted slot goals.
 */
function orchestrationFallbackHints(canonical: string): {
  delayHint: boolean
  timeHint: boolean
  platformHint: boolean
  destinationHint: boolean
} {
  if (!canonical) return { delayHint: false, timeHint: false, platformHint: false, destinationHint: false }
  /** References to the train itself (avoid matching generic "op tijd" + "mijn reis"). */
  const trainish = /\b(trein|de\s+trein|deze\s+trein|hij|die|deze)\b/.test(canonical)
  const delayHint =
    trainish &&
    (/\bop\s+tijd\b/.test(canonical) ||
      /\bvertraging\b/.test(canonical) ||
      /\bvertraagd\b/.test(canonical) ||
      /\bop\s+schema\b/.test(canonical))
  const timeHint =
    /\bhoe\s+laat\b/.test(canonical) ||
    /\b(wanneer|welke\s+tijd|op\s+welke\s+tijd)\b/.test(canonical) ||
    (/\b(welk|welke)\s+tijd\b/.test(canonical) && /\b(vertrekt|vertrek|gaat|rijdt|trein)\b/.test(canonical))
  const platformHint =
    /\b(welk|welke)\s+(perron|spoor)\b/.test(canonical) ||
    /\b(van|op|naar)\s+welke?\s+(perron|spoor)\b/.test(canonical) ||
    (/\b(perron|spoor)\b/.test(canonical) && /\b(vertrekt|vertrek|trein|nummer|is\s+het)\b/.test(canonical))
  const destinationHint =
    /\b(naar|tot|richting)\s+[a-záàâäéèêëíìîïóòôöúùûü\-]{2,}\b/.test(canonical) ||
    /\b(bestemming|eindbestemming)\b/.test(canonical) ||
    /\b(waar|hoe)\s+gaat\s+de\s+trein\b/.test(canonical)
  return { delayHint, timeHint, platformHint, destinationHint }
}

export type AnsweredFactAccumulator = {
  delayStatus: boolean
  departureTime: boolean
  platform: boolean
  destination: boolean
}

/** Scan prior assistant turn facts in session state for what was already addressed. */
export function accumulateAnsweredFactsFromSession(
  state: ScenarioSessionState | null | undefined
): AnsweredFactAccumulator {
  const out: AnsweredFactAccumulator = {
    delayStatus: false,
    departureTime: false,
    platform: false,
    destination: false,
  }
  if (!state?.turnFacts?.length) return out
  for (const row of state.turnFacts) {
    if (row.role !== 'assistant' || !row.assistantFacts) continue
    const a = row.assistantFacts
    if (a.answeredDelayStatus) out.delayStatus = true
    if (a.answeredDepartureTime) out.departureTime = true
    if (a.answeredPlatform) out.platform = true
    if (a.answeredDestination) out.destination = true
  }
  return out
}

/** English lines for the prompt: what the desk has already covered. */
export function buildAlreadyAnsweredFactLines(answered: AnsweredFactAccumulator): string[] {
  const lines: string[] = []
  if (answered.delayStatus) lines.push('Delay / punctuality (op tijd, vertraging) was already addressed earlier.')
  if (answered.departureTime) lines.push('Departure or time-of-day was already addressed earlier.')
  if (answered.platform) lines.push('Platform / perron / spoor was already addressed earlier.')
  if (answered.destination) lines.push('Destination / route was already addressed earlier.')
  return lines
}

/** Product order: answer delay/time before platform/destination when bundled. */
const RESPONSE_PRIORITY: readonly TrainStationGoalId[] = [
  'ASK_DELAY_STATUS',
  'ASK_DEPARTURE_TIME',
  'ASK_PLATFORM',
  'ASK_DESTINATION',
  'CONFIRM_DETAIL',
  'THANK_AND_CLOSE',
] as const

/**
 * What the assistant should prioritize this turn (English, for the system prompt).
 * Covers multi-intent lines (e.g. on-time + departure time) in stable product order.
 */
export function computeRecommendedNextResponseTarget(params: {
  userText: string
  userMessageId: string
  answered: AnsweredFactAccumulator
}): string {
  const canonical = normalizeTrainStationUtterance(params.userText)
  const { hits } = detectTrainStationSlots(params.userText, params.userMessageId)
  const fb = orchestrationFallbackHints(canonical)
  const targets: string[] = []

  const wantsDelay =
    hits.some((h) => h.goalId === 'ASK_DELAY_STATUS') || (hits.length === 0 && fb.delayHint)
  const wantsTime =
    hits.some((h) => h.goalId === 'ASK_DEPARTURE_TIME') || (hits.length === 0 && fb.timeHint)
  const wantsPlatform =
    hits.some((h) => h.goalId === 'ASK_PLATFORM') || (hits.length === 0 && fb.platformHint)
  const wantsDest =
    hits.some((h) => h.goalId === 'ASK_DESTINATION') || (hits.length === 0 && fb.destinationHint)
  const wantsConfirm = hits.some((h) => h.goalId === 'CONFIRM_DETAIL')
  const wantsThanks = hits.some((h) => h.goalId === 'THANK_AND_CLOSE')

  const pushFor = (goal: TrainStationGoalId) => {
    switch (goal) {
      case 'ASK_DELAY_STATUS':
        if (!wantsDelay) return
        targets.push(
          params.answered.delayStatus
            ? '(1) Punctuality: learner asks again about op tijd / vertraging — answer that directly in Dutch for THIS line only; do not pivot to platform/spoor unless the same utterance also asks for it.'
            : '(1) Punctuality: answer op tijd / vertraging clearly first.'
        )
        break
      case 'ASK_DEPARTURE_TIME':
        if (!wantsTime) return
        targets.push(
          params.answered.departureTime
            ? '(2) Departure time: learner asks again — give a concise Dutch time (or honest “unknown desk” style) for this line before other topics.'
            : '(2) Departure time: answer hoe laat / wanneer vertrek in Dutch.'
        )
        break
      case 'ASK_PLATFORM':
        if (!wantsPlatform) return
        targets.push(
          params.answered.platform
            ? '(3) Platform: learner asks again for perron/spoor — answer that directly; do not answer delay-only unless the utterance also asks punctuality.'
            : '(3) Platform: give perron / spoor in Dutch.'
        )
        break
      case 'ASK_DESTINATION':
        if (!wantsDest) return
        targets.push(
          params.answered.destination
            ? '(4) Destination: brief Dutch confirmation or clarification.'
            : '(4) Destination: clarify bestemming / richting in Dutch.'
        )
        break
      case 'CONFIRM_DETAIL':
        if (!wantsConfirm) return
        targets.push('(5) Confirm: briefly bevestig het detail in het Nederlands.')
        break
      case 'THANK_AND_CLOSE':
        if (!wantsThanks) return
        targets.push('(6) Thanks: acknowledge and close politely in one short Dutch beat.')
        break
      default:
        break
    }
  }

  for (const g of RESPONSE_PRIORITY) {
    pushFor(g)
  }

  if (targets.length === 0) {
    if (hits.length === 0 && !fb.delayHint && !fb.timeHint && !fb.platformHint && !fb.destinationHint) {
      return 'No high-confidence slot matched; still respond helpfully to the learner’s Dutch in one short station line, then offer one relevant follow-up (time, platform, or transfer).'
    }
    return 'Acknowledge their line in Dutch; if intent is unclear, ask one short clarifying question (delay, time, or platform) instead of inventing details.'
  }
  return targets.join(' ')
}

export type TrainStationTurnOrchestrationInput = {
  scenarioId: string
  scenarioSlug: string
  scenarioTitle: string
  scenarioDescription: string
  role: 'station_assistant'
  learnerLevel: 'A1' | 'A2' | 'B1'
  /** Raw learner line (matches DB user message). */
  latestTranscript: string
  /** ASR-normalized text used for rule hits (same pipeline as slot detector). */
  normalizedLatestTranscript: string
  latestUserMessageId: string
  /** Rule hits on this line only (exact/strong). */
  thisTurnDetectedGoalIds: TrainStationGoalId[]
  thisTurnRuleHits: { goalId: TrainStationGoalId; tier: string; evidence: string }[]
  achievedGoalIds: TrainStationGoalId[]
  pendingGoalIds: TrainStationGoalId[]
  alreadyAnsweredFacts: string[]
  recommendedNextResponseTarget: string
  scenarioGoalTitles: string[]
  /** Short English facts from session (destinations named, etc.). */
  knownScenarioFactsEnglish: string[]
}

/** Structured payload embedded in the system prompt (not sent to the learner). */
export function buildTrainStationTurnOrchestrationJson(input: TrainStationTurnOrchestrationInput): string {
  return JSON.stringify(input, null, 0)
}

export function buildTrainStationOrchestrationInput(params: {
  scenario: ScenarioConfig
  slotState: ScenarioSessionState | null | undefined
  userText: string
  userMessageId: string
  answered: AnsweredFactAccumulator
}): TrainStationTurnOrchestrationInput {
  const { scenario, slotState, userText, userMessageId, answered } = params
  const { hits } = detectTrainStationSlots(userText, userMessageId)
  const thisTurnIds = hits.map((h) => h.goalId)
  const mergedAchieved = new Set<TrainStationGoalId>(slotState?.achievedGoals.map((h) => h.goalId) ?? [])
  for (const id of thisTurnIds) mergedAchieved.add(id)
  const achievedGoalIds = [...mergedAchieved]
  const pendingGoalIds = ALL_TRAIN_STATION_GOALS.filter((g) => !mergedAchieved.has(g))
  const already = buildAlreadyAnsweredFactLines(answered)
  const normalizedLatestTranscript = normalizeTrainStationUtterance(userText)
  const knownScenarioFactsEnglish: string[] = []
  if (slotState?.mentionedEntities?.length) {
    knownScenarioFactsEnglish.push(`Mentioned places: ${slotState.mentionedEntities.join(', ')}.`)
  }
  const cefr = mapDifficultyBandToCefr(scenario.difficultyBand)
  return {
    scenarioId: scenario.id,
    scenarioSlug: scenario.slug,
    scenarioTitle: scenario.title,
    scenarioDescription: scenario.description,
    role: 'station_assistant',
    learnerLevel: cefr,
    latestTranscript: userText.trim(),
    normalizedLatestTranscript,
    latestUserMessageId: userMessageId,
    thisTurnDetectedGoalIds: thisTurnIds,
    thisTurnRuleHits: hits.map((h) => ({
      goalId: h.goalId,
      tier: h.matchTier ?? 'strong',
      evidence: h.matchedText.slice(0, 120),
    })),
    achievedGoalIds,
    pendingGoalIds,
    alreadyAnsweredFacts: already,
    recommendedNextResponseTarget: computeRecommendedNextResponseTarget({
      userText,
      userMessageId,
      answered,
    }),
    scenarioGoalTitles: [...scenario.goals],
    knownScenarioFactsEnglish,
  }
}
