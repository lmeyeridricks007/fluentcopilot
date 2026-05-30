/**
 * Developer-only Speak Live / Train Station grounding diagnostics.
 * Never enable in production builds (NODE_ENV=production).
 */

import type { AssistantReplyEnvelope, ConversationMessage, ScenarioConfig } from '../../models/contracts'
import type { AiConversationTurnRequest } from '../../services/ai/contracts/AiConversationTurnRequest'
import { buildReplyOnlyChatMessages } from '../../services/ai/orchestration/TurnPromptBuilder'
import { normalizeLearnerUtterance } from './scenarioIntentGrounding'
import { detectTrainStationSlots } from './trainStationSlotState'
import type { ScenarioSessionState } from './trainStationSlotState'
import { buildLiveScenarioRecapInput } from './trainStationLiveRecapInput'

export function speakLiveGroundingDebugEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  const panel = process.env.SPEAK_LIVE_DEBUG_PANEL === '1' || process.env.SPEAK_LIVE_DEBUG_PANEL === 'true'
  const turns = process.env.SPEAK_LIVE_DEBUG_TURNS === '1' || process.env.SPEAK_LIVE_DEBUG_TURNS === 'true'
  return process.env.NODE_ENV === 'development' || panel || turns
}

const MAX_PROMPT_CHARS_PER_MESSAGE = 24_000
const MAX_JSON_SNAPSHOT = 32_000

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max)}\n…[truncated ${s.length - max} chars]`
}

export type SpeakLiveGroundingDebugPayload = Record<string, unknown>

/**
 * Single-turn snapshot for FE + persisted `SpeakLivePersistedState.lastGroundingDebug`.
 */
export function buildSpeakLiveGroundingDebugPayload(params: {
  turnRequest: AiConversationTurnRequest
  reply: AssistantReplyEnvelope
  mergedSpeakLiveSignals: unknown
  rawUserText: string
  userMessageId: string
  assistantText: string
  verifiedGroundingBlock: string | null
  threadSummaryForLlmPreview: string
  slotStateAfter: ScenarioSessionState | null | undefined
  scenario: ScenarioConfig
  recentMessages: ConversationMessage[]
}): SpeakLiveGroundingDebugPayload {
  const normalized = normalizeLearnerUtterance(params.rawUserText)
  const det = detectTrainStationSlots(params.rawUserText.trim(), params.userMessageId)
  const detectedGoalsThisTurn = det.hits
  const detectedGoalsPossible = det.possibleHits

  let promptMessages: { role: string; content: string }[] = []
  try {
    const msgs = buildReplyOnlyChatMessages(params.turnRequest)
    promptMessages = msgs.map((m) => ({
      role: m.role,
      content: truncate(m.content, MAX_PROMPT_CHARS_PER_MESSAGE),
    }))
  } catch (e) {
    promptMessages = [{ role: 'system', content: `[prompt build error] ${e instanceof Error ? e.message : String(e)}` }]
  }

  const recapInput =
    params.scenario.slug === 'train-station' && params.slotStateAfter
      ? buildLiveScenarioRecapInput({
          scenarioId: params.scenario.id,
          slotState: params.slotStateAfter,
          feedbackNotes: '',
          messages: params.recentMessages,
        })
      : null

  const recapInputJson = recapInput ? truncate(JSON.stringify(recapInput, null, 0), MAX_JSON_SNAPSHOT) : null

  return {
    schemaVersion: 1 as const,
    capturedAt: new Date().toISOString(),
    scenarioSlug: params.scenario.slug,
    latestTranscript: params.rawUserText,
    normalizedTranscript: normalized,
    detectedGoalsThisTurn,
    detectedGoalsPossible,
    cumulativeAchievedGoals: params.slotStateAfter?.achievedGoals ?? [],
    pendingGoals: params.slotStateAfter?.pendingGoals ?? [],
    assistantPromptMessages: promptMessages,
    verifiedGroundingBlock: params.verifiedGroundingBlock,
    threadSummaryForLlmPreview: params.threadSummaryForLlmPreview,
    assistantStructuredOutput: {
      scenarioProgress: params.reply.scenarioProgress,
      shouldConversationEnd: params.reply.shouldConversationEnd,
      speakLiveSignals: params.reply.speakLiveSignals ?? null,
      trainTurnResponse: params.reply.trainTurnResponse ?? null,
    },
    mergedSpeakLiveSignals: params.mergedSpeakLiveSignals,
    assistantReplyPlain: params.assistantText,
    recapInputSnapshotJson: recapInputJson,
  }
}

/** Compact fields for `aiLogInfo` (no full prompts). */
export function speakLiveGroundingDebugLogFields(payload: SpeakLiveGroundingDebugPayload): Record<string, string | number | boolean | undefined> {
  const achieved = Array.isArray(payload.cumulativeAchievedGoals) ? payload.cumulativeAchievedGoals.length : 0
  const pending = Array.isArray(payload.pendingGoals) ? payload.pendingGoals.length : 0
  const hits = Array.isArray(payload.detectedGoalsThisTurn) ? payload.detectedGoalsThisTurn.length : 0
  const possible =
    Array.isArray((payload as { detectedGoalsPossible?: unknown }).detectedGoalsPossible)
      ? (payload as { detectedGoalsPossible: unknown[] }).detectedGoalsPossible.length
      : 0
  const pm = payload.assistantPromptMessages
  const promptChars =
    Array.isArray(pm) && pm.length > 0
      ? (pm as { content?: string }[]).reduce((n, m) => n + (typeof m.content === 'string' ? m.content.length : 0), 0)
      : 0
  return {
    schemaVersion: typeof payload.schemaVersion === 'number' ? payload.schemaVersion : 1,
    scenarioSlug: typeof payload.scenarioSlug === 'string' ? payload.scenarioSlug : '',
    latestTranscriptChars: typeof payload.latestTranscript === 'string' ? payload.latestTranscript.length : 0,
    normalizedTranscriptChars: typeof payload.normalizedTranscript === 'string' ? payload.normalizedTranscript.length : 0,
    detectedGoalHits: hits,
    detectedPossibleHits: possible,
    cumulativeAchievedCount: achieved,
    pendingGoalsCount: pending,
    assistantPromptChars: promptChars,
    hasRecapInputSnapshot: Boolean(payload.recapInputSnapshotJson),
  }
}
