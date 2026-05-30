import OpenAI from 'openai'
import type { AIResponseEnvelope, ConversationSummary } from '../../../models/contracts'
import type { AiConversationTurnRequest } from '../contracts/AiConversationTurnRequest'
import type { AiEndSummaryRequest } from '../contracts/AiEndSummaryRequest'
import type { AiTurnEnrichmentRequest } from '../contracts/AiTurnEnrichmentRequest'
import type { AssistantReplyStreamEvent, ConversationAiProvider, StreamMetrics } from '../contracts/ConversationAiProvider'
import {
  getAiMaxRetries,
  getAiRequestTimeoutMs,
  getLiveAiMaxRetries,
  getLiveAiRequestTimeoutMs,
  getLiveTemperature,
  getConversationEnrichmentMaxOutputTokens,
  getConversationRecapMaxOutputTokens,
  getConversationTurnReplyMaxOutputTokens,
  replyStageAMaxOutputTokensForRequest,
  getOpenAiConversationModel,
  getOpenAiDirectConfig,
  getOpenAiEnrichmentModel,
  getOpenAiLanguageCoachReplyModel,
  getOpenAiLiveReplyModel,
  getOpenAiRecapModel,
  getSpeakLiveCoachReplyMaxRetries,
  getSpeakLiveCoachReplyRequestTimeoutMs,
  useSpeakLiveMicroLlmPrompt,
  useUltraLeanSpeakLivePromptForScenario,
} from '../config/aiProviderConfig'
import { selectReplyClientTier } from './replyClientRouting'
import { AiProviderError, AiValidationError } from '../errors'
import { aiLogError, aiLogInfo, safeUserTextHint } from '../logging/aiRunLogger'
import { mergeReplyAndEnrichment } from '../orchestration/mergeConversationStages'
import { buildSummaryChatPayload } from '../orchestration/SummaryPromptBuilder'
import {
  buildAssistantReplyPlainTextMessages,
  buildEnrichmentChatMessages,
  buildReplyOnlyChatMessages,
  buildReplyOnlyChatMessagesWithMetrics,
} from '../orchestration/TurnPromptBuilder'
import {
  mapEnrichmentModelOutput,
  mapLiveSpeakReplyModelOutput,
  mapRecapModelOutput,
  mapReplyOnlyModelOutput,
} from '../orchestration/ResponseMapper'
import { nextAssistantReplyTextDelta } from '../orchestration/replyOnlyAssistantReplyStream'

export class OpenAiConversationAiProvider implements ConversationAiProvider {
  readonly id = 'openai'
  readonly turnModelLabel: string

  private readonly client: OpenAI
  /** Separate client for live turns: tighter timeout, 0 retries. */
  private readonly liveClient: OpenAI
  /**
   * Dedicated client for the language-coach LIVE reply path. Coach mode uses the FULL reply-only
   * JSON contract (not the ultra-lean micro contract), so it's not eligible for {@link liveClient}'s
   * 15s budget — but it's still a live conversational turn and must NOT silently retry on the
   * heavy {@link client} (120s × 2 retries = up to 6-minute hangs that surface as "Small hiccup").
   * 25s timeout + 0 retries gives coach turns enough headroom for the bigger prompt while still
   * failing fast when OpenAI is wedged.
   */
  private readonly coachClient: OpenAI
  private readonly conversationModel: string
  private readonly liveReplyModel: string
  private readonly coachReplyModel: string
  private readonly enrichmentModel: string
  private readonly recapModel: string

  constructor() {
    const cfg = getOpenAiDirectConfig()
    this.conversationModel = getOpenAiConversationModel()
    this.liveReplyModel = getOpenAiLiveReplyModel()
    this.coachReplyModel = getOpenAiLanguageCoachReplyModel()
    this.enrichmentModel = getOpenAiEnrichmentModel()
    this.recapModel = getOpenAiRecapModel()
    this.turnModelLabel = `${this.conversationModel} | live:${this.liveReplyModel} / coach:${this.coachReplyModel} / enrich:${this.enrichmentModel}`
    this.client = new OpenAI({
      apiKey: cfg.apiKey,
      baseURL: cfg.baseURL,
      organization: cfg.organization,
      project: cfg.project,
      timeout: getAiRequestTimeoutMs(),
      maxRetries: getAiMaxRetries(),
    })
    this.liveClient = new OpenAI({
      apiKey: cfg.apiKey,
      baseURL: cfg.baseURL,
      organization: cfg.organization,
      project: cfg.project,
      timeout: getLiveAiRequestTimeoutMs(),
      maxRetries: getLiveAiMaxRetries(),
    })
    this.coachClient = new OpenAI({
      apiKey: cfg.apiKey,
      baseURL: cfg.baseURL,
      organization: cfg.organization,
      project: cfg.project,
      timeout: getSpeakLiveCoachReplyRequestTimeoutMs(),
      maxRetries: getSpeakLiveCoachReplyMaxRetries(),
    })
  }

  /**
   * Picks the OpenAI client whose timeout/retry budget matches the turn type. See
   * {@link selectReplyClientTier} for the tier rules — this method just maps the tier
   * onto the concrete pre-constructed OpenAI client instances.
   */
  private pickReplyClient(request: AiConversationTurnRequest, liveUltra: boolean): OpenAI {
    switch (selectReplyClientTier(request, liveUltra)) {
      case 'ultra':
        return this.liveClient
      case 'coach':
        return this.coachClient
      default:
        return this.client
    }
  }

  /**
   * Picks the OpenAI model whose throughput matches the turn type. Mirrors {@link pickReplyClient}
   * so the model and the client tier stay consistent: the coach client (25s, 0 retries) is paired
   * with the coach model (`gpt-4.1-mini` by default), the live client (15s, 0 retries) with the
   * live-reply model, and everything else with the standard conversation model.
   */
  private pickReplyModel(request: AiConversationTurnRequest, liveUltra: boolean): string {
    switch (selectReplyClientTier(request, liveUltra)) {
      case 'ultra':
        return this.liveReplyModel
      case 'coach':
        return this.coachReplyModel
      default:
        return this.conversationModel
    }
  }

  async generateTurn(request: AiConversationTurnRequest): Promise<AIResponseEnvelope> {
    const reply = await this.generateAssistantReplyOnly(request)
    const enrichment = await this.generateTurnEnrichment({ ...request, assistantReply: reply.assistantReply })
    return mergeReplyAndEnrichment(reply, enrichment)
  }

  async generateAssistantReplyOnly(request: AiConversationTurnRequest) {
    const messages = buildReplyOnlyChatMessages(request)
    const liveUltra = Boolean(request.speakLive && useUltraLeanSpeakLivePromptForScenario(request.scenario.slug))
    const model = this.pickReplyModel(request, liveUltra)
    const promptChars = messages.reduce((n, m) => n + m.content.length, 0)
    const t0 = Date.now()
    let raw = ''
    try {
      const completion = await this.pickReplyClient(request, liveUltra).chat.completions.create({
        model,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.35,
        max_tokens: replyStageAMaxOutputTokensForRequest(request),
      })
      raw = completion.choices[0]?.message?.content ?? ''
      if (!raw.trim()) {
        throw new AiProviderError('Empty OpenAI completion content')
      }
      const envelope = liveUltra ? mapLiveSpeakReplyModelOutput(raw, request) : mapReplyOnlyModelOutput(raw)
      if (liveUltra) {
        aiLogInfo('speak_live_live_llm_reply', {
          provider: this.id,
          model,
          promptChars,
          responseChars: raw.length,
          estimatedInputTokens: Math.max(1, Math.round(promptChars / 4)),
          estimatedOutputTokens: Math.max(1, Math.round(raw.length / 4)),
          livePromptMicro: useSpeakLiveMicroLlmPrompt(),
          durationMs: Date.now() - t0,
          threadId: request.threadId,
          correlationId: request.correlationId,
          ...safeUserTextHint(request.userText),
        })
      } else {
        aiLogInfo('ai_reply_only_complete', {
          provider: this.id,
          model,
          durationMs: Date.now() - t0,
          threadId: request.threadId,
          correlationId: request.correlationId,
          validation: 'ok',
          ...safeUserTextHint(request.userText),
        })
      }
      return envelope
    } catch (e) {
      if (e instanceof AiValidationError) {
        aiLogError('ai_reply_only_validation', e, {
          provider: this.id,
          threadId: request.threadId,
          correlationId: request.correlationId,
          rawSample: raw.slice(0, 240),
          rawLen: raw.length,
          ...safeUserTextHint(request.userText),
        })
        throw e
      }
      if (e instanceof OpenAI.APIError) {
        aiLogError('ai_reply_only_openai_api', e, {
          provider: this.id,
          status: e.status,
          threadId: request.threadId,
        })
        throw new AiProviderError(e.message, e.status)
      }
      aiLogError('ai_reply_only_failed', e, { provider: this.id, threadId: request.threadId })
      throw new AiProviderError(e instanceof Error ? e.message : 'OpenAI reply-only failed')
    }
  }

  async generateTurnEnrichment(request: AiTurnEnrichmentRequest) {
    const messages = buildEnrichmentChatMessages(request)
    const t0 = Date.now()
    try {
      const completion = await this.client.chat.completions.create({
        model: this.enrichmentModel,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.35,
        max_tokens: getConversationEnrichmentMaxOutputTokens(),
      })
      const raw = completion.choices[0]?.message?.content ?? ''
      if (!raw.trim()) {
        throw new AiProviderError('Empty OpenAI enrichment content')
      }
      const envelope = mapEnrichmentModelOutput(raw)
      aiLogInfo('ai_enrichment_complete', {
        provider: this.id,
        model: this.enrichmentModel,
        durationMs: Date.now() - t0,
        threadId: request.threadId,
        correlationId: request.correlationId,
        validation: 'ok',
        ...safeUserTextHint(request.userText),
      })
      return envelope
    } catch (e) {
      if (e instanceof AiValidationError) {
        aiLogError('ai_enrichment_validation', e, {
          provider: this.id,
          threadId: request.threadId,
          correlationId: request.correlationId,
          ...safeUserTextHint(request.userText),
        })
        throw e
      }
      if (e instanceof OpenAI.APIError) {
        aiLogError('ai_enrichment_openai_api', e, {
          provider: this.id,
          status: e.status,
          threadId: request.threadId,
        })
        throw new AiProviderError(e.message, e.status)
      }
      aiLogError('ai_enrichment_failed', e, { provider: this.id, threadId: request.threadId })
      throw new AiProviderError(e instanceof Error ? e.message : 'OpenAI enrichment failed')
    }
  }

  async *streamAssistantPlainText(request: AiConversationTurnRequest): AsyncIterable<string> {
    const messages = buildAssistantReplyPlainTextMessages(request)
    const t0 = Date.now()
    try {
      const stream = await this.client.chat.completions.create({
        model: this.conversationModel,
        messages,
        stream: true,
        temperature: 0.35,
        max_tokens: getConversationTurnReplyMaxOutputTokens(),
      })
      for await (const chunk of stream) {
        const piece = chunk.choices[0]?.delta?.content
        if (piece) yield piece
      }
      aiLogInfo('ai_reply_stream_complete', {
        provider: this.id,
        model: this.conversationModel,
        durationMs: Date.now() - t0,
        threadId: request.threadId,
        correlationId: request.correlationId,
        ...safeUserTextHint(request.userText),
      })
    } catch (e) {
      if (e instanceof OpenAI.APIError) {
        aiLogError('ai_reply_stream_openai_api', e, {
          provider: this.id,
          status: e.status,
          threadId: request.threadId,
        })
        throw new AiProviderError(e.message, e.status)
      }
      aiLogError('ai_reply_stream_failed', e, { provider: this.id, threadId: request.threadId })
      throw new AiProviderError(e instanceof Error ? e.message : 'OpenAI stream failed')
    }
  }

  async *streamAssistantReplyOnly(request: AiConversationTurnRequest): AsyncIterable<AssistantReplyStreamEvent> {
    const liveUltra = Boolean(request.speakLive && useUltraLeanSpeakLivePromptForScenario(request.scenario.slug))
    const { messages, metrics: promptMetrics } = buildReplyOnlyChatMessagesWithMetrics(request)
    const model = this.pickReplyModel(request, liveUltra)
    const promptChars = promptMetrics?.totalChars ?? messages.reduce((n, m) => n + m.content.length, 0)
    const temperature = liveUltra ? getLiveTemperature() : 0.35
    const t0 = Date.now()
    let raw = ''
    let emittedStrippedLen = 0
    let firstTokenMs = 0
    let firstTokenSeen = false
    try {
      const stream = await this.pickReplyClient(request, liveUltra).chat.completions.create({
        model,
        messages,
        stream: true,
        response_format: { type: 'json_object' },
        temperature,
        max_tokens: replyStageAMaxOutputTokensForRequest(request),
      })
      for await (const chunk of stream) {
        const piece = chunk.choices[0]?.delta?.content ?? ''
        if (piece && !firstTokenSeen) {
          firstTokenMs = Date.now() - t0
          firstTokenSeen = true
        }
        raw += piece
        const { delta, newEmittedStrippedLen } = nextAssistantReplyTextDelta(raw, emittedStrippedLen)
        emittedStrippedLen = newEmittedStrippedLen
        if (delta) yield { type: 'delta', text: delta }
      }
      if (!raw.trim()) {
        throw new AiProviderError('Empty OpenAI streaming reply-only content')
      }
      const totalMs = Date.now() - t0
      const envelope = liveUltra ? mapLiveSpeakReplyModelOutput(raw, request) : mapReplyOnlyModelOutput(raw)
      const sm: StreamMetrics = {
        firstTokenMs,
        totalMs,
        promptChars,
        estimatedInputTokens: Math.max(1, Math.round(promptChars / 3.5)),
        responseChars: raw.length,
        estimatedOutputTokens: Math.max(1, Math.round(raw.length / 3.5)),
        model,
      }
      if (liveUltra) {
        aiLogInfo('speak_live_live_llm_stream', {
          provider: this.id,
          model,
          promptChars: sm.promptChars,
          estimatedInputTokens: sm.estimatedInputTokens,
          estimatedOutputTokens: sm.estimatedOutputTokens,
          livePromptMicro: useSpeakLiveMicroLlmPrompt(),
          responseChars: sm.responseChars,
          firstTokenMs: sm.firstTokenMs,
          durationMs: sm.totalMs,
          promptBudgetExceeded: promptMetrics?.budgetExceeded,
          recentTurnsIncluded: promptMetrics?.recentTurnsIncluded,
          temperature,
          threadId: request.threadId,
          correlationId: request.correlationId,
          ...safeUserTextHint(request.userText),
        })
      } else {
        aiLogInfo('ai_reply_only_stream_complete', {
          provider: this.id,
          model,
          durationMs: sm.totalMs,
          firstTokenMs: sm.firstTokenMs,
          threadId: request.threadId,
          correlationId: request.correlationId,
          validation: 'ok',
          ...safeUserTextHint(request.userText),
        })
      }
      yield { type: 'complete', envelope, raw, streamMetrics: sm }
    } catch (e) {
      if (e instanceof AiValidationError) {
        aiLogError('ai_reply_only_stream_validation', e, {
          provider: this.id,
          threadId: request.threadId,
          correlationId: request.correlationId,
          /** Truncated sample of the failing payload — needed to diagnose model-side JSON drift. */
          rawSample: raw.slice(0, 240),
          rawLen: raw.length,
          ...safeUserTextHint(request.userText),
        })
        throw e
      }
      if (e instanceof OpenAI.APIError) {
        aiLogError('ai_reply_only_stream_openai_api', e, {
          provider: this.id,
          status: e.status,
          threadId: request.threadId,
        })
        throw new AiProviderError(e.message, e.status)
      }
      aiLogError('ai_reply_only_stream_failed', e, { provider: this.id, threadId: request.threadId })
      throw new AiProviderError(e instanceof Error ? e.message : 'OpenAI reply-only stream failed')
    }
  }

  async generateEndSummary(request: AiEndSummaryRequest): Promise<ConversationSummary> {
    const { system, user } = buildSummaryChatPayload(request)
    const messages = [
      { role: 'system' as const, content: system },
      { role: 'user' as const, content: user },
    ]
    const t0 = Date.now()
    try {
      const completion = await this.client.chat.completions.create({
        model: this.recapModel,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.35,
        max_tokens: getConversationRecapMaxOutputTokens(),
      })
      const raw = completion.choices[0]?.message?.content ?? ''
      if (!raw.trim()) {
        throw new AiProviderError('Empty OpenAI recap content')
      }
      const summary = mapRecapModelOutput(raw, request.threadId)
      aiLogInfo('ai_summary_complete', {
        provider: this.id,
        model: this.recapModel,
        durationMs: Date.now() - t0,
        threadId: request.threadId,
        correlationId: request.correlationId,
      })
      return summary
    } catch (e) {
      if (e instanceof OpenAI.APIError) {
        aiLogError('ai_summary_openai_api', e, { provider: this.id, status: e.status })
        throw new AiProviderError(e.message, e.status)
      }
      aiLogError('ai_summary_failed', e, { provider: this.id, threadId: request.threadId })
      throw new AiProviderError(e instanceof Error ? e.message : 'OpenAI recap failed')
    }
  }
}
