'use client'

import {
  FLUENT_DEV_TOOLS_API_HEADER,
  FLUENT_DEV_TOOLS_API_HEADER_VALUE,
  isDevToolsEnabledClient,
} from '@/lib/dev-tools'
import { getApiBaseUrl } from './apiConfig'
import { ApiRequestError, correlationIdFromResponse, parseApiErrorBody } from './apiErrors'
import { getApiUserId } from './apiUser'
import type {
  ApiListSavedTrainingItemsResponse,
  ApiLiveSessionEvaluationResponse,
  ApiPersonalizedTrainingLoop,
  ContinueConversationResponse,
  EndConversationResponse,
  EnrichTurnResponse,
  GetConversationResponse,
  PauseResumeConversationResponse,
  SendMessageResponse,
  SpeakLiveStuckHintsResponse,
  SpeakLiveTurnResponse,
  StartConversationResponse,
  TalkSessionHistoryResponse,
  TalkSkillProfileResponse,
  TalkTrainingLoopHistoryItem,
} from './apiTypes'
import type { ConversationMode, FeedbackMode } from '@/features/feature1-chat/types'
import type { ConversationSurface } from '@/lib/conversation/conversationSurface'
import type { UserMessageInputMeta } from '@/lib/conversation/userMessageInputMeta'
import type { LanguageCoachStartBody } from './languageCoachTypes'
import { mapUiFeedbackModeToApi } from './conversationMappers'

export type SpeakLiveTtsWordBoundary = {
  text: string
  textOffset: number
  wordLength: number
  audioOffsetMs: number
  durationMs: number
}

export type SpeakLiveTtsChunkResponse = {
  audioUrl: string
  mimeType: string
  chunkIndex: number
  wordBoundaries?: SpeakLiveTtsWordBoundary[]
}

function buildUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}/api${p}`
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiRequestError(0, 'CONFIG', 'Set NEXT_PUBLIC_API_BASE_URL to use the conversation API.')
  }
  const url = buildUrl(path)
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-user-id': getApiUserId(),
        ...(init?.headers as Record<string, string> | undefined),
      },
    })
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? `Could not reach the API at ${url}. ${error.message}`
        : `Could not reach the API at ${url}.`
    throw new ApiRequestError(0, 'NETWORK', message)
  }
  const rawText = await res.text()
  let json: unknown = null
  try {
    json = rawText ? JSON.parse(rawText) : null
  } catch {
    json = null
  }
  if (!res.ok) {
    throw parseApiErrorBody(res.status, json, rawText, { correlationId: correlationIdFromResponse(res) })
  }
  return json as T
}

export const conversationClient = {
  async health(): Promise<{ status: string; sql?: string; profile?: string }> {
    return requestJson('/health', { method: 'GET' })
  },

  async getContinueConversation(): Promise<ContinueConversationResponse> {
    return requestJson('/talk/continue', { method: 'GET' })
  },

  async getTalkSessionHistory(): Promise<TalkSessionHistoryResponse> {
    return requestJson('/talk/session-history', { method: 'GET' })
  },

  async getTalkSkillProfile(opts?: { forDevToolsSkillDebug?: boolean }): Promise<TalkSkillProfileResponse> {
    const forDev = Boolean(opts?.forDevToolsSkillDebug && isDevToolsEnabledClient())
    return requestJson('/talk/skills-profile', {
      method: 'GET',
      headers: forDev
        ? { [FLUENT_DEV_TOOLS_API_HEADER]: FLUENT_DEV_TOOLS_API_HEADER_VALUE }
        : undefined,
    })
  },

  async startConversation(
    input: {
      scenarioId: string
      /** Required for text threads; omit for Speak Live — server derives pacing. */
      mode?: ConversationMode
      feedbackMode: FeedbackMode
      conversationSurface?: ConversationSurface
      /** Speak Live: CEFR band (e.g. A2) for internal coaching strategy. */
      cefrLevel?: string
      /** Dynamic scenario overrides (e.g. ordering_food venue/focus; supermarket_shop setting/task). */
      scenarioOverrides?: {
        subType?: string
        variation?: string
        destination?: string
        detailFocus?: string
      }
      /** `language_coach` only — goal, feedback cadence, coach/persona tone. */
      languageCoach?: LanguageCoachStartBody
    },
    init?: RequestInit
  ): Promise<StartConversationResponse> {
    return requestJson('/conversations/start', {
      method: 'POST',
      body: JSON.stringify({
        scenarioId: input.scenarioId,
        ...(input.mode != null ? { mode: input.mode } : {}),
        feedbackMode: mapUiFeedbackModeToApi(input.feedbackMode),
        ...(input.conversationSurface ? { conversationSurface: input.conversationSurface } : {}),
        ...(input.cefrLevel?.trim() ? { cefrLevel: input.cefrLevel.trim().toUpperCase() } : {}),
        ...(input.scenarioOverrides ? { scenarioOverrides: input.scenarioOverrides } : {}),
        ...(input.languageCoach && Object.keys(input.languageCoach).length > 0
          ? { languageCoach: input.languageCoach }
          : {}),
      }),
      signal: init?.signal,
    })
  },

  async getConversation(threadId: string, init?: RequestInit): Promise<GetConversationResponse> {
    return requestJson(`/conversations/${encodeURIComponent(threadId)}`, { method: 'GET', signal: init?.signal })
  },

  async sendConversationMessage(
    threadId: string,
    text: string,
    opts?: { inputMeta?: UserMessageInputMeta }
  ): Promise<SendMessageResponse> {
    return requestJson(`/conversations/${encodeURIComponent(threadId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, inputMeta: opts?.inputMeta }),
    })
  },

  async enrichConversationTurn(
    threadId: string,
    body: { userMessageId: string; assistantMessageId: string }
  ): Promise<EnrichTurnResponse> {
    return requestJson(`/conversations/${encodeURIComponent(threadId)}/messages/enrich`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  /**
   * NDJSON stream: `meta` (user row persisted) → `delta` chunks → `done` (assistant persisted).
   * Returns the same shape as {@link sendConversationMessage} for a unified merge path.
   */
  async sendConversationMessageStream(
    threadId: string,
    text: string,
    opts?: {
      inputMeta?: UserMessageInputMeta
      /** Optional learner clip (Speak Live) — same cap as `speak-live/turn`. */
      learnerAudioBase64?: string
      learnerAudioMimeType?: string
    },
    handlers?: {
      onMeta?: (ev: Record<string, unknown>) => void
      onDelta?: (chunk: string) => void
      /** First assistant token from stream (Speak Live NDJSON `delta`). */
      onFirstStreamDelta?: () => void
      onEvent?: (ev: Record<string, unknown>) => void
    }
  ): Promise<SendMessageResponse> {
    const base = getApiBaseUrl()
    if (!base) {
      throw new ApiRequestError(0, 'CONFIG', 'Set NEXT_PUBLIC_API_BASE_URL to use the conversation API.')
    }
    const url = buildUrl(`/conversations/${encodeURIComponent(threadId)}/messages/stream`)
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/x-ndjson',
        'Content-Type': 'application/json',
        'x-user-id': getApiUserId(),
      },
      body: JSON.stringify({
        text,
        inputMeta: opts?.inputMeta,
        ...(opts?.learnerAudioBase64 && opts?.learnerAudioMimeType
          ? { learnerAudioBase64: opts.learnerAudioBase64, learnerAudioMimeType: opts.learnerAudioMimeType }
          : {}),
      }),
    })
    if (!res.ok) {
      const rawText = await res.text()
      let json: unknown = null
      try {
        json = rawText ? JSON.parse(rawText) : null
      } catch {
        json = null
      }
      throw parseApiErrorBody(res.status, json, rawText, { correlationId: correlationIdFromResponse(res) })
    }
    const reader = res.body?.getReader()
    if (!reader) {
      throw new ApiRequestError(0, 'STREAM', 'Streaming response had no body')
    }
    const decoder = new TextDecoder()
    let buffer = ''
    let donePayload: Record<string, unknown> | null = null
    let firstStreamDeltaSent = false
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const t = line.trim()
        if (!t) continue
        let ev: Record<string, unknown>
        try {
          ev = JSON.parse(t) as Record<string, unknown>
        } catch {
          continue
        }
        handlers?.onEvent?.(ev)
        if (ev.type === 'error') {
          const httpStatus = typeof ev.httpStatus === 'number' ? ev.httpStatus : 502
          const err = ev.error as { message?: string } | undefined
          throw new ApiRequestError(httpStatus, 'STREAM', err?.message ?? 'Stream failed')
        }
        if (ev.type === 'meta') {
          handlers?.onMeta?.(ev)
        }
        if (ev.type === 'delta' && typeof ev.text === 'string') {
          if (!firstStreamDeltaSent && ev.text.length > 0) {
            firstStreamDeltaSent = true
            handlers?.onFirstStreamDelta?.()
          }
          handlers?.onDelta?.(ev.text)
        }
        if (ev.type === 'done') {
          donePayload = ev
        }
      }
    }
    if (!donePayload) {
      throw new ApiRequestError(502, 'STREAM', 'Stream ended without done event')
    }
    const userMessage = donePayload.userMessage as SendMessageResponse['userMessage']
    const assistantMessage = donePayload.assistantMessage as SendMessageResponse['assistantMessage']
    const thread = donePayload.thread as SendMessageResponse['thread']
    const perf = (donePayload.perf as Record<string, number> | undefined) ?? {}
    const speakLiveStreamMeta = donePayload.speakLiveStreamMeta as SendMessageResponse['speakLiveStreamMeta'] | undefined
    const liveTurnDiagnostics = donePayload.liveTurnDiagnostics as SendMessageResponse['liveTurnDiagnostics'] | undefined
    const liveCoachTurnFeedback = donePayload.liveCoachTurnFeedback as
      | SendMessageResponse['liveCoachTurnFeedback']
      | undefined
    const liveTurnLatencyTrace = donePayload.liveTurnLatencyTrace as
      | SendMessageResponse['liveTurnLatencyTrace']
      | undefined
    const meta = assistantMessage.metadata as Record<string, unknown> | undefined
    const rawSp = meta?.scenarioProgress
    const scenarioProgress =
      rawSp && typeof rawSp === 'object' && rawSp !== null && typeof (rawSp as { stage?: unknown }).stage === 'string'
        ? (rawSp as SendMessageResponse['scenarioProgress'])
        : null
    const sce = meta?.shouldConversationEnd
    const shouldConversationEnd = typeof sce === 'boolean' ? sce : false
    return {
      userMessage,
      assistantMessage,
      feedback: null,
      saveWordCandidates: [],
      scenarioProgress,
      shouldConversationEnd,
      updatedSummary: thread.summaryText ?? '',
      thread,
      enrichmentPending: Boolean(donePayload.enrichmentPending ?? true),
      perf,
      ...(speakLiveStreamMeta ? { speakLiveStreamMeta } : {}),
      ...(liveTurnDiagnostics ? { liveTurnDiagnostics } : {}),
      ...(liveCoachTurnFeedback ? { liveCoachTurnFeedback } : {}),
      ...(liveTurnLatencyTrace ? { liveTurnLatencyTrace } : {}),
    }
  },

  /** Short-lived token for browser Azure Speech (STT). */
  async fetchSpeakLiveAzureSpeechToken(): Promise<{ token: string; region: string; expiresInSeconds: number }> {
    return requestJson('/speak-live/azure-speech-token', { method: 'GET' })
  },

  /**
   * Speak Live: STT → persisted LLM turn → TTS (one round trip).
   * Pass either `transcript` (browser Azure STT) or `audioBase64` + `mimeType` (server STT).
   */
  async speakLiveTurn(input: {
    threadId: string
    transcript?: string
    audioBase64?: string
    mimeType?: string
    scenarioId?: string
    level?: 'A1' | 'A2' | 'B1'
    language?: string
  }): Promise<SpeakLiveTurnResponse> {
    const body: Record<string, unknown> = { threadId: input.threadId }
    const tx = input.transcript?.trim()
    if (tx) body.transcript = tx
    if (input.audioBase64 && input.mimeType) {
      body.audioBase64 = input.audioBase64
      body.mimeType = input.mimeType
    }
    if (input.scenarioId) body.scenarioId = input.scenarioId
    if (input.level) body.level = input.level
    if (input.language) body.language = input.language
    return requestJson('/speak-live/turn', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  /**
   * TTS for a single clause (chunked TTS for low-latency playback).
   */
  async speakLiveTtsChunk(input: {
    text: string
    threadId?: string
    chunkIndex: number
    language?: string
  }): Promise<SpeakLiveTtsChunkResponse> {
    return requestJson('/speak-live/tts-chunk', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  /** English gloss for a Dutch token in optional sentence context (Speak Live report). */
  async speakLiveWordGloss(input: {
    word: string
    phraseContext?: string
  }): Promise<{ gloss: string; glossEn?: string; glossNl?: string }> {
    return requestJson('/speak-live/word-gloss', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  /** Speak Live: LLM phrase ideas when the learner is stuck (read-only; does not post a turn). */
  async speakLiveStuckHints(input: {
    threadId: string
    level?: 'A1' | 'A2' | 'B1'
  }): Promise<SpeakLiveStuckHintsResponse> {
    return requestJson('/speak-live/stuck-hints', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  /**
   * Fast turn NDJSON stream — uses compact state instead of full DB lookups.
   * Returns streamed deltas and a final done event with updated compact state.
   */
  async sendFastTurn(
    input: {
      threadId: string
      transcript: string
      compactState: Record<string, unknown>
    },
    handlers?: {
      onMeta?: (ev: Record<string, unknown>) => void
      onDelta?: (chunk: string) => void
      onFirstStreamDelta?: () => void
      onDone?: (ev: Record<string, unknown>) => void
    }
  ): Promise<{
    assistantText: string
    compactState: Record<string, unknown>
    perf: Record<string, number>
  }> {
    const base = getApiBaseUrl()
    if (!base) {
      throw new ApiRequestError(0, 'CONFIG', 'Set NEXT_PUBLIC_API_BASE_URL to use the conversation API.')
    }
    const url = buildUrl('/speak-live/fast-turn')
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/x-ndjson',
        'Content-Type': 'application/json',
        'x-user-id': getApiUserId(),
      },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const rawText = await res.text()
      let json: unknown = null
      try {
        json = rawText ? JSON.parse(rawText) : null
      } catch {
        json = null
      }
      throw parseApiErrorBody(res.status, json, rawText, { correlationId: correlationIdFromResponse(res) })
    }
    const reader = res.body?.getReader()
    if (!reader) {
      throw new ApiRequestError(0, 'STREAM', 'Streaming response had no body')
    }
    const decoder = new TextDecoder()
    let buffer = ''
    let donePayload: Record<string, unknown> | null = null
    let firstDeltaSent = false
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const t = line.trim()
        if (!t) continue
        let ev: Record<string, unknown>
        try {
          ev = JSON.parse(t) as Record<string, unknown>
        } catch {
          continue
        }
        if (ev.type === 'error') {
          const httpStatus = typeof ev.httpStatus === 'number' ? ev.httpStatus : 502
          throw new ApiRequestError(httpStatus, 'STREAM', (ev.message as string) ?? 'Fast turn stream failed')
        }
        if (ev.type === 'meta') {
          handlers?.onMeta?.(ev)
        }
        if (ev.type === 'delta' && typeof ev.text === 'string') {
          if (!firstDeltaSent && ev.text.length > 0) {
            firstDeltaSent = true
            handlers?.onFirstStreamDelta?.()
          }
          handlers?.onDelta?.(ev.text)
        }
        if (ev.type === 'done') {
          donePayload = ev
          handlers?.onDone?.(ev)
        }
      }
    }
    if (!donePayload) {
      throw new ApiRequestError(502, 'STREAM', 'Fast turn stream ended without done event')
    }
    return {
      assistantText: (donePayload.assistantText as string) ?? '',
      compactState: (donePayload.compactState as Record<string, unknown>) ?? {},
      perf: (donePayload.perf as Record<string, number>) ?? {},
    }
  },

  async getLiveSessionEvaluation(threadId: string): Promise<ApiLiveSessionEvaluationResponse> {
    const forDev = isDevToolsEnabledClient()
    return requestJson(`/speak-live/session/${encodeURIComponent(threadId)}/evaluation`, {
      method: 'GET',
      headers: forDev ? { [FLUENT_DEV_TOOLS_API_HEADER]: FLUENT_DEV_TOOLS_API_HEADER_VALUE } : undefined,
    })
  },

  async getTrainingLoop(loopId: string): Promise<{ loop: ApiPersonalizedTrainingLoop }> {
    return requestJson(`/speak-live/training-loops/${encodeURIComponent(loopId)}`, { method: 'GET' })
  },

  async patchTrainingLoopStatus(
    loopId: string,
    body: { status: 'in_progress' | 'completed' | 'dismissed' },
  ): Promise<{ ok: boolean; loop: ApiPersonalizedTrainingLoop | null }> {
    return requestJson(`/speak-live/training-loops/${encodeURIComponent(loopId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  async getTrainingLoopHistory(opts?: { limit?: number }): Promise<{ loops: TalkTrainingLoopHistoryItem[] }> {
    const lim = opts?.limit != null ? Math.min(40, Math.max(1, opts.limit)) : 12
    return requestJson(`/speak-live/training-loops/history?limit=${lim}`, { method: 'GET' })
  },

  async runLiveSessionEvaluation(threadId: string, opts?: { forceRestart?: boolean }): Promise<ApiLiveSessionEvaluationResponse> {
    return requestJson(`/speak-live/session/${encodeURIComponent(threadId)}/evaluation/run`, {
      method: 'POST',
      body: JSON.stringify(opts?.forceRestart ? { forceRestart: true } : {}),
    })
  },

  async saveTrainingItem(input: {
    sourceSessionId: string
    sourceTurnId?: string | null
    type:
      | 'word'
      | 'phrase'
      | 'library_word'
      | 'library_phrase'
      | 'save_phrase'
      | 'save_improved_version'
      | 'save_pronunciation_word'
      | 'save_rhythm_drill'
      | 'save_natural_phrasing'
      | 'scenario_follow_up'
      | 'pronunciation_drill'
      | 'rhythm_drill'
      | 'phrasing_drill'
      | 'natural_phrasing_drill'
      | 'scenario_followup'
      | 'repeat_scenario'
      | 'sentence_drill'
      | 'speaking_drill'
      | 'coach_followup'
      | 'coach_follow_up'
      | 'review_queue'
    title: string
    content: string
    audioReferenceUrl?: string | null
    learnerAudioUrl?: string | null
    sourceScenarioId?: string | null
    learnerOriginalSentence?: string | null
    improvedSentence?: string | null
    tagCategory?: string | null
    suggestedTrainingMode?: string | null
    metadata?: Record<string, unknown>
  }): Promise<{ item: Record<string, unknown> }> {
    return requestJson('/training-items/saved', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async listSavedTrainingItems(params?: {
    tagCategory?: string | null
    itemType?: string | null
    limit?: number
  }): Promise<ApiListSavedTrainingItemsResponse> {
    const q = new URLSearchParams()
    if (params?.tagCategory) q.set('tagCategory', params.tagCategory)
    if (params?.itemType) q.set('itemType', params.itemType)
    if (params?.limit != null) q.set('limit', String(params.limit))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return requestJson(`/training-items/saved${suffix}`, { method: 'GET' })
  },

  async endConversation(threadId: string): Promise<EndConversationResponse> {
    return requestJson(`/conversations/${encodeURIComponent(threadId)}/end`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  },

  async pauseConversation(threadId: string): Promise<PauseResumeConversationResponse> {
    return requestJson(`/conversations/${encodeURIComponent(threadId)}/pause`, { method: 'POST', body: '{}' })
  },

  async resumeConversation(threadId: string): Promise<PauseResumeConversationResponse> {
    return requestJson(`/conversations/${encodeURIComponent(threadId)}/resume`, { method: 'POST', body: '{}' })
  },
}
