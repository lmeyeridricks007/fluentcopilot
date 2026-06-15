/**
 * Central API / Feature 1 chat source configuration.
 * Use env-driven base URL — do not scatter localhost strings in components.
 */

const trim = (v: string | undefined) => v?.trim() ?? ''

/**
 * Azure Functions host origin, without trailing slash.
 * Example: https://func-language-tutor-dev-cqd6fkgdb2hmcnah.westeurope-01.azurewebsites.net
 *
 * HTTP clients append `/api/...` themselves. If the env value mistakenly includes `/api`
 * (e.g. `https://func-language-tutor-dev-cqd6fkgdb2hmcnah.westeurope-01.azurewebsites.net/api`),
 * strip it so requests do not become `/api/api/...` (404).
 */
export function getApiBaseUrl(): string {
  const raw = trim(process.env.NEXT_PUBLIC_API_BASE_URL)
  if (!raw) return ''
  return raw.replace(/\/+$/, '').replace(/\/api$/i, '')
}

export type Feature1ChatSource = 'backend' | 'mock'

/**
 * When `NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=mock`, always use the local mock store.
 * When `backend`, use HTTP client (requires base URL).
 * Default: backend if `NEXT_PUBLIC_API_BASE_URL` is set, otherwise mock (pleasant local FE-only dev).
 */
export function getFeature1ChatSource(): Feature1ChatSource {
  const explicit = trim(process.env.NEXT_PUBLIC_FEATURE1_CHAT_SOURCE).toLowerCase()
  if (explicit === 'mock') return 'mock'
  if (explicit === 'backend') return 'backend'
  return getApiBaseUrl() ? 'backend' : 'mock'
}

export function isFeature1ChatBackendEnabled(): boolean {
  return getFeature1ChatSource() === 'backend'
}

/**
 * When true (opt-in), Speak Live uses browser Azure Speech SDK for partial + final STT while holding the mic
 * (requires `GET /speak-live/azure-speech-token` + Azure resource). Uses a different capture path than Talk dictation.
 *
 * Default is **false** so Speak Live matches Talk: `MediaRecorder` via `startMediaRecordingSession` + `POST /speech/transcribe`.
 * Set `NEXT_PUBLIC_SPEAK_LIVE_BROWSER_AZURE_STT=1` to enable browser Azure partials.
 */
export function isSpeakLiveBrowserAzureSttEnabled(): boolean {
  if (!isFeature1ChatBackendEnabled()) return false
  const v = trim(process.env.NEXT_PUBLIC_SPEAK_LIVE_BROWSER_AZURE_STT).toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * Silence (ms) after the last recognized word before the service finalizes a phrase in **continuous** recognition.
 * Lower values commit the final transcript sooner after the learner stops; too low increases word-boundary / breath cutoffs.
 *
 * Env: `NEXT_PUBLIC_SPEAK_LIVE_SEGMENTATION_SILENCE_MS` in **260–900** (default **320** — faster phrase end for short Dutch lines).
 */
export function getSpeakLiveAzureSegmentationSilenceMs(): number {
  const n = Number.parseInt(trim(process.env.NEXT_PUBLIC_SPEAK_LIVE_SEGMENTATION_SILENCE_MS), 10)
  if (Number.isFinite(n) && n >= 260 && n <= 900) return n
  return 320
}

/**
 * Service end-silence timeout (ms). When unset, derived from segmentation silence (tighter than legacy `seg+200` cap 1200).
 * Env: `NEXT_PUBLIC_SPEAK_LIVE_END_SILENCE_TIMEOUT_MS` in **300–1200**.
 */
export function getSpeakLiveAzureEndSilenceTimeoutMs(segmentationMs: number): number {
  const n = Number.parseInt(trim(process.env.NEXT_PUBLIC_SPEAK_LIVE_END_SILENCE_TIMEOUT_MS), 10)
  if (Number.isFinite(n) && n >= 300 && n <= 1200) return n
  const derived = segmentationMs + Math.max(80, Math.round(segmentationMs * 0.22))
  return Math.min(720, Math.max(340, derived))
}

/**
 * Max silence (ms) before “no speech” if the learner has not started (mic open, first word).
 * Keep generous for short thinking pauses. Env: `NEXT_PUBLIC_SPEAK_LIVE_INITIAL_SILENCE_MS` in **5000–30000** (default **12000**).
 */
export function getSpeakLiveAzureInitialSilenceTimeoutMs(): number {
  const n = Number.parseInt(trim(process.env.NEXT_PUBLIC_SPEAK_LIVE_INITIAL_SILENCE_MS), 10)
  if (Number.isFinite(n) && n >= 5000 && n <= 30000) return n
  return 12000
}

/**
 * With {@link getSpeakLiveAzureSegmentationStrategy} `Time`, phrases approaching this length get shorter required silence (service behavior).
 * Env: `NEXT_PUBLIC_SPEAK_LIVE_SEGMENTATION_MAX_PHRASE_MS` in **8000–120000** (default **60000**).
 */
export function getSpeakLiveAzureSegmentationMaxPhraseMs(): number {
  const n = Number.parseInt(trim(process.env.NEXT_PUBLIC_SPEAK_LIVE_SEGMENTATION_MAX_PHRASE_MS), 10)
  if (Number.isFinite(n) && n >= 8000 && n <= 120000) return n
  return 60_000
}

/** Azure phrase-end strategy for browser STT. Env: `NEXT_PUBLIC_SPEAK_LIVE_SEGMENTATION_STRATEGY` = Default | Time | Semantic (default **Time**). */
export function getSpeakLiveAzureSegmentationStrategy(): 'Default' | 'Time' | 'Semantic' {
  const v = trim(process.env.NEXT_PUBLIC_SPEAK_LIVE_SEGMENTATION_STRATEGY)
  if (v === 'Default' || v === 'Time' || v === 'Semantic') return v
  return 'Time'
}

/** When true, `[SpeakLiveAzureStt]` console logs (timings + timeouts) in production builds too. */
export function isSpeakLiveAzureSttVerboseLogsEnabled(): boolean {
  const v = trim(process.env.NEXT_PUBLIC_SPEAK_LIVE_STT_DEV_LOG).toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/** Legacy canned Speak Live call UI (browser TTS + fake lines). Dev-only. */
export function isSpeakLiveDevUiMockEnabled(): boolean {
  const v = trim(process.env.NEXT_PUBLIC_SPEAK_LIVE_DEV_UI_MOCK).toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/** NDJSON streaming send (`/messages/stream`) — progressive assistant text. */
export function isConversationStreamEnabled(): boolean {
  const v = trim(process.env.NEXT_PUBLIC_CONVERSATION_STREAM).toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/** Extra `[fc-conv]` console timing logs for send / enrich / stream. */
export function isConversationPerfLogsEnabled(): boolean {
  const v = trim(process.env.NEXT_PUBLIC_CONVERSATION_PERF).toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * Assistant message playback source.
 * - `openai` — server OpenAI TTS only (no browser fallback for playback).
 * - `browser` — Web Speech only (local / resilience testing).
 * - `auto` — try OpenAI TTS first when API base is configured, then browser.
 */
export type AudioPlaybackMode = 'openai' | 'browser' | 'auto'

/** @deprecated Use `getAudioPlaybackMode` — values map: server → openai. */
export type AudioTtsMode = 'browser' | 'server' | 'auto'

export function getAudioPlaybackMode(): AudioPlaybackMode {
  const v = trim(process.env.NEXT_PUBLIC_AUDIO_PLAYBACK_MODE).toLowerCase()
  if (v === 'openai' || v === 'browser' || v === 'auto') return v
  const legacy = trim(process.env.NEXT_PUBLIC_AUDIO_TTS_MODE).toLowerCase()
  if (legacy === 'server') return 'openai'
  if (legacy === 'auto') return 'auto'
  if (legacy === 'browser') return 'browser'
  return getApiBaseUrl() ? 'auto' : 'browser'
}

/** @deprecated Prefer `getAudioPlaybackMode`. */
export function getAudioTtsMode(): AudioTtsMode {
  const m = getAudioPlaybackMode()
  if (m === 'openai') return 'server'
  return m
}

/** True when client should call server TTS (OpenAI path). */
export function shouldAttemptOpenAiTts(): boolean {
  if (!isFeature1ChatBackendEnabled()) return false
  const mode = getAudioPlaybackMode()
  return mode === 'openai' || mode === 'auto'
}

/** Chat composer dictation: `browser` = Web Speech; `server` = MediaRecorder + Whisper via API; `auto` = same as server, but mic denied / transcribe failure can fall back to Web Speech. */
export type SpeechInputMode = 'browser' | 'server' | 'auto'

export function getSpeechInputMode(): SpeechInputMode {
  const v = trim(process.env.NEXT_PUBLIC_SPEECH_INPUT_MODE).toLowerCase()
  if (v === 'server' || v === 'browser' || v === 'auto') return v
  /** When the API base URL is set, default to server STT so Talk matches backend pronunciation + transcripts. */
  return isFeature1ChatBackendEnabled() ? 'server' : 'browser'
}

/**
 * When true (default), after a server Whisper capture the client calls
 * `POST /api/speech/pronunciation-assessment` with raw audio (Azure per server `PRONUNCIATION_MODE`, or off).
 * Set `NEXT_PUBLIC_SPEECH_AUDIO_ASSESSMENT=0` to skip this path entirely.
 */
export function isSpeechAudioAssessmentEnabled(): boolean {
  const v = trim(process.env.NEXT_PUBLIC_SPEECH_AUDIO_ASSESSMENT).toLowerCase()
  if (v === '0' || v === 'false' || v === 'no') return false
  return true
}

/** When false, skip LLM transcript-only pronunciation hints after dictation (browser path / legacy). Default: enabled. */
export function isSpeechPronunciationEvalEnabled(): boolean {
  const v = trim(process.env.NEXT_PUBLIC_SPEECH_PRONUNCIATION_EVAL).toLowerCase()
  if (v === '0' || v === 'false' || v === 'no') return false
  return true
}

/** Max MediaRecorder clip length (ms). Set `NEXT_PUBLIC_MAX_RECORDING_SECONDS` (default 60, max 300). */
export function getMaxRecordingDurationMs(): number {
  const s = Number(trim(process.env.NEXT_PUBLIC_MAX_RECORDING_SECONDS))
  const sec = Number.isFinite(s) && s > 0 ? Math.min(Math.max(s, 5), 300) : 60
  return sec * 1000
}

/** Soft client cap for base64 payload (~bytes×1.37). Backend enforces `AUDIO_UPLOAD_MAX_MB`. */
export function getMaxTranscribePayloadHintChars(): number {
  const mb = Number(trim(process.env.NEXT_PUBLIC_AUDIO_UPLOAD_MAX_MB))
  const safe = Number.isFinite(mb) && mb > 0 ? Math.min(mb, 25) : 12
  return Math.floor(safe * 1024 * 1024 * 1.37)
}
