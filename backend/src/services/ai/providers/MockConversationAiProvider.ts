import type { AIResponseEnvelope, ConversationSummary } from '../../../models/contracts'
import type { AiConversationTurnRequest } from '../contracts/AiConversationTurnRequest'
import type { AiEndSummaryRequest } from '../contracts/AiEndSummaryRequest'
import type { AiTurnEnrichmentRequest } from '../contracts/AiTurnEnrichmentRequest'
import type { AssistantReplyStreamEvent, ConversationAiProvider } from '../contracts/ConversationAiProvider'
import { useUltraLeanSpeakLivePromptForScenario } from '../config/aiProviderConfig'
import { mergeReplyAndEnrichment } from '../orchestration/mergeConversationStages'
import { buildReplyOnlyChatMessages } from '../orchestration/TurnPromptBuilder'
import { mapRecapModelOutput } from '../orchestration/ResponseMapper'
import { aiLogInfo } from '../logging/aiRunLogger'
import { buildMockRecapJsonString, computeMockEnrichment, computeMockReplyOnly } from './mockTurnLogic'
import { nextAssistantReplyTextDelta } from '../orchestration/replyOnlyAssistantReplyStream'

export class MockConversationAiProvider implements ConversationAiProvider {
  readonly id = 'mock'
  readonly turnModelLabel = 'mock-deterministic'

  async generateTurn(request: AiConversationTurnRequest): Promise<AIResponseEnvelope> {
    const reply = await this.generateAssistantReplyOnly(request)
    const enrich = await this.generateTurnEnrichment({ ...request, assistantReply: reply.assistantReply })
    return mergeReplyAndEnrichment(reply, enrich)
  }

  async generateAssistantReplyOnly(request: AiConversationTurnRequest) {
    const t0 = Date.now()
    const envelope = computeMockReplyOnly({
      userText: request.userText,
      priorSummary: request.threadSummary,
      speakLive: request.speakLive ? { phase: request.speakLive.state.phase } : null,
    })
    const liveUltra = Boolean(request.speakLive && useUltraLeanSpeakLivePromptForScenario(request.scenario.slug))
    if (liveUltra) {
      const promptChars = buildReplyOnlyChatMessages(request).reduce((n, m) => n + m.content.length, 0)
      aiLogInfo('speak_live_ultra_lean_reply', {
        provider: this.id,
        model: this.turnModelLabel,
        promptChars,
        responseChars: envelope.assistantReply.length + 80,
        durationMs: Date.now() - t0,
        threadId: request.threadId,
        correlationId: request.correlationId,
        validation: 'skipped_mock',
      })
    } else {
      aiLogInfo('ai_reply_only_complete', {
        provider: this.id,
        model: this.turnModelLabel,
        durationMs: Date.now() - t0,
        threadId: request.threadId,
        correlationId: request.correlationId,
        validation: 'skipped_mock',
      })
    }
    return envelope
  }

  async generateTurnEnrichment(request: AiTurnEnrichmentRequest) {
    const t0 = Date.now()
    const envelope = computeMockEnrichment({
      userText: request.userText,
      priorSummary: request.threadSummary,
      assistantReply: request.assistantReply,
    })
    aiLogInfo('ai_enrichment_complete', {
      provider: this.id,
      model: this.turnModelLabel,
      durationMs: Date.now() - t0,
      threadId: request.threadId,
      correlationId: request.correlationId,
      validation: 'skipped_mock',
    })
    return envelope
  }

  async *streamAssistantPlainText(request: AiConversationTurnRequest): AsyncIterable<string> {
    const reply = await this.generateAssistantReplyOnly(request)
    yield reply.assistantReply
  }

  async *streamAssistantReplyOnly(request: AiConversationTurnRequest): AsyncIterable<AssistantReplyStreamEvent> {
    const t0 = Date.now()
    const reply = await this.generateAssistantReplyOnly(request)
    const liveUltra = Boolean(request.speakLive && useUltraLeanSpeakLivePromptForScenario(request.scenario.slug))
    const promptChars = liveUltra
      ? buildReplyOnlyChatMessages(request).reduce((n, m) => n + m.content.length, 0)
      : 0
    const raw = liveUltra
      ? JSON.stringify({
          assistantText: reply.assistantReply,
          answeredGoals: [],
          trainAnsweredGoalIds: reply.trainTurnResponse?.answeredGoals?.length
            ? reply.trainTurnResponse.answeredGoals
            : undefined,
          detectedUserIntentOptional: reply.speakLiveSignals?.intentLabel ?? null,
          pendingGoalsOptional:
            reply.trainTurnResponse?.unresolvedGoals?.slice(0, 6).map((g) => String(g)) ?? undefined,
        })
      : JSON.stringify({
          assistantReply: reply.assistantReply,
          shouldConversationEnd: reply.shouldConversationEnd,
          scenarioProgress: reply.scenarioProgress ?? null,
          speakLiveSignals: reply.speakLiveSignals ?? null,
          trainTurnResponse: reply.trainTurnResponse ?? null,
        })
    let buf = ''
    let emittedStrippedLen = 0
    const step = 6
    for (let i = 0; i < raw.length; i += step) {
      buf += raw.slice(i, i + step)
      const { delta, newEmittedStrippedLen } = nextAssistantReplyTextDelta(buf, emittedStrippedLen)
      emittedStrippedLen = newEmittedStrippedLen
      if (delta) yield { type: 'delta', text: delta }
    }
    if (liveUltra) {
      aiLogInfo('speak_live_ultra_lean_stream', {
        provider: this.id,
        model: this.turnModelLabel,
        promptChars,
        responseChars: raw.length,
        durationMs: Date.now() - t0,
        threadId: request.threadId,
        correlationId: request.correlationId,
        validation: 'skipped_mock',
      })
    }
    yield { type: 'complete', envelope: reply, raw }
  }

  async generateEndSummary(request: AiEndSummaryRequest): Promise<ConversationSummary> {
    const t0 = Date.now()
    const raw = buildMockRecapJsonString()
    const summary = mapRecapModelOutput(raw, request.threadId)
    aiLogInfo('ai_summary_complete', {
      provider: this.id,
      model: this.turnModelLabel,
      durationMs: Date.now() - t0,
      threadId: request.threadId,
      correlationId: request.correlationId,
    })
    return summary
  }
}
