'use client'

/**
 * Precise client-side timeline for one Speak Live voice turn.
 *
 * Every event is recorded as an absolute `performance.now()` timestamp.
 * Derived deltas are computed lazily in {@link snapshot}.
 *
 * Dev-only: every `mark*` call also emits a structured console log with the
 * event name, absolute time, and delta from the previous event.
 */

const isDev = process.env.NODE_ENV === 'development'

export type TurnTimelineEvent =
  | 'micPressed'
  | 'sttSessionReady'
  | 'speechDetected'
  | 'firstPartialTranscript'
  | 'lastSpeechHeard'
  | 'silenceThresholdReached'
  | 'turnCommitTriggered'
  | 'audioCaptureStoppedAt'
  | 'audioEncodeStart'
  | 'audioEncodeEnd'
  | 'transcriptReady'
  | 'requestSent'
  | 'firstResponseByte'
  | 'firstAssistantText'
  | 'firstTtsChunkRequested'
  | 'firstTtsChunkReady'
  | 'playbackRequested'
  | 'audioSourceAssigned'
  | 'audioCanPlay'
  | 'playCallFired'
  | 'playbackStarted'
  | 'turnCompleted'

export type TurnTimelineSnapshot = {
  turnId: string
  events: Record<string, number>
  deltas: TurnTimelineDelta[]
  derived: TurnDerivedMetrics
  flags: TurnTimelineFlag[]
  audioBlobInfo?: { sizeBytes: number; encodeMs: number; uploadMs: number }
}

export type TurnTimelineDelta = {
  from: string
  to: string
  ms: number
}

export type TurnDerivedMetrics = {
  speechStartDelay?: number
  partialTranscriptLatency?: number
  silenceToCommit?: number
  commitToTranscriptReady?: number
  transcriptReadyToRequestSent?: number
  requestSentToFirstByte?: number
  firstByteToFirstText?: number
  firstTextToFirstTtsChunk?: number
  firstTtsChunkToPlayback?: number
  totalTurnLatency?: number
  commitToPlayback?: number
  encodeMs?: number
  uploadMs?: number
}

export type TurnTimelineFlag = {
  id: string
  label: string
  severity: 'warn' | 'critical'
  ms: number
}

const FLAG_THRESHOLDS = {
  silenceToCommit: { warn: 1200, label: 'commit too slow' },
  encodeMs: { warn: 1000, label: 'audio encode heavy' },
  uploadMs: { warn: 1000, label: 'audio upload heavy' },
  firstTtsChunkToPlayback: { warn: 800, label: 'playback blocked' },
  commitToPlayback: { warn: 2500, label: 'not realtime yet' },
  totalTurnLatency: { warn: 5000, label: 'very slow turn' },
} as const

export class TurnTimeline {
  readonly turnId: string
  private events = new Map<TurnTimelineEvent, number>()
  private ordered: { name: TurnTimelineEvent; at: number }[] = []
  private _audioBlobInfo?: { sizeBytes: number; encodeMs: number; uploadMs: number }

  constructor(turnId?: string) {
    this.turnId = turnId ?? `tl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  }

  mark(name: TurnTimelineEvent): void {
    if (this.events.has(name)) return
    const now = performance.now()
    this.events.set(name, now)
    this.ordered.push({ name, at: now })
    if (isDev) {
      const prev = this.ordered.length > 1 ? this.ordered[this.ordered.length - 2] : null
      const deltaMs = prev ? Math.round(now - prev.at) : 0
      const sinceStart = this.ordered.length > 0 ? Math.round(now - this.ordered[0]!.at) : 0
      console.info(`[TurnTimeline] ${this.turnId} | ${name} | +${deltaMs}ms (total ${sinceStart}ms)`, {
        event: name,
        at: Math.round(now),
        deltaFromPrev: deltaMs,
        sinceStart,
        prevEvent: prev?.name ?? null,
      })
    }
  }

  get(name: TurnTimelineEvent): number | undefined {
    return this.events.get(name)
  }

  setAudioBlobInfo(info: { sizeBytes: number; encodeMs: number; uploadMs: number }): void {
    this._audioBlobInfo = info
    if (isDev) {
      console.info(`[TurnTimeline] ${this.turnId} | audioBlobInfo`, info)
    }
  }

  updateAudioUploadMs(ms: number): void {
    if (this._audioBlobInfo) {
      this._audioBlobInfo.uploadMs = ms
    }
  }

  private delta(from: TurnTimelineEvent, to: TurnTimelineEvent): number | undefined {
    const a = this.events.get(from)
    const b = this.events.get(to)
    if (a == null || b == null) return undefined
    return Math.max(0, Math.round(b - a))
  }

  snapshot(): TurnTimelineSnapshot {
    const eventsObj: Record<string, number> = {}
    for (const [k, v] of this.events) {
      eventsObj[k] = Math.round(v)
    }

    const deltas: TurnTimelineDelta[] = []
    for (let i = 1; i < this.ordered.length; i++) {
      const prev = this.ordered[i - 1]!
      const curr = this.ordered[i]!
      deltas.push({
        from: prev.name,
        to: curr.name,
        ms: Math.round(curr.at - prev.at),
      })
    }

    const derived: TurnDerivedMetrics = {
      speechStartDelay: this.delta('micPressed', 'speechDetected'),
      partialTranscriptLatency: this.delta('speechDetected', 'firstPartialTranscript'),
      silenceToCommit: this.delta('lastSpeechHeard', 'turnCommitTriggered')
        ?? this.delta('silenceThresholdReached', 'turnCommitTriggered'),
      commitToTranscriptReady: this.delta('turnCommitTriggered', 'transcriptReady'),
      transcriptReadyToRequestSent: this.delta('transcriptReady', 'requestSent'),
      requestSentToFirstByte: this.delta('requestSent', 'firstResponseByte'),
      firstByteToFirstText: this.delta('firstResponseByte', 'firstAssistantText'),
      firstTextToFirstTtsChunk: this.delta('firstAssistantText', 'firstTtsChunkReady'),
      firstTtsChunkToPlayback: this.delta('firstTtsChunkReady', 'playbackStarted'),
      totalTurnLatency: this.delta('micPressed', 'playbackStarted')
        ?? this.delta('micPressed', 'turnCompleted'),
      commitToPlayback: this.delta('turnCommitTriggered', 'playbackStarted'),
      encodeMs: this._audioBlobInfo?.encodeMs,
      uploadMs: this._audioBlobInfo?.uploadMs,
    }

    const flags: TurnTimelineFlag[] = []
    for (const [key, cfg] of Object.entries(FLAG_THRESHOLDS)) {
      const val = derived[key as keyof TurnDerivedMetrics]
      if (typeof val === 'number' && val > cfg.warn) {
        flags.push({
          id: key,
          label: cfg.label,
          severity: val > cfg.warn * 2 ? 'critical' : 'warn',
          ms: val,
        })
      }
    }

    return {
      turnId: this.turnId,
      events: eventsObj,
      deltas,
      derived,
      flags,
      audioBlobInfo: this._audioBlobInfo,
    }
  }

  /** Log full summary to console (dev only). */
  logSummary(): TurnTimelineSnapshot {
    const snap = this.snapshot()
    if (isDev) {
      console.info(`[TurnTimeline] ─── TURN SUMMARY ${this.turnId} ───`)
      console.table(snap.deltas)
      if (snap.flags.length) {
        console.warn('[TurnTimeline] FLAGS:', snap.flags)
      }
      const d = snap.derived
      const lines = Object.entries(d)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `  ${k}: ${v}ms`)
      console.info('[TurnTimeline] Derived:\n' + lines.join('\n'))
    }
    return snap
  }
}
