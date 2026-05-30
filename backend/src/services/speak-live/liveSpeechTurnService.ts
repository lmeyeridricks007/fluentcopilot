/**
 * Fast live speech turn path — transcript shaping, context caps, and turn-record metadata.
 * Does not call the LLM, moderation, or post-session evaluation (see `conversationAppService` + orchestrator).
 */
import type { ConversationMessage } from '../../models/contracts'

/** Subset of client `inputMeta` the live speech path merges into persisted metadata. */
export type LiveSpeechClientInputMeta = {
  inputMode?: 'text' | 'speech'
  originalTranscript?: string | null
  transcriptRaw?: string | null
  audioReference?: string | null
  /** Optional CEFR from client (Speak Live); overrides thread summary when valid. */
  learnerLevelCefr?: string | null
}

/** Max recent messages passed to Stage A for Speak Live (latency). Env: `LIVE_SPEECH_RECENT_MESSAGES_MAX` (2–8, default 4). */
export function liveSpeechRecentMessagesMax(): number {
  const n = Number.parseInt(process.env.LIVE_SPEECH_RECENT_MESSAGES_MAX ?? '', 10)
  if (Number.isFinite(n) && n >= 2 && n <= 8) return Math.floor(n)
  return 4
}

export function sliceRecentForLiveSpeechTurn(recent: ConversationMessage[]): ConversationMessage[] {
  const cap = liveSpeechRecentMessagesMax()
  if (recent.length <= cap) return recent
  return recent.slice(-cap)
}

/** Outer trim only — preserves inner spacing the learner produced (STT verbatim intent). */
export function transcriptRawFromFinalUtterance(raw: string): string {
  return raw.replace(/^\uFEFF/, '').trim()
}

/**
 * Safe leading disfluency trim (Dutch/English fillers). Does not alter lexical content beyond the first token.
 */
function stripLeadingSafeFillers(s: string): string {
  return s.replace(/^(?:eh|ehm|uh|um|hmm)\s*[,.]?\s+/i, '')
}

/** Unify Unicode spaces, collapse runs, light punctuation spacing, optional one leading filler. */
export function normalizeTranscriptForLiveConversation(raw: string): string {
  let s = transcriptRawFromFinalUtterance(raw)
  s = stripLeadingSafeFillers(s)
  s = s
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*([,.!?;:])\s*/g, '$1 ')
    .trim()
  return s
}

export type LiveSpeechTranscriptPair = {
  transcriptRaw: string
  transcriptNormalized: string
}

export function preprocessLiveSpeechTranscript(sttFinal: string): LiveSpeechTranscriptPair {
  const transcriptRaw = transcriptRawFromFinalUtterance(sttFinal)
  const transcriptNormalized = normalizeTranscriptForLiveConversation(sttFinal)
  return { transcriptRaw, transcriptNormalized }
}

/** Parse CEFR from thread summary stamp (`… · Speak Live · … · A2`). */
export function parseLearnerCefrFromSpeakLiveSummary(summaryText: string | null | undefined): string | null {
  const s = summaryText?.trim() ?? ''
  if (!s.includes('Speak Live')) return null
  const parts = s.split(' · ').map((p) => p.trim())
  const last = parts[parts.length - 1]?.toUpperCase() ?? ''
  if (/^(A1|A2|B1|B2|C1|C2)$/.test(last)) return last
  return null
}

function normalizeCefrHint(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const u = raw.trim().toUpperCase().slice(0, 3)
  if (u === 'A1' || u === 'A2' || u === 'B1' || u === 'B2') return u
  return null
}

export function resolveLearnerCefrForLiveTurn(params: {
  threadSummaryText: string | null | undefined
  requestHint?: string | null | undefined
}): string | null {
  return normalizeCefrHint(params.requestHint) ?? parseLearnerCefrFromSpeakLiveSummary(params.threadSummaryText)
}

/**
 * Metadata persisted on the learner user message (IDs filled by caller after insert where needed).
 */
export function buildLiveSpeechLearnerTurnMetadata(params: {
  sessionId: string
  transcriptRaw: string
  transcriptNormalized: string
  inputMeta?: LiveSpeechClientInputMeta | null
}): Record<string, unknown> {
  const fromInput = params.inputMeta ?? {}
  return {
    liveSpeechTurn: true,
    sessionId: params.sessionId,
    speaker: 'learner',
    transcriptRaw: params.transcriptRaw,
    transcriptNormalized: params.transcriptNormalized,
    /** Back-compat for readers expecting `normalizedTranscript`. */
    normalizedTranscript: params.transcriptNormalized,
    ...(fromInput.inputMode ? { inputMode: fromInput.inputMode } : {}),
    ...(fromInput.originalTranscript != null ? { originalTranscript: fromInput.originalTranscript } : {}),
    ...(fromInput.audioReference != null ? { audioReference: fromInput.audioReference } : {}),
    ...(fromInput.learnerLevelCefr != null ? { learnerLevelCefr: fromInput.learnerLevelCefr } : {}),
  }
}

export function buildLiveSpeechAssistantTurnMetadata(params: {
  sessionId: string
  learnerTurnId: string
  assistantText: string
}): Record<string, unknown> {
  return {
    liveSpeechTurn: true,
    sessionId: params.sessionId,
    turnId: params.learnerTurnId,
    speaker: 'assistant',
    assistantText: params.assistantText,
  }
}

/**
 * When `true` (default), `POST /speak-live/turn` returns as soon as assistant text is persisted — **without**
 * awaiting server TTS (`audioUrl` empty, {@link SpeakLiveTurnResult.signals.ttsDeferred} true). Client should call
 * `/audio/tts` (or existing `requestGenerateSpeech`) asynchronously.
 *
 * Set `SPEAK_LIVE_SERVER_TTS_SYNC=1` to restore legacy behaviour (await TTS before HTTP response).
 * `SPEAK_LIVE_SERVER_TTS_ASYNC=0` is treated as an alias for sync (backward compatible).
 */
export function liveSpeechServerTtsAsync(): boolean {
  const sync = (process.env.SPEAK_LIVE_SERVER_TTS_SYNC ?? '').trim().toLowerCase()
  if (sync === '1' || sync === 'true' || sync === 'on' || sync === 'yes') return false
  const legacyAsyncOff = (process.env.SPEAK_LIVE_SERVER_TTS_ASYNC ?? '').trim().toLowerCase()
  if (legacyAsyncOff === '0' || legacyAsyncOff === 'false' || legacyAsyncOff === 'off' || legacyAsyncOff === 'no') {
    return false
  }
  return true
}

/**
 * Facade for the fast live speech turn path (normalization, caps, metadata builders).
 * Orchestration (SQL, LLM, moderation) stays in `conversationAppService` / `speakLiveTurnService`.
 */
export const LiveSpeechTurnService = {
  preprocessLiveSpeechTranscript,
  transcriptRawFromFinalUtterance,
  normalizeTranscriptForLiveConversation,
  sliceRecentForLiveSpeechTurn,
  liveSpeechRecentMessagesMax,
  resolveLearnerCefrForLiveTurn,
  parseLearnerCefrFromSpeakLiveSummary,
  buildLiveSpeechLearnerTurnMetadata,
  buildLiveSpeechAssistantTurnMetadata,
  liveSpeechServerTtsAsync,
} as const
