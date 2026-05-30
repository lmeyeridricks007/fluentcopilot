'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { BrowserSpeechSttSession, isBrowserSttSupported } from '@/lib/speech/browserSpeechStt'
import { startMediaRecordingSession, type ActiveMediaRecording } from '@/lib/speech/mediaRecorderCapture'
import {
  blobToBase64,
  maxTranscribeBase64Chars,
  transcribeSpeechAudio,
  userFacingTranscriptionErrorMessage,
} from '@/lib/speech/speechClient'

/**
 * Minimal “dictate into a text field” phases. We deliberately skip the heavy
 * review / pronunciation-assessment path that lives in `useStickyVoiceInput`:
 * here, the user just wants to speak and have the words land in the composer.
 */
export type DictationPhase = 'idle' | 'recording' | 'processing' | 'error'

type Engine = 'browser' | 'server' | 'unsupported'

function pickEngine(): Engine {
  if (isBrowserSttSupported()) return 'browser'
  if (isFeature1ChatBackendEnabled()) return 'server'
  return 'unsupported'
}

function formatMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Lightweight Dutch dictation for chat composers — Browser STT first (live captions,
 * no upload); Whisper fallback when the browser API is missing but the backend is on.
 *
 * Result is appended to the existing composer value via `onAppend` so the user can
 * keep editing before sending. There is intentionally no review step.
 */
export function useDictationToText(opts: {
  composerValue: string
  onAppend: (next: string) => void
  /** Sent to Whisper as scenario hint (e.g. scenario title). */
  scenarioHint?: string
  scenarioId?: string
  threadId?: string
}) {
  const [phase, setPhase] = useState<DictationPhase>('idle')
  const [seconds, setSeconds] = useState(0)
  const [livePreview, setLivePreview] = useState('')
  const [error, setError] = useState<string | null>(null)

  const engineRef = useRef<Engine>('unsupported')
  const browserRef = useRef<BrowserSpeechSttSession | null>(null)
  const mediaRef = useRef<ActiveMediaRecording | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const whisperAbortRef = useRef<AbortController | null>(null)

  const composerRef = useRef(opts.composerValue)
  composerRef.current = opts.composerValue
  const appendRef = useRef(opts.onAppend)
  appendRef.current = opts.onAppend
  const scenarioHintRef = useRef(opts.scenarioHint)
  scenarioHintRef.current = opts.scenarioHint
  const scenarioIdRef = useRef(opts.scenarioId)
  scenarioIdRef.current = opts.scenarioId
  const threadIdRef = useRef(opts.threadId)
  threadIdRef.current = opts.threadId

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const startTick = useCallback(() => {
    clearTick()
    setSeconds(0)
    tickRef.current = setInterval(() => setSeconds((x) => x + 1), 1000)
  }, [clearTick])

  /** Append a transcript onto whatever is already in the composer (with a single space). */
  const commit = useCallback((text: string) => {
    const next = text.trim()
    if (!next) return
    const current = composerRef.current
    const joined = current.trim().length > 0 ? `${current.replace(/\s+$/, '')} ${next}` : next
    appendRef.current(joined)
  }, [])

  const cancel = useCallback(() => {
    whisperAbortRef.current?.abort()
    whisperAbortRef.current = null
    browserRef.current?.abort()
    browserRef.current = null
    mediaRef.current?.cancel()
    mediaRef.current = null
    clearTick()
    setSeconds(0)
    setLivePreview('')
    setPhase('idle')
    setError(null)
  }, [clearTick])

  const start = useCallback(async () => {
    if (phase === 'recording' || phase === 'processing') return
    setError(null)
    setLivePreview('')
    const engine = pickEngine()
    engineRef.current = engine
    if (engine === 'unsupported') {
      setError('Voice input is not supported in this browser. Please type instead.')
      setPhase('error')
      return
    }

    if (engine === 'browser') {
      setPhase('recording')
      startTick()
      const session = new BrowserSpeechSttSession()
      browserRef.current = session
      session.start(
        (t) => setLivePreview(t),
        (msg) => {
          clearTick()
          browserRef.current = null
          setError(msg)
          setPhase('error')
        }
      )
      return
    }

    try {
      setPhase('recording')
      startTick()
      mediaRef.current = await startMediaRecordingSession({ requestDataBeforeStop: true })
    } catch (e) {
      clearTick()
      mediaRef.current = null
      const denied = e instanceof Error && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')
      setError(denied ? 'Microphone access was denied.' : e instanceof Error ? e.message : 'Could not access the microphone.')
      setPhase('error')
    }
  }, [clearTick, phase, startTick])

  const stop = useCallback(async () => {
    if (phase !== 'recording') return

    if (engineRef.current === 'browser') {
      const br = browserRef.current
      if (!br) {
        setPhase('idle')
        return
      }
      clearTick()
      browserRef.current = null
      br.stop((finalText) => {
        const t = finalText.trim()
        if (!t) {
          setError('Nothing was detected. Try again or move closer to the mic.')
          setPhase('error')
          return
        }
        commit(t)
        setLivePreview('')
        setSeconds(0)
        setPhase('idle')
      })
      return
    }

    const rec = mediaRef.current
    if (!rec) {
      setPhase('idle')
      return
    }
    mediaRef.current = null
    clearTick()
    setPhase('processing')
    whisperAbortRef.current = new AbortController()
    const signal = whisperAbortRef.current.signal
    try {
      const { blob, mimeType } = await rec.stop()
      const b64 = await blobToBase64(blob)
      if (b64.length > maxTranscribeBase64Chars()) {
        throw new Error('Recording is too long — please try a shorter clip.')
      }
      const res = await transcribeSpeechAudio(
        {
          audioBase64: b64,
          mimeType,
          language: 'nl',
          evaluatePronunciation: false,
          cefrLevel: 'A2',
          scenarioHint: scenarioHintRef.current,
          threadId: threadIdRef.current,
          scenarioId: scenarioIdRef.current,
          purpose: 'conversation_reply',
        },
        { signal }
      )
      whisperAbortRef.current = null
      const t = res.text.trim()
      if (!t) {
        setError('Nothing was detected. Try again or move closer to the mic.')
        setPhase('error')
        return
      }
      commit(t)
      setLivePreview('')
      setSeconds(0)
      setPhase('idle')
    } catch (e) {
      whisperAbortRef.current = null
      if (e instanceof Error && e.name === 'AbortError') {
        setPhase('idle')
        return
      }
      setError(userFacingTranscriptionErrorMessage(e))
      setPhase('error')
    }
  }, [clearTick, commit, phase])

  const dismissError = useCallback(() => {
    if (phase === 'error') {
      setError(null)
      setPhase('idle')
    }
  }, [phase])

  useEffect(() => {
    return () => {
      whisperAbortRef.current?.abort()
      browserRef.current?.abort()
      mediaRef.current?.cancel()
      clearTick()
    }
  }, [clearTick])

  return {
    phase,
    seconds,
    secondsLabel: formatMmSs(seconds),
    livePreview,
    error,
    /** True when at least one engine (browser STT or server Whisper) can run. */
    isAvailable: pickEngine() !== 'unsupported',
    start,
    stop,
    cancel,
    dismissError,
  }
}
