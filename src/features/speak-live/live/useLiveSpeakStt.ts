'use client'

import { useCallback, useRef } from 'react'
import { conversationClient } from '@/lib/api/conversationClient'
import {
  getSpeakLiveAzureEndSilenceTimeoutMs,
  getSpeakLiveAzureInitialSilenceTimeoutMs,
  getSpeakLiveAzureSegmentationMaxPhraseMs,
  getSpeakLiveAzureSegmentationSilenceMs,
  getSpeakLiveAzureSegmentationStrategy,
  isSpeakLiveAzureSttVerboseLogsEnabled,
  isSpeakLiveBrowserAzureSttEnabled,
} from '@/lib/api/apiConfig'

type CachedToken = { token: string; region: string; exp: number }

let tokenCache: CachedToken | null = null

async function getAuthorizationToken(): Promise<{ token: string; region: string }> {
  if (tokenCache && Date.now() < tokenCache.exp - 45_000) {
    return { token: tokenCache.token, region: tokenCache.region }
  }
  const t = await conversationClient.fetchSpeakLiveAzureSpeechToken()
  tokenCache = {
    token: t.token,
    region: t.region,
    exp: Date.now() + t.expiresInSeconds * 1000,
  }
  return { token: t.token, region: t.region }
}

function speakLiveAzureSttLog(payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'development' && !isSpeakLiveAzureSttVerboseLogsEnabled()) return
  if (typeof console !== 'undefined' && console.info) {
    console.info('[SpeakLiveAzureStt]', payload)
  }
}

type SessionDiag = {
  segmentationMs: number
  endSilenceMs: number
  initialSilenceMs: number
  strategy: string
  sessionStartedAt: number | null
  speechStartAt: number | null
  speechEndAt: number | null
  firstPartialAt: number | null
  lastFinalAt: number | null
  finalCount: number
}

function wordCountLive(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

/**
 * On mic stop, Azure sometimes flushes only early phrase finals; the last cumulative `recognizing`
 * text can still hold trailing sentences not yet emitted as `recognized`. Prefer that tail
 * instead of dropping everything after the first finalized segment.
 */
function sentenceishBoundaries(s: string): number {
  return (s.match(/[.!?]+/g) ?? []).length
}

function mergeAzureLiveTranscript(finalsJoined: string, lastPartial: string): string {
  const f = finalsJoined.trim()
  const p = lastPartial.trim()
  if (!f) return p
  if (!p) return f
  const fw = wordCountLive(f)
  const pw = wordCountLive(p)
  if (pw > fw) return p
  if (pw + 1 >= fw && p.length > f.length + 20) return p
  if (pw >= fw && sentenceishBoundaries(p) > sentenceishBoundaries(f)) return p
  if (pw === fw && p.length > f.length + 8) return p
  return f
}

function emptyDiag(
  segmentationMs: number,
  endSilenceMs: number,
  initialSilenceMs: number,
  strategy: string
): SessionDiag {
  return {
    segmentationMs,
    endSilenceMs,
    initialSilenceMs,
    strategy,
    sessionStartedAt: null,
    speechStartAt: null,
    speechEndAt: null,
    firstPartialAt: null,
    lastFinalAt: null,
    finalCount: 0,
  }
}

/**
 * Browser Azure Speech continuous recognition (partials + finals) while user holds mic.
 *
 * Important: `stopContinuousRecognitionAsync` must not run while `startContinuousRecognitionAsync`
 * is still resolving — that can corrupt the SDK (e.g. TypeError: Cannot read properties of null (reading 'reject')).
 * We track an in-flight start promise + pending recognizer so `closeRecognizer` always waits / disposes safely.
 */
export type LiveSpeakSttStartOptions = {
  /** Fired once when Azure returns the first non-empty partial hypothesis. */
  onFirstPartial?: () => void
  /** Fired when Azure fires speechEndDetected — useful for auto-commit silence detection. */
  onSpeechEnd?: () => void
  /**
   * Override segmentation silence (ms). When omitted, uses {@link getSpeakLiveAzureSegmentationSilenceMs}
   * (default 320ms, env-tunable).
   */
  segmentationSilenceMs?: number
}

export type LiveSpeakSttStopResult = {
  text: string
  usedPartialFallback: boolean
  /** Joined finals existed, but cumulative partial was richer (tail not yet finalized). */
  usedPartialOverIncompleteFinals: boolean
  finalSegmentCount: number
  speechStartToStopMs?: number
  utteranceDurationMs?: number
}

export function useLiveSpeakStt(speechLocale: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK instance from dynamic import
  const recognizerRef = useRef<any>(null)
  /** Recognizer created for the current start; not published to `recognizerRef` until start succeeds. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingRecognizerRef = useRef<any>(null)
  const startPromiseRef = useRef<Promise<void> | null>(null)

  const finalsRef = useRef<string[]>([])
  /** Last non-empty partial hypothesis — used as fallback when no finals arrived by stop time. */
  const lastPartialRef = useRef('')
  const diagRef = useRef<SessionDiag | null>(null)

  const closeRecognizer = useCallback(async () => {
    const inflight = startPromiseRef.current
    if (inflight) {
      try {
        await inflight
      } catch {
        /* start failed — pending cleanup handled in startContinuous */
      }
    }
    startPromiseRef.current = null

    const pending = pendingRecognizerRef.current
    pendingRecognizerRef.current = null
    const active = recognizerRef.current
    recognizerRef.current = null

    const r = active ?? pending
    if (!r) return

    await new Promise<void>((resolve) => {
      try {
        r.stopContinuousRecognitionAsync(
          () => resolve(),
          () => resolve()
        )
      } catch {
        resolve()
      }
    })
    try {
      r.close()
    } catch {
      /* ignore */
    }
  }, [])

  const startContinuous = useCallback(
    async (onPartial: (text: string) => void, options?: LiveSpeakSttStartOptions) => {
      if (!isSpeakLiveBrowserAzureSttEnabled()) {
        throw new Error('BROWSER_AZURE_STT_DISABLED')
      }
      const { token, region } = await getAuthorizationToken()
      const sdk = await import('microsoft-cognitiveservices-speech-sdk')
      await closeRecognizer()
      finalsRef.current = []
      lastPartialRef.current = ''
      const segmentationMs = options?.segmentationSilenceMs ?? getSpeakLiveAzureSegmentationSilenceMs()
      const endSilenceMs = getSpeakLiveAzureEndSilenceTimeoutMs(segmentationMs)
      const initialSilenceMs = getSpeakLiveAzureInitialSilenceTimeoutMs()
      const strategy = getSpeakLiveAzureSegmentationStrategy()
      const maxPhraseMs = getSpeakLiveAzureSegmentationMaxPhraseMs()
      diagRef.current = emptyDiag(segmentationMs, endSilenceMs, initialSilenceMs, strategy)

      const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region)
      speechConfig.speechRecognitionLanguage = speechLocale
      speechConfig.setProperty(sdk.PropertyId.Speech_SegmentationStrategy, strategy)
      speechConfig.setProperty(sdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, String(segmentationMs))
      speechConfig.setProperty(sdk.PropertyId.Speech_SegmentationMaximumTimeMs, String(maxPhraseMs))
      speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, String(endSilenceMs))
      speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, String(initialSilenceMs))

      speakLiveAzureSttLog({
        event: 'recognize_config',
        segmentationSilenceMs: segmentationMs,
        endSilenceTimeoutMs: endSilenceMs,
        initialSilenceTimeoutMs: initialSilenceMs,
        segmentationMaxPhraseMs: maxPhraseMs,
        segmentationStrategy: strategy,
        locale: speechLocale,
      })

      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput()
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)
      pendingRecognizerRef.current = recognizer
      let firstPartialSent = false

      recognizer.sessionStarted = () => {
        const d = diagRef.current
        if (!d) return
        d.sessionStartedAt = performance.now()
        speakLiveAzureSttLog({ event: 'session_started', perfMs: d.sessionStartedAt })
      }

      recognizer.speechStartDetected = () => {
        const d = diagRef.current
        if (!d) return
        const now = performance.now()
        if (d.speechStartAt == null) d.speechStartAt = now
        speakLiveAzureSttLog({
          event: 'speech_start_detected',
          perfMs: now,
          sinceSessionStartMs: d.sessionStartedAt != null ? Math.round(now - d.sessionStartedAt) : undefined,
        })
      }

      recognizer.speechEndDetected = () => {
        const d = diagRef.current
        if (!d) return
        d.speechEndAt = performance.now()
        speakLiveAzureSttLog({
          event: 'speech_end_detected',
          perfMs: d.speechEndAt,
          sinceSpeechStartMs: d.speechStartAt != null ? Math.round(d.speechEndAt - d.speechStartAt) : undefined,
        })
        options?.onSpeechEnd?.()
      }

      recognizer.recognizing = (_s, e) => {
        const t = (e.result?.text as string) ?? ''
        if (t.trim()) lastPartialRef.current = t.trim()
        onPartial(t)
        const d = diagRef.current
        if (!d) return
        if (!firstPartialSent && t.trim()) {
          firstPartialSent = true
          const now = performance.now()
          d.firstPartialAt = now
          speakLiveAzureSttLog({
            event: 'first_partial',
            perfMs: now,
            charCount: t.trim().length,
            sinceSpeechStartMs: d.speechStartAt != null ? Math.round(now - d.speechStartAt) : undefined,
            sinceSessionStartMs: d.sessionStartedAt != null ? Math.round(now - d.sessionStartedAt) : undefined,
          })
          options?.onFirstPartial?.()
        }
      }

      recognizer.recognized = (_s, e) => {
        if (e.result?.reason === sdk.ResultReason.RecognizedSpeech) {
          const t = (e.result.text as string)?.trim()
          if (t) finalsRef.current.push(t)
          const d = diagRef.current
          if (!d) return
          const now = performance.now()
          d.lastFinalAt = now
          d.finalCount += 1
          speakLiveAzureSttLog({
            event: 'final_recognized',
            perfMs: now,
            segmentIndex: d.finalCount,
            textCharCount: t.length,
            sinceSpeechStartMs: d.speechStartAt != null ? Math.round(now - d.speechStartAt) : undefined,
            sinceFirstPartialMs: d.firstPartialAt != null ? Math.round(now - d.firstPartialAt) : undefined,
          })
        }
      }

      const startPromise = new Promise<void>((resolve, reject) => {
        // Set synchronously so `closeRecognizer` never misses an in-flight start (avoids stop-during-start races).
        startPromiseRef.current = startPromise
        recognizer.startContinuousRecognitionAsync(
          () => resolve(),
          (err) => reject(new Error(typeof err === 'string' ? err : 'Speech recognition failed'))
        )
      })
      try {
        await startPromise
        pendingRecognizerRef.current = null
        recognizerRef.current = recognizer
      } catch (e) {
        pendingRecognizerRef.current = null
        recognizerRef.current = null
        try {
          recognizer.close()
        } catch {
          /* ignore */
        }
        throw e
      } finally {
        if (startPromiseRef.current === startPromise) {
          startPromiseRef.current = null
        }
      }
    },
    [closeRecognizer, speechLocale]
  )

  const stopAndGetTranscript = useCallback(async (): Promise<LiveSpeakSttStopResult> => {
    const stopAt = performance.now()
    const d = diagRef.current
    const savedPartial = lastPartialRef.current
    await closeRecognizer()
    const finalsText = finalsRef.current.join(' ').trim()
    finalsRef.current = []
    lastPartialRef.current = ''

    const usedPartialFallback = !finalsText && !!savedPartial
    const merged = mergeAzureLiveTranscript(finalsText, savedPartial)
    const usedPartialOverIncompleteFinals =
      !!finalsText && !!savedPartial && merged === savedPartial.trim() && savedPartial.trim() !== finalsText
    const text = merged
    const utteranceAnchor = d?.speechStartAt ?? d?.firstPartialAt ?? d?.sessionStartedAt
    const utteranceDurationMs =
      utteranceAnchor != null ? Math.max(0, Math.round(stopAt - utteranceAnchor)) : undefined
    const speechStartToStopMs =
      d?.speechStartAt != null ? Math.max(0, Math.round(stopAt - d.speechStartAt)) : undefined

    if (d) {
      speakLiveAzureSttLog({
        event: 'session_stop_commit',
        perfMs: stopAt,
        joinedFinalCharCount: finalsText.length,
        usedPartialFallback,
        usedPartialOverIncompleteFinals,
        partialFallbackCharCount: usedPartialFallback ? savedPartial.length : 0,
        resultCharCount: text.length,
        finalSegmentCount: d.finalCount,
        segmentationSilenceMs: d.segmentationMs,
        endSilenceTimeoutMs: d.endSilenceMs,
        initialSilenceTimeoutMs: d.initialSilenceMs,
        segmentationStrategy: d.strategy,
        utteranceDurationMs,
        speechStartToStopMs,
        firstPartialToStopMs:
          d.firstPartialAt != null ? Math.max(0, Math.round(stopAt - d.firstPartialAt)) : undefined,
      })
    }
    diagRef.current = null
    return {
      text,
      usedPartialFallback,
      usedPartialOverIncompleteFinals,
      finalSegmentCount: d?.finalCount ?? 0,
      speechStartToStopMs,
      utteranceDurationMs,
    }
  }, [closeRecognizer])

  return { startContinuous, stopAndGetTranscript, closeRecognizer }
}
