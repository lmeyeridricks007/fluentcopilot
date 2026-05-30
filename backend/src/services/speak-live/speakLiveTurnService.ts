/**
 * HTTP live-turn entry: STT → `sendConversationMessage` → TTS.
 * Must not import post-session evaluation / pronunciation scoring (see `liveEvaluationImportBoundary.ts`).
 */
import type { ConversationThread } from '../../models/contracts'
import { ApiError } from '../../shared/errors'
import * as conversation from '../conversation/conversationAppService'
import { parseSpeakLiveState } from '../../domain/speakLive/speakLiveFsm'
import { speakLiveGroundingDebugEnabled } from '../../domain/speakLive/speakLiveGroundingDebug'
import { transcribeForLiveConversation } from './speechRecognitionService'
import { generateSpeakLiveAssistantSpeech } from './speakLiveTtsGateway'
import { liveSpeechServerTtsAsync, preprocessLiveSpeechTranscript } from './liveSpeechTurnService'
import type { LiveTurnLatencyTraceServer } from './liveTurnServerLatencyTrace'
import {
  buildLiveCoachTurnFeedback,
  type LiveCoachTurnFeedback,
} from '../language-coach/languageCoachLiveTurnFeedback'

/** Shared cap for learner clips attached to a turn (speak-live/turn and messages/stream). */
export function maxSpeakLiveLearnerAudioBytes(): number {
  const mbRaw = process.env.AUDIO_UPLOAD_MAX_MB?.trim()
  const mb = mbRaw ? Number(mbRaw) : 12
  const safe = Number.isFinite(mb) && mb > 0 ? Math.min(mb, 25) : 12
  return Math.floor(safe * 1024 * 1024)
}

/** Cap assistant text for TTS — keep live replies short for latency. */
const SPEAK_LIVE_TTS_MAX_CHARS = 1200

export type SpeakLiveTurnResult = {
  transcript: string
  assistantReply: string
  audioUrl: string
  mimeType: string
  userMessageId: string
  assistantMessageId: string
  thread: ConversationThread
  enrichmentPending: boolean
  scenarioProgress: { stage: string; notes?: string } | null
  signals: {
    ttsCached: boolean
    /** True when HTTP response did not wait for server TTS — client should fetch audio async. */
    ttsDeferred: boolean
    sttProvider: string
    detectedLanguage?: string
    sttDurationSeconds?: number
    ttsProvider?: string
  }
  perf: {
    sttMs: number
    llmMs: number
    ttsMs: number
    totalMs: number
  }
  /** Present when `SPEAK_LIVE_DEBUG_TURNS=1` — dev-only turn diagnostics. */
  speakLiveDebug?: Record<string, unknown>
  /** Fast-path pipeline confirmation (Speak Live). */
  liveTurnDiagnostics?: Record<string, unknown>
  /** Language Coach: per-turn correctness signal for the live UI. */
  liveCoachTurnFeedback?: LiveCoachTurnFeedback
  /** Structured server timings (Speak Live bundled turn). */
  liveTurnLatencyTrace?: LiveTurnLatencyTraceServer
}

/**
 * V1 Speak Live voice loop: STT → persisted conversation turn (LLM reply) → TTS.
 * Context (summary + recent turns) is handled inside `sendConversationMessage`.
 */
export async function speakLiveTurn(params: {
  externalUserId: string
  threadId: string
  /** When set (e.g. browser Azure STT), server skips STT on `audio`. */
  transcript?: string
  audio: Buffer
  mimeType: string
  /** Whisper / STT hint, e.g. `nl` */
  language?: string
  /** Client scenario slug for STT telemetry only */
  scenarioId?: string
  /** CEFR label for future prompt tuning; currently unused in V1 */
  level?: string
}): Promise<SpeakLiveTurnResult> {
  const cap = maxSpeakLiveLearnerAudioBytes()
  const preTranscript = params.transcript?.trim()
  let transcript = ''
  let sttMs = 0
  let sttProvider = 'client'
  let detectedLanguage: string | undefined
  let sttDurationSeconds: number | undefined

  const t0 = Date.now()
  if (preTranscript) {
    transcript = preTranscript
    sttMs = 0
    sttProvider = 'client_azure_or_text'
  } else {
    /** Below ~300B, browser WebM clips are often headers-only / incomplete and Azure STT can fail internally. */
    const minAudioBytes = 320
    if (params.audio.length < minAudioBytes) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Audio clip too short or empty')
    }
    if (params.audio.length > cap) {
      throw new ApiError(400, 'VALIDATION_ERROR', `Audio exceeds maximum size (${Math.round(cap / (1024 * 1024))} MB)`)
    }
    const tr = await transcribeForLiveConversation({
      audio: params.audio,
      mimeType: params.mimeType,
      language: (params.language ?? 'nl').trim().slice(0, 8) || 'nl',
      threadId: params.threadId,
      scenarioId: params.scenarioId,
    })
    sttMs = Date.now() - t0
    sttProvider = tr.provider
    detectedLanguage = tr.detectedLanguage
    sttDurationSeconds = tr.durationSeconds
    transcript = tr.text.trim()
  }

  if (!transcript) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'No speech detected', { transcript: 'empty' })
  }

  const pair = preprocessLiveSpeechTranscript(transcript)
  const levelHint =
    params.level === 'A1' || params.level === 'A2' || params.level === 'B1' ? params.level : undefined

  const t1 = Date.now()
  const learnerAudio =
    params.audio.length >= 32 ? { buffer: params.audio, mimeType: params.mimeType } : null
  const turn = await conversation.sendConversationMessage({
    externalUserId: params.externalUserId,
    threadId: params.threadId,
    text: pair.transcriptNormalized,
    inputMeta: {
      inputMode: 'speech',
      originalTranscript: pair.transcriptRaw,
      transcriptRaw: pair.transcriptRaw,
      learnerLevelCefr: levelHint,
    },
    learnerAudio,
  })
  const llmMs = Date.now() - t1

  const assistantReply = turn.assistantMessage.content.trim()
  const ttsInput = assistantReply.slice(0, SPEAK_LIVE_TTS_MAX_CHARS)

  const t2 = Date.now()
  let ttsMs = 0
  const ttsDeferred = liveSpeechServerTtsAsync()
  let tts: Awaited<ReturnType<typeof generateSpeakLiveAssistantSpeech>>
  if (ttsDeferred) {
    tts = { audioUrl: '', mimeType: 'audio/mpeg', cached: false, provider: 'openai', audioBase64: '' }
    void generateSpeakLiveAssistantSpeech({
      text: ttsInput,
      threadId: params.threadId,
      messageId: turn.assistantMessage.id,
      language: 'nl',
    }).catch(() => undefined)
  } else {
    tts = await generateSpeakLiveAssistantSpeech({
      text: ttsInput,
      threadId: params.threadId,
      messageId: turn.assistantMessage.id,
      language: 'nl',
    })
    ttsMs = Date.now() - t2
  }

  const debugEnabled = speakLiveGroundingDebugEnabled()
  const meta = turn.assistantMessage.metadata
  const slParsed = parseSpeakLiveState(turn.thread.speakLiveStateJson)
  const speakLiveDebug =
    debugEnabled && meta && typeof meta === 'object'
      ? {
          lastGroundingDebug: slParsed?.lastGroundingDebug ?? null,
          speakLiveSignalsMerged: (meta as Record<string, unknown>).speakLiveSignals,
          speakLivePhase: (meta as Record<string, unknown>).speakLivePhase,
          trainTurnResponse: (meta as Record<string, unknown>).trainTurnResponse ?? null,
          threadSpeakLiveStateJsonPreview: (turn.thread.speakLiveStateJson ?? '').slice(0, 4000),
          recapInputFactsPreview: {
            summaryTextHead: (turn.thread.summaryText ?? '').slice(0, 500),
            currentStage: turn.thread.currentStage,
          },
        }
      : undefined
  const liveCoachTurnFeedback = buildLiveCoachTurnFeedback({
    thread: turn.thread,
    userText: pair.transcriptNormalized,
    assistantReply: assistantReply,
  })

  return {
    transcript: pair.transcriptNormalized,
    assistantReply,
    audioUrl: tts.audioUrl,
    mimeType: tts.mimeType,
    userMessageId: turn.userMessage.id,
    assistantMessageId: turn.assistantMessage.id,
    thread: turn.thread,
    enrichmentPending: turn.enrichmentPending,
    scenarioProgress: turn.envelope.scenarioProgress,
    signals: {
      ttsCached: tts.cached,
      ttsDeferred,
      sttProvider,
      detectedLanguage,
      sttDurationSeconds,
      ttsProvider: tts.provider,
    },
    perf: {
      sttMs,
      llmMs,
      ttsMs,
      totalMs: Date.now() - t0,
    },
    ...(speakLiveDebug ? { speakLiveDebug } : {}),
    ...(turn.liveTurnDiagnostics ? { liveTurnDiagnostics: turn.liveTurnDiagnostics } : {}),
    ...(liveCoachTurnFeedback ? { liveCoachTurnFeedback } : {}),
    ...(turn.liveTurnLatencyTrace ? { liveTurnLatencyTrace: turn.liveTurnLatencyTrace } : {}),
  }
}
