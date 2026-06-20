'use client'

import { getMaxRecordingDurationMs } from '@/lib/api/apiConfig'

const MEDIA_RECORDER_STOP_TIMEOUT_MS = 1800

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
  }
  return 'audio/webm'
}

/**
 * One MediaRecorder instance reused for every clip in a live voice session.
 * iOS WebKit (Chrome on iPhone included) often breaks when creating a second
 * MediaRecorder on the same stream — reusing the same instance avoids that and
 * avoids repeated getUserMedia prompts.
 */
export class SharedMicClipRecorder {
  private readonly stream: MediaStream
  private readonly mr: MediaRecorder
  private readonly mimeType: string
  private readonly requestDataBeforeStop: boolean
  private readonly clipMaxMs: number
  private chunks: BlobPart[] = []
  private maxTimer: ReturnType<typeof setTimeout> | null = null
  private capturing = false
  private stopPromise: Promise<{ blob: Blob; mimeType: string }> | null = null

  constructor(stream: MediaStream, options?: { requestDataBeforeStop?: boolean; maxDurationMs?: number }) {
    this.stream = stream
    this.requestDataBeforeStop = Boolean(options?.requestDataBeforeStop)
    const envMax = getMaxRecordingDurationMs()
    const rawCap = options?.maxDurationMs
    this.clipMaxMs =
      typeof rawCap === 'number' && Number.isFinite(rawCap)
        ? Math.min(Math.max(rawCap, 5_000), 300_000)
        : envMax
    this.mimeType = pickMimeType()
    this.mr = new MediaRecorder(stream, { mimeType: this.mimeType })
    this.mr.addEventListener('dataavailable', (e) => {
      if (this.capturing && e.data && e.data.size > 0) this.chunks.push(e.data)
    })
  }

  get mediaStream(): MediaStream {
    return this.stream
  }

  private clearTimer(): void {
    if (this.maxTimer) {
      clearTimeout(this.maxTimer)
      this.maxTimer = null
    }
  }

  private assembleBlob(): { blob: Blob; mimeType: string } {
    return {
      blob: new Blob(this.chunks, { type: this.mr.mimeType || this.mimeType }),
      mimeType: this.mr.mimeType || this.mimeType,
    }
  }

  startClip(): void {
    if (this.mr.state === 'recording') return
    this.stopPromise = null
    this.chunks = []
    this.capturing = true
    this.clearTimer()
    this.mr.start(250)
    this.maxTimer = setTimeout(() => {
      this.maxTimer = null
      if (this.mr.state === 'recording') {
        try {
          this.mr.stop()
        } catch {
          /* ignore */
        }
      }
    }, this.clipMaxMs)
  }

  cancelClip(): void {
    this.capturing = false
    this.clearTimer()
    this.stopPromise = null
    this.chunks = []
    try {
      if (this.mr.state === 'recording') this.mr.stop()
    } catch {
      /* ignore */
    }
  }

  stopClip(): Promise<{ blob: Blob; mimeType: string }> {
    if (this.stopPromise) return this.stopPromise
    this.stopPromise = new Promise((resolve, reject) => {
      this.capturing = false
      this.clearTimer()
      let settled = false
      let stopTimeout: ReturnType<typeof setTimeout> | null = null
      const settle = (kind: 'resolve' | 'reject', value: { blob: Blob; mimeType: string } | Error) => {
        if (settled) return
        settled = true
        this.stopPromise = null
        if (stopTimeout) {
          clearTimeout(stopTimeout)
          stopTimeout = null
        }
        if (kind === 'resolve') resolve(value as { blob: Blob; mimeType: string })
        else reject(value instanceof Error ? value : new Error('Could not stop recorder'))
      }
      if (this.mr.state === 'inactive') {
        if (this.chunks.length > 0) {
          window.setTimeout(() => settle('resolve', this.assembleBlob()), 0)
          return
        }
        settle('reject', new Error('Recording already stopped'))
        return
      }
      this.mr.addEventListener(
        'stop',
        () => {
          window.setTimeout(() => settle('resolve', this.assembleBlob()), 0)
        },
        { once: true },
      )
      stopTimeout = setTimeout(() => {
        if (this.chunks.length > 0) settle('resolve', this.assembleBlob())
        else settle('reject', new Error('Recording stop timed out'))
      }, MEDIA_RECORDER_STOP_TIMEOUT_MS)
      try {
        if (
          this.requestDataBeforeStop &&
          this.mr.state === 'recording' &&
          typeof this.mr.requestData === 'function'
        ) {
          try {
            this.mr.requestData()
          } catch {
            /* ignore */
          }
        }
        this.mr.stop()
      } catch (e) {
        settle('reject', e instanceof Error ? e : new Error('Could not stop recorder'))
      }
    })
    return this.stopPromise
  }
}

export type ActiveMediaRecording = {
  stop: () => Promise<{ blob: Blob; mimeType: string }>
  cancel: () => void
}

export type StartMediaRecordingSessionOptions = {
  /**
   * When true, calls `requestData()` before `stop()` so very short holds still emit a chunk.
   * Default **false** — some browsers/versions mis-handle immediate `requestData` + `stop` (breaks Talk dictation).
   * Speak Live hold-to-talk passes `true`.
   */
  requestDataBeforeStop?: boolean
  /**
   * Auto-stop ceiling (ms). Clamped to 5s..300s (product cap). When omitted, uses {@link getMaxRecordingDurationMs}.
   * Read-aloud passes a long ceiling so passages are not cut off at the default 60s Speak Live clip length.
   */
  maxDurationMs?: number
  /**
   * Optional pre-approved microphone stream. When supplied, the recorder will not call
   * `getUserMedia` again, which avoids repeated permission prompts in live voice sessions.
   */
  stream?: MediaStream
  /** Defaults to true for owned streams, false for caller-supplied streams. */
  stopTracksOnStop?: boolean
}

/**
 * Captures microphone audio into a single Blob (short clips; auto-stops at {@link MAX_MS}).
 */
export async function startMediaRecordingSession(
  options?: StartMediaRecordingSessionOptions
): Promise<ActiveMediaRecording> {
  const requestDataBeforeStop = Boolean(options?.requestDataBeforeStop)
  const envMax = getMaxRecordingDurationMs()
  const rawCap = options?.maxDurationMs
  const clipMaxMs =
    typeof rawCap === 'number' && Number.isFinite(rawCap)
      ? Math.min(Math.max(rawCap, 5_000), 300_000)
      : envMax

  const stream =
    options?.stream ??
    (await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    }))
  const stopTracksOnStop = options?.stopTracksOnStop ?? !options?.stream

  const mimeType = pickMimeType()
  const mr = new MediaRecorder(stream, { mimeType })
  const chunks: BlobPart[] = []

  mr.addEventListener('dataavailable', (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  })

  const stopTracks = () => {
    if (!stopTracksOnStop) return
    for (const t of stream.getTracks()) {
      try {
        t.stop()
      } catch {
        /* ignore */
      }
    }
  }

  mr.start(250)

  let maxTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
    maxTimer = null
    try {
      if (mr.state === 'recording') mr.stop()
    } catch {
      /* ignore */
    }
  }, clipMaxMs)

  const clearTimer = () => {
    if (maxTimer) {
      clearTimeout(maxTimer)
      maxTimer = null
    }
  }

  const assembleBlob = (): { blob: Blob; mimeType: string } => ({
    blob: new Blob(chunks, { type: mr.mimeType || mimeType }),
    mimeType: mr.mimeType || mimeType,
  })

  /** First `stop()` wins; later calls return the same promise (avoids double-stop races). */
  let stopPromise: Promise<{ blob: Blob; mimeType: string }> | null = null

  return {
    stop: () => {
      if (stopPromise) return stopPromise
      stopPromise = new Promise((resolve, reject) => {
        clearTimer()
        let settled = false
        let stopTimeout: ReturnType<typeof setTimeout> | null = null
        const settle = (kind: 'resolve' | 'reject', value: { blob: Blob; mimeType: string } | Error) => {
          if (settled) return
          settled = true
          if (stopTimeout) {
            clearTimeout(stopTimeout)
            stopTimeout = null
          }
          stopTracks()
          if (kind === 'resolve') {
            resolve(value as { blob: Blob; mimeType: string })
          } else {
            reject(value instanceof Error ? value : new Error('Could not stop recorder'))
          }
        }
        if (mr.state === 'inactive') {
          // Max-duration timer or OS may have stopped the recorder already — still return audio if we have chunks.
          if (chunks.length > 0) {
            window.setTimeout(() => settle('resolve', assembleBlob()), 0)
            return
          }
          settle('reject', new Error('Recording already stopped'))
          return
        }
        mr.addEventListener(
          'stop',
          () => {
            // Let any queued `dataavailable` handlers run before assembling the blob (short holds + requestData).
            window.setTimeout(() => settle('resolve', assembleBlob()), 0)
          },
          { once: true }
        )
        stopTimeout = setTimeout(() => {
          // Some mobile browsers occasionally miss `stop`; never leave the live turn pipeline stuck forever.
          if (chunks.length > 0) {
            settle('resolve', assembleBlob())
          } else {
            settle('reject', new Error('Recording stop timed out'))
          }
        }, MEDIA_RECORDER_STOP_TIMEOUT_MS)
        try {
          if (
            requestDataBeforeStop &&
            mr.state === 'recording' &&
            typeof mr.requestData === 'function'
          ) {
            try {
              mr.requestData()
            } catch {
              /* ignore — still try stop */
            }
          }
          mr.stop()
        } catch (e) {
          settle('reject', e instanceof Error ? e : new Error('Could not stop recorder'))
        }
      })
      return stopPromise
    },
    cancel: () => {
      clearTimer()
      try {
        if (mr.state === 'recording') mr.stop()
      } catch {
        /* ignore */
      }
      stopTracks()
    },
  }
}
