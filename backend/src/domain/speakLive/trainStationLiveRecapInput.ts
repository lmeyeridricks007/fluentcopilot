import type { ConversationMessage, ConversationSummary } from '../../models/contracts'
import type { GoalHit, ScenarioSessionState, TrainStationGoalId } from './trainStationSlotState'
import { ALL_TRAIN_STATION_GOALS } from './trainStationSlotState'

export type LiveScenarioRecapTranscriptEvidence = {
  goalId: TrainStationGoalId
  quote: string
}

/** Primary structured input for Train Station Speak Live recap LLM (JSON in user prompt). */
export type LiveScenarioRecapInput = {
  schemaVersion: 1
  scenarioId: string
  scenarioSlug: 'train-station'
  learnerLevel: 'A2'
  achievedGoals: Pick<GoalHit, 'goalId' | 'matchedText' | 'transcriptTurnId'>[]
  pendingGoals: TrainStationGoalId[]
  transcriptEvidence: LiveScenarioRecapTranscriptEvidence[]
  goodLanguageSignals: string[]
  weakLanguageSignals: string[]
  pronunciationSignals: { phrase: string; tip: string }[]
  completionStatus: 'complete' | 'partial' | 'aborted'
  /** Short digest of recent user/assistant fact rows (English). */
  turnFactsDigest: string
}

const GOAL_LABEL: Record<TrainStationGoalId, string> = {
  ASK_DELAY_STATUS: 'delay / punctuality (op tijd, vertraging)',
  ASK_DEPARTURE_TIME: 'departure time',
  ASK_PLATFORM: 'platform or track (perron / spoor)',
  ASK_DESTINATION: 'destination or route',
  CONFIRM_DETAIL: 'confirming a detail',
  THANK_AND_CLOSE: 'closing / thanks',
}

export function humanGoalLabel(id: TrainStationGoalId): string {
  return GOAL_LABEL[id] ?? id
}

function digestTurnFacts(state: ScenarioSessionState | null | undefined, maxRows = 8): string {
  if (!state?.turnFacts?.length) return '(no prior turn fact rows)'
  const tail = state.turnFacts.slice(-maxRows)
  return tail
    .map((r) => {
      if (r.role === 'user' && r.userFacts) {
        const u = r.userFacts
        const flags = [
          u.askedDelayStatus && 'delay',
          u.askedDepartureTime && 'time',
          u.askedPlatform && 'platform',
          u.askedDestination && 'destination',
          u.politeClosing && 'thanks',
        ]
          .filter(Boolean)
          .join(', ')
        return `user ${r.turnId.slice(0, 8)}… flags: ${flags || 'unclear'}`
      }
      if (r.role === 'assistant' && r.assistantFacts) {
        const a = r.assistantFacts
        const flags = [
          a.answeredDelayStatus && 'answered-delay',
          a.answeredDepartureTime && 'answered-time',
          a.answeredPlatform && 'answered-platform',
          a.answeredDestination && 'answered-destination',
        ]
          .filter(Boolean)
          .join(', ')
        return `assistant ${r.turnId.slice(0, 8)}… flags: ${flags || '—'}`
      }
      return `${r.role} turn`
    })
    .join(' | ')
}

function userMessageById(messages: ConversationMessage[] | undefined): Map<string, string> {
  const byId = new Map<string, string>()
  for (const m of messages ?? []) {
    if (m.sender === 'user' && m.content?.trim()) byId.set(m.id, m.content.trim())
  }
  return byId
}

/** Build structured recap grounding payload (authoritative over rolling summary). */
export function buildLiveScenarioRecapInput(params: {
  scenarioId: string
  slotState: ScenarioSessionState | null | undefined
  feedbackNotes: string
  messages?: ConversationMessage[]
}): LiveScenarioRecapInput | null {
  const { scenarioId, slotState, feedbackNotes, messages } = params
  if (!slotState) return null

  const byTurnId = userMessageById(messages)
  const achievedGoals = slotState.achievedGoals.map((h) => ({
    goalId: h.goalId,
    matchedText: h.matchedText.slice(0, 400),
    transcriptTurnId: h.transcriptTurnId,
  }))
  const achievedSet = new Set(slotState.achievedGoals.map((h) => h.goalId))
  const pendingFromState = slotState.pendingGoals ?? []
  const pendingGoals: TrainStationGoalId[] =
    pendingFromState.length > 0
      ? [...pendingFromState]
      : (ALL_TRAIN_STATION_GOALS as readonly TrainStationGoalId[]).filter((g) => !achievedSet.has(g))

  const transcriptEvidence: LiveScenarioRecapTranscriptEvidence[] = slotState.achievedGoals.map((h) => ({
    goalId: h.goalId,
    quote: (byTurnId.get(h.transcriptTurnId) ?? h.matchedText).slice(0, 300),
  }))

  const weakLanguageSignals = feedbackNotes
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 4)
    .slice(0, 20)

  const completionStatus: LiveScenarioRecapInput['completionStatus'] =
    pendingGoals.length === 0 ? 'complete' : achievedSet.size > 0 ? 'partial' : 'aborted'

  return {
    schemaVersion: 1,
    scenarioId,
    scenarioSlug: 'train-station',
    learnerLevel: 'A2',
    achievedGoals,
    pendingGoals,
    transcriptEvidence,
    goodLanguageSignals: [],
    weakLanguageSignals,
    pronunciationSignals: [],
    completionStatus,
    turnFactsDigest: digestTurnFacts(slotState),
  }
}

/** Remove recap lines that falsely claim the learner never asked about topics we have slot evidence for. */
export function filterContradictoryImproveLines(
  lines: string[],
  achievedIds: Set<TrainStationGoalId>
): string[] {
  const risky = /did not ask|never asked|didn'?t ask|no question about|did not inquire|not ask about/i
  return lines.filter((line) => {
    if (!risky.test(line)) return true
    const l = line.toLowerCase()
    const timeHints = /time|schedule|departure|vertrek|hoe laat|wanneer|op tijd|delay|vertraging|on time|punctual/i
    if (timeHints.test(l) && (achievedIds.has('ASK_DELAY_STATUS') || achievedIds.has('ASK_DEPARTURE_TIME'))) {
      return false
    }
    if (/platform|perron|spoor|track/i.test(l) && achievedIds.has('ASK_PLATFORM')) return false
    if (/destination|route|naar /i.test(l) && achievedIds.has('ASK_DESTINATION')) return false
    return true
  })
}

/**
 * Deterministic reconciliation: slot state wins for goals + evidence;
 * strengthens whatWentWell; strips contradictory "missed" language from whatToImprove.
 */
export function reconcileTrainStationLiveRecap(params: {
  summary: ConversationSummary
  slotState: ScenarioSessionState | null | undefined
  /**
   * When Speak Live uses the public-transport runtime on `train-station`, keep recap `goalsCompleted`/`goalsMissed`
   * for variation-weighted goals — {@link reconcilePublicTransportLiveRecap} applies after this pass.
   */
  preserveScenarioGoals?: boolean
}): ConversationSummary {
  const { summary, slotState, preserveScenarioGoals } = params
  if (!slotState || slotState.scenarioSlug !== 'train-station') {
    return summary
  }

  const achievedIds = new Set(slotState.achievedGoals.map((h) => h.goalId))
  const goalsCompleted = [...achievedIds]
  const goalsMissed = (ALL_TRAIN_STATION_GOALS as readonly TrainStationGoalId[]).filter((g) => !achievedIds.has(g))
  const transcriptEvidence = slotState.achievedGoals.map((h) => ({
    goalId: h.goalId,
    quote: h.matchedText.slice(0, 300),
  }))

  const evidenceLines = slotState.achievedGoals.map((h) => {
    const lab = humanGoalLabel(h.goalId)
    return `You asked about ${lab}: “${h.matchedText.slice(0, 140)}”.`
  })

  const mergedWell = [...new Set([...evidenceLines, ...(summary.whatWentWell ?? [])])].slice(0, 14)
  const filteredImprove = filterContradictoryImproveLines(summary.whatToImprove ?? [], achievedIds)
  const languageNotes =
    summary.languageNotes && summary.languageNotes.length > 0 ? summary.languageNotes : undefined
  const dutchUpgrade =
    summary.dutchUpgrade && summary.dutchUpgrade.length > 0
      ? summary.dutchUpgrade
      : languageNotes && languageNotes.length > 0
        ? languageNotes
        : undefined

  const suggested =
    summary.suggestedNextAction?.trim() ||
    summary.recommendedNextStep?.trim() ||
    'Practice one more short station line tomorrow.'

  if (preserveScenarioGoals) {
    return {
      ...summary,
      whatWentWell: mergedWell,
      whatToImprove: filteredImprove,
      transcriptEvidence,
      languageNotes,
      dutchUpgrade,
      recommendedNextStep: summary.recommendedNextStep ?? suggested,
      suggestedNextAction: suggested,
    }
  }

  return {
    ...summary,
    whatWentWell: mergedWell,
    whatToImprove: filteredImprove,
    goalsCompleted,
    goalsMissed,
    transcriptEvidence,
    languageNotes,
    dutchUpgrade,
    recommendedNextStep: summary.recommendedNextStep ?? suggested,
    suggestedNextAction: suggested,
  }
}
