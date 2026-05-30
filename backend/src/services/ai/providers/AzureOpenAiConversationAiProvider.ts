import type { AIResponseEnvelope, ConversationSummary } from '../../../models/contracts'
import type { ChatMessage } from '../../../prompts/buildTurnMessages'
import type { AiConversationTurnRequest } from '../contracts/AiConversationTurnRequest'
import type { AiEndSummaryRequest } from '../contracts/AiEndSummaryRequest'
import type { AiTurnEnrichmentRequest } from '../contracts/AiTurnEnrichmentRequest'
import type { AssistantReplyStreamEvent, ConversationAiProvider, StreamMetrics } from '../contracts/ConversationAiProvider'
import {
  getAiRequestTimeoutMs,
  getLiveAiRequestTimeoutMs,
  getLiveTemperature,
  getAzureOpenAiConversationConfig,
  getAzureOpenAiEnrichmentDeployment,
  getAzureOpenAiLanguageCoachReplyDeployment,
  getAzureOpenAiLiveReplyDeployment,
  getConversationEnrichmentMaxOutputTokens,
  getConversationRecapMaxOutputTokens,
  getConversationTurnReplyMaxOutputTokens,
  replyStageAMaxOutputTokensForRequest,
  getSpeakLiveCoachReplyRequestTimeoutMs,
  useSpeakLiveMicroLlmPrompt,
  useUltraLeanSpeakLivePromptForScenario,
} from '../config/aiProviderConfig'
import { selectReplyClientTier } from './replyClientRouting'
import { AiProviderError, AiTimeoutError, AiValidationError } from '../errors'
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

/**
 * Mirrors {@link OpenAiConversationAiProvider.pickReplyClient}: picks the per-request
 * timeout for an Azure OpenAI reply call so live conversational turns fail fast instead
 * of waiting on the heavy {@link getAiRequestTimeoutMs} (120s) default. See
 * {@link selectReplyClientTier} for the routing rules.
 *  - ultra-lean speak-live → {@link getLiveAiRequestTimeoutMs} (15s)
 *  - language coach live   → {@link getSpeakLiveCoachReplyRequestTimeoutMs} (25s)
 *  - everything else       → undefined (caller falls back to {@link getAiRequestTimeoutMs})
 */
function pickReplyTimeoutMsForRequest(
  request: AiConversationTurnRequest,
  liveUltra: boolean
): number | undefined {
  switch (selectReplyClientTier(request, liveUltra)) {
    case 'ultra':
      return getLiveAiRequestTimeoutMs()
    case 'coach':
      return getSpeakLiveCoachReplyRequestTimeoutMs()
    default:
      return undefined
  }
}

async function azureChatCompletionJson(
  messages: ChatMessage[],
  maxTokens: number,
  deployment: string,
  opts?: { timeoutMs?: number }
): Promise<string> {
  const { endpoint, apiKey, apiVersion } = getAzureOpenAiConversationConfig()
  if (!endpoint || !apiKey) {
    throw new AiProviderError('Azure OpenAI endpoint or API key missing')
  }
  const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts?.timeoutMs ?? getAiRequestTimeoutMs())
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages,
        temperature: 0.35,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    })
    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[]
      error?: { message?: string }
    }
    if (!res.ok) {
      throw new AiProviderError(data.error?.message ?? `Azure OpenAI HTTP ${res.status}`, res.status)
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new AiProviderError('Empty Azure OpenAI completion content')
    return content
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new AiTimeoutError('Azure OpenAI request timed out')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

async function* azureChatCompletionStreamText(
  messages: ChatMessage[],
  maxTokens: number,
  deployment: string
): AsyncGenerator<string> {
  const { endpoint, apiKey, apiVersion } = getAzureOpenAiConversationConfig()
  if (!endpoint || !apiKey) {
    throw new AiProviderError('Azure OpenAI endpoint or API key missing')
  }
  const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), getAiRequestTimeoutMs())
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages,
        temperature: 0.35,
        max_tokens: maxTokens,
        stream: true,
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new AiProviderError(`Azure OpenAI stream HTTP ${res.status}: ${errText.slice(0, 200)}`, res.status)
    }
    if (!res.body) throw new AiProviderError('Azure OpenAI stream missing body')
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const block of parts) {
        for (const line of block.split('\n')) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          const payload = t.slice(5).trim()
          if (payload === '[DONE]') continue
          try {
            const j = JSON.parse(payload) as {
              choices?: { delta?: { content?: string | null } }[]
            }
            const c = j.choices?.[0]?.delta?.content
            if (c) yield c
          } catch {
            /* ignore parse errors for keep-alive chunks */
          }
        }
      }
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new AiTimeoutError('Azure OpenAI stream timed out')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

async function* azureChatCompletionStreamJson(
  messages: ChatMessage[],
  maxTokens: number,
  deployment: string,
  opts?: { temperature?: number; timeoutMs?: number }
): AsyncGenerator<string> {
  const { endpoint, apiKey, apiVersion } = getAzureOpenAiConversationConfig()
  if (!endpoint || !apiKey) {
    throw new AiProviderError('Azure OpenAI endpoint or API key missing')
  }
  const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts?.timeoutMs ?? getAiRequestTimeoutMs())
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages,
        temperature: opts?.temperature ?? 0.35,
        max_tokens: maxTokens,
        stream: true,
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new AiProviderError(`Azure OpenAI stream HTTP ${res.status}: ${errText.slice(0, 200)}`, res.status)
    }
    if (!res.body) throw new AiProviderError('Azure OpenAI stream missing body')
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const block of parts) {
        for (const line of block.split('\n')) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          const payload = t.slice(5).trim()
          if (payload === '[DONE]') continue
          try {
            const j = JSON.parse(payload) as {
              choices?: { delta?: { content?: string | null } }[]
            }
            const c = j.choices?.[0]?.delta?.content
            if (c) yield c
          } catch {
            /* ignore parse errors for keep-alive chunks */
          }
        }
      }
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new AiTimeoutError('Azure OpenAI stream timed out')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

export class AzureOpenAiConversationAiProvider implements ConversationAiProvider {
  readonly id = 'azure-openai'
  readonly turnModelLabel: string

  private readonly chatDeployment: string
  private readonly liveReplyDeployment: string
  private readonly coachReplyDeployment: string
  private readonly enrichmentDeployment: string

  constructor() {
    const c = getAzureOpenAiConversationConfig()
    this.chatDeployment = c.deployment
    this.liveReplyDeployment = getAzureOpenAiLiveReplyDeployment()
    this.coachReplyDeployment = getAzureOpenAiLanguageCoachReplyDeployment()
    this.enrichmentDeployment = getAzureOpenAiEnrichmentDeployment()
    this.turnModelLabel = `${this.chatDeployment} | live:${this.liveReplyDeployment} / coach:${this.coachReplyDeployment} / enrich:${this.enrichmentDeployment}`
  }

  /**
   * Mirrors {@link OpenAiConversationAiProvider.pickReplyModel}: picks the Azure deployment
   * whose throughput matches the turn type so the language coach can be pinned to a faster
   * deployment without affecting other scenarios.
   */
  private pickReplyDeployment(request: AiConversationTurnRequest, liveUltra: boolean): string {
    switch (selectReplyClientTier(request, liveUltra)) {
      case 'ultra':
        return this.liveReplyDeployment
      case 'coach':
        return this.coachReplyDeployment
      default:
        return this.chatDeployment
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
    const deployment = this.pickReplyDeployment(request, liveUltra)
    const promptChars = messages.reduce((n, m) => n + m.content.length, 0)
    const t0 = Date.now()
    let raw = ''
    try {
      raw = await azureChatCompletionJson(
        messages,
        replyStageAMaxOutputTokensForRequest(request),
        deployment,
        { timeoutMs: pickReplyTimeoutMsForRequest(request, liveUltra) }
      )
      const envelope = liveUltra ? mapLiveSpeakReplyModelOutput(raw, request) : mapReplyOnlyModelOutput(raw)
      if (liveUltra) {
        aiLogInfo('speak_live_live_llm_reply', {
          provider: this.id,
          model: deployment,
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
          model: deployment,
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
          rawSample: raw.slice(0, 240),
          rawLen: raw.length,
          ...safeUserTextHint(request.userText),
        })
        throw e
      }
      aiLogError('ai_reply_only_failed', e, { provider: this.id, threadId: request.threadId })
      if (e instanceof AiProviderError || e instanceof AiTimeoutError) throw e
      throw new AiProviderError(e instanceof Error ? e.message : 'Azure OpenAI reply-only failed')
    }
  }

  async generateTurnEnrichment(request: AiTurnEnrichmentRequest) {
    const messages = buildEnrichmentChatMessages(request)
    const t0 = Date.now()
    try {
      const raw = await azureChatCompletionJson(
        messages,
        getConversationEnrichmentMaxOutputTokens(),
        this.enrichmentDeployment
      )
      const envelope = mapEnrichmentModelOutput(raw)
      aiLogInfo('ai_enrichment_complete', {
        provider: this.id,
        model: this.enrichmentDeployment,
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
          ...safeUserTextHint(request.userText),
        })
        throw e
      }
      aiLogError('ai_enrichment_failed', e, { provider: this.id, threadId: request.threadId })
      if (e instanceof AiProviderError || e instanceof AiTimeoutError) throw e
      throw new AiProviderError(e instanceof Error ? e.message : 'Azure OpenAI enrichment failed')
    }
  }

  async *streamAssistantPlainText(request: AiConversationTurnRequest): AsyncIterable<string> {
    const messages = buildAssistantReplyPlainTextMessages(request)
    const t0 = Date.now()
    try {
      for await (const piece of azureChatCompletionStreamText(
        messages,
        getConversationTurnReplyMaxOutputTokens(),
        this.chatDeployment
      )) {
        yield piece
      }
      aiLogInfo('ai_reply_stream_complete', {
        provider: this.id,
        model: this.chatDeployment,
        durationMs: Date.now() - t0,
        threadId: request.threadId,
        correlationId: request.correlationId,
        ...safeUserTextHint(request.userText),
      })
    } catch (e) {
      aiLogError('ai_reply_stream_failed', e, { provider: this.id, threadId: request.threadId })
      if (e instanceof AiProviderError || e instanceof AiTimeoutError) throw e
      throw new AiProviderError(e instanceof Error ? e.message : 'Azure OpenAI stream failed')
    }
  }

  async *streamAssistantReplyOnly(request: AiConversationTurnRequest): AsyncIterable<AssistantReplyStreamEvent> {
    const liveUltra = Boolean(request.speakLive && useUltraLeanSpeakLivePromptForScenario(request.scenario.slug))
    const { messages, metrics: promptMetrics } = buildReplyOnlyChatMessagesWithMetrics(request)
    const deployment = this.pickReplyDeployment(request, liveUltra)
    const promptChars = promptMetrics?.totalChars ?? messages.reduce((n, m) => n + m.content.length, 0)
    const temperature = liveUltra ? getLiveTemperature() : 0.35
    const timeoutMs = pickReplyTimeoutMsForRequest(request, liveUltra)
    const t0 = Date.now()
    let raw = ''
    let emittedStrippedLen = 0
    let firstTokenMs = 0
    let firstTokenSeen = false
    try {
      for await (const piece of azureChatCompletionStreamJson(
        messages,
        replyStageAMaxOutputTokensForRequest(request),
        deployment,
        { temperature, timeoutMs }
      )) {
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
        throw new AiProviderError('Empty Azure OpenAI streaming reply-only content')
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
        model: deployment,
      }
      if (liveUltra) {
        aiLogInfo('speak_live_live_llm_stream', {
          provider: this.id,
          model: deployment,
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
          model: deployment,
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
          rawSample: raw.slice(0, 240),
          rawLen: raw.length,
          ...safeUserTextHint(request.userText),
        })
        throw e
      }
      aiLogError('ai_reply_only_stream_failed', e, { provider: this.id, threadId: request.threadId })
      if (e instanceof AiProviderError || e instanceof AiTimeoutError) throw e
      throw new AiProviderError(e instanceof Error ? e.message : 'Azure OpenAI reply-only stream failed')
    }
  }

  async generateEndSummary(request: AiEndSummaryRequest): Promise<ConversationSummary> {
    const { system, user } = buildSummaryChatPayload(request)
    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]
    const t0 = Date.now()
    try {
      const raw = await azureChatCompletionJson(messages, getConversationRecapMaxOutputTokens(), this.chatDeployment)
      const summary = mapRecapModelOutput(raw, request.threadId)
      aiLogInfo('ai_summary_complete', {
        provider: this.id,
        model: this.chatDeployment,
        durationMs: Date.now() - t0,
        threadId: request.threadId,
        correlationId: request.correlationId,
      })
      return summary
    } catch (e) {
      aiLogError('ai_summary_failed', e, { provider: this.id, threadId: request.threadId })
      if (e instanceof AiProviderError || e instanceof AiTimeoutError) throw e
      throw new AiProviderError(e instanceof Error ? e.message : 'Azure OpenAI recap failed')
    }
  }
}
