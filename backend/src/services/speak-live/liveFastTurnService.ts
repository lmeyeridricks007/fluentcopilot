/**
 * Dedicated fast-turn service for Speak Live — bypasses full conversationAppService
 * overhead (DB scenario/persona lookups, moderation, state computation) by accepting
 * a compact state object from the client.
 *
 * Hot path: compact state + transcript → micro LLM prompt → streamed NDJSON tokens.
 * Background: persist user + assistant messages after first token is streamed.
 */

import { createConversationAiProvider } from '../ai/factory/createConversationAiProvider'
import { assertSpeakLiveConversationModelInfrastructureReady } from '../ai/config/aiProviderConfig'
import { buildReplyOnlyChatMessagesWithMetrics } from '../ai/orchestration/TurnPromptBuilder'
import { aiLogError, aiLogInfo } from '../ai/logging/aiRunLogger'
import { AiProviderError, AiValidationError, AiTimeoutError, AiConfigurationError } from '../ai/errors'
import { ApiError } from '../../shared/errors'
import type { AiConversationTurnRequest } from '../ai/contracts/AiConversationTurnRequest'
import type { SpeakLivePersistedState } from '../../domain/speakLive/speakLiveFsm'
import { stripLeadingEnglishClauseFromOrderingFoodAssistantLine } from '../../domain/speakLive/orderingFoodScenario'
import {
  appendCumulativeSpeakLiveMemoryTurn,
  computeNextSpeakLiveState,
  serializeSpeakLiveState,
} from '../../domain/speakLive/speakLiveFsm'
import { groundSpeakLiveUserTurn, formatGroundingForPrompt, mergeSpeakLiveSignalsWithGrounding } from '../../domain/speakLive/scenarioIntentGrounding'
import { normalizeTranscriptForLiveConversation, transcriptRawFromFinalUtterance } from './liveSpeechTurnService'
import { getSqlPool } from '../sql/sqlPool'
import * as messageRepo from '../../repositories/conversationMessageRepository'
import * as threadRepo from '../../repositories/conversationThreadRepository'
import * as userRepo from '../../repositories/userRepository'

export type LiveCompactState = {
  scenarioSlug: string
  scenarioTitle: string
  personaName: string
  personaRole: string
  level: string
  phase: string
  goalIndex: number
  goalsCompleted: number[]
  goalTitles: string[]
  recentTurns: Array<{ role: 'U' | 'A'; text: string }>
  slotState: Record<string, unknown> | null
  groundingBlock: string
  rollingSummary?: string | null
}

export type FastTurnNdjsonEvent =
  | { type: 'meta'; compactState: LiveCompactState }
  | { type: 'delta'; text: string }
  | { type: 'done'; assistantText: string; compactState: LiveCompactState; perf: FastTurnPerf }
  | { type: 'error'; message: string }

export type FastTurnPerf = {
  transcriptNormMs: number
  llmFirstTokenMs: number
  llmTotalMs: number
  promptChars: number
  estimatedInputTokens: number
  responseChars: number
  estimatedOutputTokens: number
  totalMs: number
  model?: string
  promptBudgetExceeded?: boolean
  recentTurnsIncluded?: number
  temperature?: number
}

function mapAiErrorToApi(e: unknown): never {
  if (e instanceof AiValidationError) throw new ApiError(502, 'LLM_ERROR', 'Model returned invalid structured output')
  if (e instanceof AiProviderError) throw new ApiError(502, 'LLM_ERROR', e.message)
  if (e instanceof AiTimeoutError) throw new ApiError(504, 'LLM_ERROR', e.message)
  if (e instanceof AiConfigurationError) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', e.message)
  throw e
}

function compactStateToSpeakLiveState(cs: LiveCompactState): SpeakLivePersistedState {
  return {
    version: 1,
    phase: cs.phase as SpeakLivePersistedState['phase'],
    goalIndex: cs.goalIndex,
    goalsCompleted: cs.goalsCompleted,
    clarificationRounds: 0,
    rollingSummaryEnglish: cs.rollingSummary ?? '',
    intentLabel: null,
    updatedAt: new Date().toISOString(),
    scenarioSessionState: cs.slotState as SpeakLivePersistedState['scenarioSessionState'],
  }
}

function buildCompactStateFromPersisted(
  prev: LiveCompactState,
  next: SpeakLivePersistedState,
  assistantText: string,
  userText: string,
): LiveCompactState {
  const recentTurns = [
    ...prev.recentTurns,
    { role: 'U' as const, text: userText.slice(0, 120) },
    { role: 'A' as const, text: assistantText.slice(0, 120) },
  ].slice(-4)

  return {
    ...prev,
    phase: next.phase,
    goalIndex: next.goalIndex,
    goalsCompleted: next.goalsCompleted,
    slotState: (next.scenarioSessionState ?? null) as Record<string, unknown> | null,
    rollingSummary: next.rollingSummaryEnglish,
    recentTurns,
  }
}

/**
 * Fast-turn NDJSON generator — the hot path for live voice.
 * Yields meta → delta tokens → done with updated compact state.
 */
export async function* streamFastTurn(params: {
  externalUserId: string
  threadId: string
  transcript: string
  compactState: LiveCompactState
}): AsyncGenerator<FastTurnNdjsonEvent> {
  const t0 = Date.now()

  const rawTranscript = transcriptRawFromFinalUtterance(params.transcript)
  const normalized = normalizeTranscriptForLiveConversation(params.transcript)
  const transcriptNormMs = Date.now() - t0

  if (!normalized.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'No usable transcript after normalization')
  }

  assertSpeakLiveConversationModelInfrastructureReady()

  const cs = params.compactState
  const prevState = compactStateToSpeakLiveState(cs)

  const groundingPatch = groundSpeakLiveUserTurn(cs.scenarioSlug, normalized.trim(), `fast-${Date.now()}`)
  const groundingFormatted = groundingPatch ? formatGroundingForPrompt(groundingPatch) : null
  const verifiedGroundingBlock = [groundingFormatted, cs.groundingBlock].filter(Boolean).join('\n\n') || null

  const turnRequest: AiConversationTurnRequest = {
    threadId: params.threadId,
    scenario: {
      id: cs.scenarioSlug,
      slug: cs.scenarioSlug,
      title: cs.scenarioTitle,
      goals: cs.goalTitles,
      description: '',
      openingLine: '',
      supportStrategy: null,
    } as unknown as AiConversationTurnRequest['scenario'],
    persona: {
      id: cs.personaName,
      displayName: cs.personaName,
      role: cs.personaRole,
    } as unknown as AiConversationTurnRequest['persona'],
    mode: 'guided' as const,
    feedbackMode: 'end' as const,
    threadSummary: cs.rollingSummary ?? null,
    recentMessages: cs.recentTurns.map((t, i) => ({
      id: `fast-${i}`,
      threadId: params.threadId,
      sender: t.role === 'U' ? 'user' : 'assistant',
      messageType: 'text',
      content: t.text,
      createdAt: new Date(),
    })) as unknown as AiConversationTurnRequest['recentMessages'],
    userText: normalized,
    speakLive: {
      state: prevState,
      goalTitles: cs.goalTitles,
      scenarioTitle: cs.scenarioTitle,
      verifiedGroundingBlock,
      learnerLevelCefr: cs.level || null,
    },
  }

  yield { type: 'meta', compactState: cs }

  const provider = createConversationAiProvider()
  let accumulated = ''
  let llmFirstTokenMs = 0
  let firstToken = true
  const tLlm0 = Date.now()
  let promptChars = 0

  try {
    const { messages: msgs, metrics: promptMetrics } = buildReplyOnlyChatMessagesWithMetrics(turnRequest)
    promptChars = promptMetrics?.totalChars ?? msgs.reduce((n, m) => n + (typeof m.content === 'string' ? m.content.length : 0), 0)
  } catch {
    promptChars = 0
  }

  let reply: {
    envelope: import('../../models/contracts').AssistantReplyEnvelope
    raw: string
    streamMetrics?: import('../ai/contracts/ConversationAiProvider').StreamMetrics
  } | null = null

  try {
    for await (const ev of provider.streamAssistantReplyOnly(turnRequest)) {
      if (ev.type === 'delta' && ev.text) {
        if (firstToken) {
          llmFirstTokenMs = Date.now() - tLlm0
          firstToken = false
        }
        accumulated += ev.text
        yield { type: 'delta', text: ev.text }
      }
      if (ev.type === 'complete') {
        reply = { envelope: ev.envelope, raw: ev.raw, streamMetrics: ev.streamMetrics }
      }
    }
  } catch (e) {
    mapAiErrorToApi(e)
  }

  const llmTotalMs = Date.now() - tLlm0

  if (!reply) {
    throw new ApiError(502, 'LLM_ERROR', 'Fast turn stream ended without completion')
  }

  let assistantText = reply.envelope.assistantReply?.trim() || accumulated.trim()
  const slugNorm = cs.scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (
    slugNorm === 'ordering_food' ||
    slugNorm === 'supermarket_shop' ||
    slugNorm === 'booking_reservations' ||
    slugNorm === 'store_service_issue' ||
    slugNorm === 'work_colleague_interaction' ||
    slugNorm === 'housing_landlord' ||
    slugNorm === 'doctor_pharmacy' ||
    slugNorm === 'directions_getting_somewhere' ||
    slugNorm === 'phone_call' ||
    slugNorm === 'small_talk' ||
    slugNorm === 'meeting_new_people' ||
    slugNorm === 'party_social' ||
    slugNorm === 'explaining_something' ||
    slugNorm === 'storytelling' ||
    slugNorm === 'opinions_discussions'
  ) {
    assistantText = stripLeadingEnglishClauseFromOrderingFoodAssistantLine(assistantText)
  }

  const mergedSignals = groundingPatch
    ? mergeSpeakLiveSignalsWithGrounding({
        model: reply.envelope.speakLiveSignals,
        patch: groundingPatch,
        scenarioGoalCount: cs.goalTitles.length,
        phase: prevState.phase,
      })
    : reply.envelope.speakLiveSignals

  const nextStateRaw = computeNextSpeakLiveState({
    prev: prevState,
    scenarioGoalCount: cs.goalTitles.length,
    signals: mergedSignals,
    shouldConversationEnd: reply.envelope.shouldConversationEnd,
    userTextTrimmed: normalized.trim(),
    scenarioSlug: slugNorm,
  })
  const nextState = {
    ...nextStateRaw,
    rollingSummaryEnglish: appendCumulativeSpeakLiveMemoryTurn({
      scenarioSlug: slugNorm,
      rollingSummaryEnglish: nextStateRaw.rollingSummaryEnglish,
      userTextTrimmed: normalized.trim(),
      assistantTextTrimmed: assistantText,
    }),
  }

  const nextCompactState = buildCompactStateFromPersisted(cs, nextState, assistantText, normalized)

  const sm = reply.streamMetrics
  const perf: FastTurnPerf = {
    transcriptNormMs,
    llmFirstTokenMs: sm?.firstTokenMs ?? llmFirstTokenMs,
    llmTotalMs: sm?.totalMs ?? llmTotalMs,
    promptChars: sm?.promptChars ?? promptChars,
    estimatedInputTokens: sm?.estimatedInputTokens ?? Math.max(1, Math.round(promptChars / 3.5)),
    responseChars: sm?.responseChars ?? accumulated.length,
    estimatedOutputTokens: sm?.estimatedOutputTokens ?? Math.max(1, Math.round(accumulated.length / 3.5)),
    totalMs: Date.now() - t0,
    model: sm?.model,
  }

  yield { type: 'done', assistantText, compactState: nextCompactState, perf }

  backgroundPersist({
    externalUserId: params.externalUserId,
    threadId: params.threadId,
    userText: normalized,
    rawTranscript: rawTranscript,
    assistantText,
    nextState,
    mergedSignals,
    reply: reply.envelope,
    level: cs.level,
  }).catch((e) => {
    aiLogError('fast_turn_background_persist_failed', e, { threadId: params.threadId })
  })
}

async function backgroundPersist(params: {
  externalUserId: string
  threadId: string
  userText: string
  rawTranscript: string
  assistantText: string
  nextState: SpeakLivePersistedState
  mergedSignals: unknown
  reply: import('../../models/contracts').AssistantReplyEnvelope
  level: string
}): Promise<void> {
  try {
    const pool = await getSqlPool()
    if (!pool) return
    const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
    const thread = await threadRepo.getThreadById(pool, params.threadId)
    if (!thread || thread.userId !== userInternalId || thread.status !== 'active') return

    const userMsg = await messageRepo.insertMessage(pool, {
      threadId: thread.id,
      sender: 'user',
      messageType: 'text',
      content: params.userText,
      metadata: {
        liveSpeechTurn: true,
        sessionId: thread.id,
        speaker: 'learner',
        transcriptRaw: params.rawTranscript,
        transcriptNormalized: params.userText,
        normalizedTranscript: params.userText,
        inputMode: 'speech',
        learnerLevelCefr: params.level || undefined,
        fastTurn: true,
      },
    })

    const asstMsg = await messageRepo.insertMessage(pool, {
      threadId: thread.id,
      sender: 'assistant',
      messageType: 'text',
      content: params.assistantText,
      metadata: {
        enrichmentPending: false,
        enrichmentComplete: true,
        deepEvaluationDeferred: true,
        liveConversationPipeline: 'fast_turn_v1',
        scenarioProgress: params.reply.scenarioProgress,
        shouldConversationEnd: params.reply.shouldConversationEnd,
        speakLiveSignals: params.mergedSignals ?? null,
        speakLivePhase: params.nextState.phase,
        fastTurn: true,
      },
    })

    await threadRepo.updateThreadState(pool, thread.id, {
      lastUserMessageAt: new Date(),
      speakLiveStateJson: serializeSpeakLiveState(params.nextState),
    })

    aiLogInfo('fast_turn_persisted', {
      threadId: thread.id,
      userMessageId: userMsg.id,
      assistantMessageId: asstMsg.id,
    })
  } catch (e) {
    aiLogError('fast_turn_persist_error', e, { threadId: params.threadId })
  }
}
