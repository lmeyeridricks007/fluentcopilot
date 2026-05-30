import type { LiveTurnLatencyTraceServer } from '@/lib/api/apiTypes'

/**
 * End-to-end latency trace for Speak Live / browser STT turns.
 * All `*Ms` fields (except totalMs where noted) are milliseconds relative to `turnAnchorPerf`
 * (typically: mic release → start of `commitListening` finalize).
 */

export type LiveSpeechLatencyTrace = {
  sessionId: string
  turnId: string
  /** ISO timestamp when the turn anchor was taken */
  startedAtIso: string
  /** performance.now() value at turn start (for debugging only) */
  turnAnchorPerf: number
  /** Mic / capture: first audio frame or recognizer armed (optional) */
  captureReadyMs?: number
  /** First non-empty partial from Azure continuous recognition */
  firstPartialTranscriptMs?: number
  /** Final user text ready to send to LLM */
  finalTranscriptMs?: number
  prepareAudioMs?: number
  serverTranscribeMs?: number
  llmRequestStartMs?: number
  /** First streamed token of assistant reply (NDJSON delta) */
  llmFirstDeltaMs?: number
  llmDoneMs?: number
  llmMs?: number
  ttsStartMs?: number
  ttsDoneMs?: number
  ttsMs?: number
  playbackStartMs?: number
  totalMs?: number
  /** LLM finished → assistant text committed in React (approx. next paint, double rAF). */
  llmToTextRenderMs?: number
  /** First text paint → TTS response bytes ready (URL usable). */
  textToAudioReadyMs?: number
  /** Which stage consumed the most time (relative gaps) */
  bottleneck?: string
  /** DEV: model label from server perf when present */
  modelHint?: string
  /** Stage A reply-only prompt character estimate (Speak Live stream meta). */
  replyPromptCharsEstimate?: number
  /** Time from speech end to auto-commit (ms). */
  autoCommitMs?: number
  /** First TTS chunk audio ready (when chunked TTS is used). */
  firstTtsChunkReadyMs?: number
  /** Number of TTS chunks requested. */
  ttsChunkCount?: number
  /** Whether chunked TTS was used. */
  usedChunkedTts?: boolean
  /** Prompt size in characters (from server or fast turn). */
  promptChars?: number
  /** Number of prior turns included in prompt. */
  recentTurnsIncluded?: number
  /** Response text length (assistant reply chars). */
  responseTextLength?: number
  /** Whether the fast-turn endpoint was used. */
  usedFastTurn?: boolean
  /** Server-reported first LLM token latency (ms from prompt send to first chunk). */
  serverFirstTokenMs?: number
  /** Estimated prompt token count (from prompt chars / 3.5). */
  estimatedPromptTokens?: number
  /** Merged from NDJSON `done.liveTurnLatencyTrace` (server-only portions). */
  serverNormalizationMs?: number
  serverStateLoadMs?: number
  serverLlmMs?: number
  serverModerationAssistantMs?: number | null
  serverTotalMs?: number
  serverBottleneckStage?: string
  serverModelUsed?: string
  serverEstimatedInputTokens?: number
  serverEstimatedOutputTokens?: number
  serverBudgetsExceeded?: string[]
}

const nowIso = () => new Date().toISOString()

export class LiveSpeechTurnTimer {
  readonly turnId: string
  readonly sessionId: string
  readonly startedAtIso: string
  readonly turnAnchorPerf: number
  captureReadyMs?: number
  firstPartialTranscriptMs?: number
  finalTranscriptMs?: number
  prepareAudioMs?: number
  serverTranscribeMs?: number
  llmRequestStartMs?: number
  llmFirstDeltaMs?: number
  llmDoneMs?: number
  llmMs?: number
  ttsStartMs?: number
  ttsDoneMs?: number
  ttsMs?: number
  playbackStartMs?: number
  totalMs?: number
  modelHint?: string
  replyPromptCharsEstimate?: number
  autoCommitMs?: number
  firstTtsChunkReadyMs?: number
  ttsChunkCount?: number
  usedChunkedTts?: boolean
  promptChars?: number
  recentTurnsIncluded?: number
  responseTextLength?: number
  usedFastTurn?: boolean
  serverFirstTokenMs?: number
  estimatedPromptTokens?: number
  private llmDoneAtPerf?: number
  private assistantTextPaintAtPerf?: number
  private ttsDoneAtPerf?: number
  private serverLatencyTrace?: LiveTurnLatencyTraceServer

  constructor(sessionId: string) {
    this.sessionId = sessionId
    this.turnId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `turn-${Date.now()}`
    this.startedAtIso = nowIso()
    this.turnAnchorPerf = performance.now()
  }

  private rel(): number {
    return performance.now() - this.turnAnchorPerf
  }

  markCaptureReady(): void {
    if (this.captureReadyMs == null) this.captureReadyMs = this.rel()
  }

  markFirstPartialTranscript(): void {
    if (this.firstPartialTranscriptMs == null) this.firstPartialTranscriptMs = this.rel()
  }

  markFinalTranscript(): void {
    if (this.finalTranscriptMs == null) this.finalTranscriptMs = this.rel()
  }

  markPrepareAudio(ms: number): void {
    this.prepareAudioMs = ms
  }

  markServerTranscribe(ms: number): void {
    this.serverTranscribeMs = ms
  }

  markLlmRequestStart(): void {
    if (this.llmRequestStartMs == null) this.llmRequestStartMs = this.rel()
  }

  markLlmFirstDelta(): void {
    if (this.llmFirstDeltaMs == null) this.llmFirstDeltaMs = this.rel()
  }

  markLlmDone(): void {
    const at = this.rel()
    this.llmDoneMs = at
    if (this.llmRequestStartMs != null) this.llmMs = at - this.llmRequestStartMs
    if (this.llmDoneAtPerf == null) this.llmDoneAtPerf = performance.now()
  }

  /** Call after layout (e.g. double `requestAnimationFrame` following assistant text commit). */
  markAssistantTextPaintedAfterCommit(): void {
    if (this.assistantTextPaintAtPerf == null) this.assistantTextPaintAtPerf = performance.now()
  }

  markTtsStart(): void {
    const at = this.rel()
    this.ttsStartMs = at
  }

  markTtsDone(): void {
    const at = this.rel()
    this.ttsDoneMs = at
    if (this.ttsStartMs != null) this.ttsMs = at - this.ttsStartMs
    if (this.ttsDoneAtPerf == null) this.ttsDoneAtPerf = performance.now()
  }

  markPlaybackStart(): void {
    if (this.playbackStartMs == null) this.playbackStartMs = this.rel()
  }

  /** Attach server-reported Stage A model label + prompt size for dev overlay / traces. */
  setSpeakLiveStreamDevHints(hints: { modelLabel?: string; replyPromptCharsEstimate?: number }): void {
    if (hints.modelLabel) this.modelHint = hints.modelLabel
    if (typeof hints.replyPromptCharsEstimate === 'number') this.replyPromptCharsEstimate = hints.replyPromptCharsEstimate
  }

  markAutoCommit(ms: number): void {
    this.autoCommitMs = ms
  }

  markFirstTtsChunkReady(): void {
    if (this.firstTtsChunkReadyMs == null) this.firstTtsChunkReadyMs = this.rel()
  }

  setTtsChunkCount(n: number): void {
    this.ttsChunkCount = n
    this.usedChunkedTts = n > 0
  }

  setPromptMetrics(metrics: { promptChars?: number; recentTurnsIncluded?: number; responseTextLength?: number }): void {
    if (typeof metrics.promptChars === 'number') this.promptChars = metrics.promptChars
    if (typeof metrics.recentTurnsIncluded === 'number') this.recentTurnsIncluded = metrics.recentTurnsIncluded
    if (typeof metrics.responseTextLength === 'number') this.responseTextLength = metrics.responseTextLength
  }

  setUsedFastTurn(v: boolean): void {
    this.usedFastTurn = v
  }

  setServerFirstTokenMs(ms: number): void {
    this.serverFirstTokenMs = ms
  }

  setEstimatedPromptTokens(n: number): void {
    this.estimatedPromptTokens = n
  }

  /** Attach structured server trace from `done.liveTurnLatencyTrace` (Speak Live stream). */
  setServerLatencyTrace(trace: LiveTurnLatencyTraceServer): void {
    this.serverLatencyTrace = trace
  }

  /** Merge timings from `POST /speak-live/turn` when the browser did not split STT/LLM/TTS. */
  applyServerSpeakLivePerf(perf: Record<string, number>): void {
    if (typeof perf.sttMs === 'number') this.serverTranscribeMs = perf.sttMs
    if (typeof perf.llmMs === 'number') this.llmMs = perf.llmMs
    if (typeof perf.ttsMs === 'number') this.ttsMs = perf.ttsMs
  }

  finish(): LiveSpeechLatencyTrace {
    this.totalMs = performance.now() - this.turnAnchorPerf
    const llmToTextRenderMs =
      this.llmDoneAtPerf != null && this.assistantTextPaintAtPerf != null
        ? Math.max(0, this.assistantTextPaintAtPerf - this.llmDoneAtPerf)
        : undefined
    const textToAudioReadyMs =
      this.assistantTextPaintAtPerf != null && this.ttsDoneAtPerf != null
        ? Math.max(0, this.ttsDoneAtPerf - this.assistantTextPaintAtPerf)
        : undefined
    const srv = this.serverLatencyTrace
    const llmForBottleneck = Math.max(this.llmMs ?? 0, srv?.llmMs ?? 0)
    const bottleneck = inferBottleneck({
      finalTranscriptMs: this.finalTranscriptMs,
      serverTranscribeMs: this.serverTranscribeMs,
      prepareAudioMs: this.prepareAudioMs,
      llmMs: llmForBottleneck > 0 ? llmForBottleneck : this.llmMs,
      ttsMs: this.ttsMs,
    })
    const trace: LiveSpeechLatencyTrace = {
      sessionId: this.sessionId,
      turnId: this.turnId,
      startedAtIso: this.startedAtIso,
      turnAnchorPerf: this.turnAnchorPerf,
      captureReadyMs: this.captureReadyMs,
      firstPartialTranscriptMs: this.firstPartialTranscriptMs,
      finalTranscriptMs: this.finalTranscriptMs,
      prepareAudioMs: this.prepareAudioMs,
      serverTranscribeMs: this.serverTranscribeMs,
      llmRequestStartMs: this.llmRequestStartMs,
      llmFirstDeltaMs: this.llmFirstDeltaMs,
      llmDoneMs: this.llmDoneMs,
      llmMs: this.llmMs,
      ttsStartMs: this.ttsStartMs,
      ttsDoneMs: this.ttsDoneMs,
      ttsMs: this.ttsMs,
      playbackStartMs: this.playbackStartMs,
      totalMs: this.totalMs,
      llmToTextRenderMs,
      textToAudioReadyMs,
      bottleneck,
      modelHint: this.modelHint,
      replyPromptCharsEstimate: this.replyPromptCharsEstimate,
      autoCommitMs: this.autoCommitMs,
      firstTtsChunkReadyMs: this.firstTtsChunkReadyMs,
      ttsChunkCount: this.ttsChunkCount,
      usedChunkedTts: this.usedChunkedTts,
      promptChars: this.promptChars,
      recentTurnsIncluded: this.recentTurnsIncluded,
      responseTextLength: this.responseTextLength,
      usedFastTurn: this.usedFastTurn,
      serverFirstTokenMs: this.serverFirstTokenMs,
      estimatedPromptTokens: this.estimatedPromptTokens,
      ...(srv
        ? {
            serverNormalizationMs: srv.normalizationMs,
            serverStateLoadMs: srv.stateLoadMs,
            serverLlmMs: srv.llmMs,
            serverModerationAssistantMs: srv.moderationAssistantMs,
            serverTotalMs: srv.totalMs,
            serverBottleneckStage: srv.bottleneckStage,
            serverModelUsed: srv.modelUsed,
            serverEstimatedInputTokens: srv.estimatedInputTokens,
            serverEstimatedOutputTokens: srv.estimatedOutputTokens,
            serverBudgetsExceeded: srv.budgetsExceeded,
          }
        : {}),
    }
    if (process.env.NODE_ENV === 'development' && typeof console !== 'undefined' && console.info) {
      console.info('[LiveSpeechLatency]', trace)
    }
    if (typeof trace.totalMs === 'number' && trace.totalMs > 5000 && typeof console !== 'undefined' && console.warn) {
      console.warn('WARNING: LIVE TURN OVER BUDGET', {
        totalMs: trace.totalMs,
        bottleneck: trace.bottleneck,
        serverBottleneck: trace.serverBottleneckStage,
      })
    }
    return trace
  }
}

/** Compare dominant stage durations (stage timers are durations; `finalTranscriptMs` is anchor-relative). */
export function inferBottleneck(
  t: Pick<LiveSpeechLatencyTrace, 'finalTranscriptMs' | 'serverTranscribeMs' | 'prepareAudioMs' | 'llmMs' | 'ttsMs' | 'autoCommitMs'>
): string {
  const prep = t.prepareAudioMs ?? 0
  const stt = t.serverTranscribeMs ?? 0
  const llm = t.llmMs ?? 0
  const tts = t.ttsMs ?? 0
  const autoCommit = t.autoCommitMs ?? 0
  const stageMax = Math.max(prep, stt, llm, tts, autoCommit)
  if (stageMax > 0) {
    if (stageMax === prep) return 'audio prepare (client)'
    if (stageMax === autoCommit) return 'auto-commit wait'
    if (stageMax === stt) return 'server STT'
    if (stageMax === llm) return 'LLM'
    return 'TTS / playback prep'
  }
  const toFinal = t.finalTranscriptMs ?? 0
  if (toFinal > 0) return 'transcript / pre-LLM'
  return 'unknown'
}
