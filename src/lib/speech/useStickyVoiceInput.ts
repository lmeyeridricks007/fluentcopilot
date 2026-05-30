'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getSpeechInputMode,
  isFeature1ChatBackendEnabled,
  isSpeechAudioAssessmentEnabled,
  isSpeechPronunciationEvalEnabled,
} from '@/lib/api/apiConfig'
import { BrowserSpeechSttSession, isBrowserSttSupported } from '@/lib/speech/browserSpeechStt'
import { startMediaRecordingSession, type ActiveMediaRecording } from '@/lib/speech/mediaRecorderCapture'
import type { PronunciationFeedback } from '@/lib/speech/pronunciationTypes'
import type { UserMessageInputMeta } from '@/lib/conversation/userMessageInputMeta'
import type { ComposerSendPayload } from '@/lib/conversation/composerSendPayload'
import {
  blobToBase64,
  evaluateTranscriptPronunciation,
  maxTranscribeBase64Chars,
  requestPronunciationAssessment,
  transcribeSpeechAudio,
} from '@/lib/speech/speechClient'
import type { PronunciationAssessmentApiResponse } from '@/lib/speech/audioPronunciationTypes'
import type { VoiceComposerPhase } from '@/lib/speech/speechInputTypes'
import {
  prepareAudioForAzurePronunciationAssessment,
  shouldPrepareWebmLikeForServerStt,
} from '@/lib/speech/prepareAudioForAzurePronunciationAssessment'
import {
  pickMatchingStarterSuggestion,
  reconcileTranscriptWithReferencePhrase,
} from '@/lib/speech/reconcileTranscriptWithReferencePhrase'

/**
 * Server-side capture (MediaRecorder + Whisper) is required for a retained audio blob:
 * Azure pronunciation assessment and "your recording" playback need that clip.
 * Browser Web Speech API does not expose the raw recording.
 *
 * NOTE: Not a React hook — the `use` prefix would trigger react-hooks/rules-of-hooks
 * when called from event callbacks. This is a pure config-flag predicate.
 */
function shouldUseWhisperFirst(): boolean {
  if (!isFeature1ChatBackendEnabled()) return false
  const m = getSpeechInputMode()
  if (m === 'server' || m === 'auto') return true
  if (m === 'browser' && isSpeechAudioAssessmentEnabled()) return true
  return false
}

type AudioAssessmentState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; payload: PronunciationAssessmentApiResponse }
  | { status: 'error'; message: string }

function formatMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function useStickyVoiceInput(opts: {
  composerValue: string
  onChange: (v: string) => void
  cefrLevel?: 'A2' | 'B1'
  scenarioHint?: string
  threadId?: string
  scenarioId?: string
  /** When set with `voiceAssessmentMode: "reference"`, Azure compares audio to this phrase. */
  voiceReferencePhrase?: string | null
  voiceAssessmentMode?: 'reference' | 'open_response'
  /** Guided Talk starters — used to bias Whisper and to reconcile STT to the intended line. */
  voiceGuidedStarters?: readonly string[] | null
}) {
  const [phase, setPhase] = useState<VoiceComposerPhase>('idle')
  const [seconds, setSeconds] = useState(0)
  const [livePreview, setLivePreview] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [pronunciationFeedback, setPronunciationFeedback] = useState<PronunciationFeedback | null>(null)
  const [transcriptEvalError, setTranscriptEvalError] = useState<string | null>(null)
  const [audioAssessment, setAudioAssessment] = useState<AudioAssessmentState>({ status: 'idle' })
  const audioAssessmentRef = useRef<AudioAssessmentState>({ status: 'idle' })
  audioAssessmentRef.current = audioAssessment
  const [userRecordingUrl, setUserRecordingUrl] = useState<string | null>(null)
  const [lastSpokenTranscript, setLastSpokenTranscript] = useState('')

  const composerRef = useRef(opts.composerValue)
  composerRef.current = opts.composerValue
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const changeRef = useRef(opts.onChange)
  changeRef.current = opts.onChange
  const cefrRef = useRef(opts.cefrLevel ?? 'A2')
  cefrRef.current = opts.cefrLevel ?? 'A2'
  const hintRef = useRef(opts.scenarioHint)
  hintRef.current = opts.scenarioHint
  const threadIdRef = useRef(opts.threadId)
  threadIdRef.current = opts.threadId
  const scenarioIdRef = useRef(opts.scenarioId)
  scenarioIdRef.current = opts.scenarioId
  const referencePhraseRef = useRef(opts.voiceReferencePhrase ?? null)
  referencePhraseRef.current = opts.voiceReferencePhrase ?? null
  const assessmentModeRef = useRef(opts.voiceAssessmentMode ?? 'open_response')
  assessmentModeRef.current = opts.voiceAssessmentMode ?? 'open_response'
  const guidedStartersRef = useRef<readonly string[]>([])
  guidedStartersRef.current = opts.voiceGuidedStarters ?? []

  /** Composer text before current voice capture — restored on discard from review. */
  const textBeforeVoiceRef = useRef('')
  /** Whisper/browser output before user edits — sent as `originalTranscript` when they tap Send. */
  const originalTranscriptRef = useRef('')

  const browserRef = useRef<BrowserSpeechSttSession | null>(null)
  const mediaRef = useRef<ActiveMediaRecording | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const whisperAbort = useRef<AbortController | null>(null)
  const assessmentAbort = useRef<AbortController | null>(null)
  /** Next Azure assess uses this reference line (subset / shadow chunk) instead of thread reference phrase. */
  const assessmentOverrideRef = useRef<{ expectedText: string; mode: 'reference' } | null>(null)
  /** True only for the recording leg that follows shadow_listen (transcribe purpose + logging). */
  const shadowRecordingRef = useRef(false)
  const [shadowListenText, setShadowListenText] = useState<string | null>(null)

  const clearRecordingUrl = useCallback(() => {
    setUserRecordingUrl((prev) => {
      if (prev) {
        try {
          URL.revokeObjectURL(prev)
        } catch {
          /* ignore */
        }
      }
      return null
    })
  }, [])

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

  const enterIdleClean = useCallback(() => {
    clearTick()
    setSeconds(0)
    setLivePreview('')
    setPhase('idle')
    setVoiceError(null)
  }, [clearTick])

  const dismissPronunciationFeedback = useCallback(() => {
    setPronunciationFeedback(null)
    setTranscriptEvalError(null)
    setAudioAssessment({ status: 'idle' })
    setLastSpokenTranscript('')
    clearRecordingUrl()
  }, [clearRecordingUrl])

  /** Close coach cards only — stay in review with composer text (e.g. after “Retry” loads a phrase). */
  const closeCoachOverlay = useCallback(() => {
    setPronunciationFeedback(null)
    setTranscriptEvalError(null)
    setAudioAssessment({ status: 'idle' })
  }, [])

  const queueReferenceOnlyAssessment = useCallback((phrase: string | null) => {
    if (!phrase?.trim()) {
      assessmentOverrideRef.current = null
      return
    }
    assessmentOverrideRef.current = { expectedText: phrase.trim(), mode: 'reference' }
  }, [])

  const beginShadowPractice = useCallback(
    (chunk: string) => {
      const t = chunk.trim()
      if (!t) return
      assessmentAbort.current?.abort()
      assessmentAbort.current = null
      whisperAbort.current?.abort()
      whisperAbort.current = null
      assessmentOverrideRef.current = { expectedText: t, mode: 'reference' }
      changeRef.current(t)
      dismissPronunciationFeedback()
      setVoiceError(null)
      setShadowListenText(t)
      clearTick()
      setSeconds(0)
      setLivePreview('')
      setPhase('shadow_listen')
    },
    [clearTick, dismissPronunciationFeedback]
  )

  const completeShadowListenAndArmRecording = useCallback(async () => {
    if (phaseRef.current !== 'shadow_listen') return
    try {
      setVoiceError(null)
      setShadowListenText(null)
      setPhase('recording')
      shadowRecordingRef.current = true
      startTick()
      mediaRef.current = await startMediaRecordingSession({ requestDataBeforeStop: true })
    } catch (e) {
      shadowRecordingRef.current = false
      assessmentOverrideRef.current = null
      clearTick()
      setVoiceError(
        e instanceof Error && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')
          ? 'Microphone access was denied.'
          : e instanceof Error
            ? e.message
            : 'Could not access the microphone'
      )
      setPhase('error')
    }
  }, [clearTick, startTick])

  const discardTranscriptReview = useCallback(() => {
    assessmentAbort.current?.abort()
    assessmentAbort.current = null
    whisperAbort.current?.abort()
    whisperAbort.current = null
    assessmentOverrideRef.current = null
    shadowRecordingRef.current = false
    setShadowListenText(null)
    changeRef.current(textBeforeVoiceRef.current)
    originalTranscriptRef.current = ''
    setPronunciationFeedback(null)
    setTranscriptEvalError(null)
    setAudioAssessment({ status: 'idle' })
    setLastSpokenTranscript('')
    clearRecordingUrl()
    enterIdleClean()
  }, [clearRecordingUrl, enterIdleClean])

  const cancelShadowPractice = useCallback(() => {
    assessmentAbort.current?.abort()
    assessmentAbort.current = null
    whisperAbort.current?.abort()
    whisperAbort.current = null
    browserRef.current?.abort()
    browserRef.current = null
    mediaRef.current?.cancel()
    mediaRef.current = null
    assessmentOverrideRef.current = null
    shadowRecordingRef.current = false
    setShadowListenText(null)
    clearTick()
    setSeconds(0)
    setLivePreview('')
    setPhase('idle')
    setVoiceError(null)
    clearRecordingUrl()
  }, [clearRecordingUrl, clearTick])

  const cancelVoice = useCallback(() => {
    assessmentAbort.current?.abort()
    assessmentAbort.current = null
    whisperAbort.current?.abort()
    whisperAbort.current = null
    browserRef.current?.abort()
    browserRef.current = null
    mediaRef.current?.cancel()
    mediaRef.current = null
    if (phaseRef.current === 'review') {
      discardTranscriptReview()
      return
    }
    if (phaseRef.current === 'shadow_listen') {
      cancelShadowPractice()
      return
    }
    assessmentOverrideRef.current = null
    shadowRecordingRef.current = false
    setShadowListenText(null)
    clearTick()
    setSeconds(0)
    setLivePreview('')
    setPhase('idle')
    setVoiceError(null)
    setPronunciationFeedback(null)
    setTranscriptEvalError(null)
    setAudioAssessment({ status: 'idle' })
    setLastSpokenTranscript('')
    clearRecordingUrl()
  }, [cancelShadowPractice, clearRecordingUrl, clearTick, discardTranscriptReview])

  /** Call when user sends the composer — returns speech meta + optional Azure voice payload, then clears review UI. */
  const consumeInputMetaForSend = useCallback((): ComposerSendPayload => {
    if (phaseRef.current !== 'review') return {}
    const orig = originalTranscriptRef.current.trim()
    const meta: UserMessageInputMeta = {
      inputMode: 'speech',
      originalTranscript: orig || null,
      audioReference: null,
    }
    const voiceQuality =
      audioAssessmentRef.current.status === 'ready' ? audioAssessmentRef.current.payload : undefined
    originalTranscriptRef.current = ''
    textBeforeVoiceRef.current = ''
    setPhase('idle')
    setPronunciationFeedback(null)
    setTranscriptEvalError(null)
    setAudioAssessment({ status: 'idle' })
    setLastSpokenTranscript('')
    assessmentOverrideRef.current = null
    shadowRecordingRef.current = false
    setShadowListenText(null)
    clearRecordingUrl()
    return { inputMeta: meta, voiceQuality }
  }, [clearRecordingUrl])

  const startBrowserSession = useCallback(() => {
    setVoiceError(null)
    if (!isBrowserSttSupported()) {
      setVoiceError('Speech input is not supported in this browser.')
      setPhase('error')
      return
    }
    setPhase('recording')
    startTick()
    const session = new BrowserSpeechSttSession()
    browserRef.current = session
    session.start(
      (t) => setLivePreview(t),
      (msg) => {
        clearTick()
        setVoiceError(msg)
        setPhase('error')
        browserRef.current = null
      }
    )
  }, [clearTick, startTick])

  const commitReviewDraft = useCallback(
    (t: string, blob: Blob | undefined, llmTranscriptFeedback?: PronunciationFeedback | undefined) => {
      const trimmed = t.trim()
      if (!trimmed) {
        setVoiceError('Nothing was detected. Try speaking closer to the mic, or re-record.')
        setPhase('error')
        return
      }
      changeRef.current(trimmed)
      originalTranscriptRef.current = trimmed
      setLastSpokenTranscript(trimmed)
      const wantRecordingPreview = Boolean(blob)
      if (wantRecordingPreview && blob) {
        clearRecordingUrl()
        setUserRecordingUrl(URL.createObjectURL(blob))
      }
      if (llmTranscriptFeedback) setPronunciationFeedback(llmTranscriptFeedback)
      setPhase('review')
    },
    [clearRecordingUrl]
  )

  const startListening = useCallback(async () => {
    assessmentAbort.current?.abort()
    assessmentAbort.current = null
    setVoiceError(null)
    setLivePreview('')
    if (phaseRef.current === 'shadow_listen') {
      cancelShadowPractice()
    }
    shadowRecordingRef.current = false
    dismissPronunciationFeedback()
    if (phaseRef.current === 'review') {
      discardTranscriptReview()
    }
    textBeforeVoiceRef.current = composerRef.current

    if (shouldUseWhisperFirst()) {
      try {
        setPhase('recording')
        startTick()
        mediaRef.current = await startMediaRecordingSession({ requestDataBeforeStop: true })
      } catch (e) {
        clearTick()
        mediaRef.current = null
        const denied = e instanceof Error && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')
        if (getSpeechInputMode() === 'auto' && isBrowserSttSupported()) {
          setPhase('idle')
          startBrowserSession()
          if (isSpeechAudioAssessmentEnabled()) {
            setVoiceError(
              'Microphone was not available for server capture. Using browser captions — your recording will not be saved for playback and voice pronunciation scoring is skipped until server capture works.'
            )
          }
          return
        }
        setVoiceError(
          denied
            ? 'Microphone access was denied.'
            : e instanceof Error
              ? e.message
              : 'Could not access the microphone'
        )
        setPhase('error')
      }
      return
    }

    startBrowserSession()
  }, [
    cancelShadowPractice,
    clearTick,
    dismissPronunciationFeedback,
    discardTranscriptReview,
    startBrowserSession,
    startTick,
  ])

  const stopListening = useCallback(async () => {
    if (phaseRef.current !== 'recording') return

    if (mediaRef.current) {
      clearTick()
      const rec = mediaRef.current
      mediaRef.current = null
      setPhase('processing')
      whisperAbort.current = new AbortController()
      const signal = whisperAbort.current.signal
      try {
        const { blob, mimeType } = await rec.stop()
        let pcmForStt: { audioBase64: string; mimeType: string } | null = null
        if (shouldPrepareWebmLikeForServerStt(mimeType)) {
          pcmForStt = await prepareAudioForAzurePronunciationAssessment(blob, mimeType)
        }
        const b64 = pcmForStt?.audioBase64 ?? (await blobToBase64(blob))
        const transcribeMime = pcmForStt?.mimeType ?? mimeType
        const cap = maxTranscribeBase64Chars()
        if (b64.length > cap) {
          throw new Error('Recording too long or too large — try a shorter clip or lower quality.')
        }
        const transcribePurpose = shadowRecordingRef.current ? 'shadow_retry' : 'conversation_reply'
        shadowRecordingRef.current = false
        const starters = guidedStartersRef.current
        const explicitRef = referencePhraseRef.current?.trim()
        const sid = (scenarioIdRef.current ?? '').trim().toLowerCase().replace(/-/g, '_')
        /** Whisper `prompt` from unrelated fragment-starters can anchor short output; monologues are open-ended. */
        const skipGuidedStarterPrompt =
          sid === 'explaining_something' || sid === 'storytelling'
        const starterBundle =
          !explicitRef && !skipGuidedStarterPrompt && starters.length > 0
            ? starters.slice(0, 16).join(' | ').slice(0, 400)
            : ''
        const transcriptionPrompt = (explicitRef || starterBundle || undefined)?.slice(0, 400)
        const res = await transcribeSpeechAudio(
          {
            audioBase64: b64,
            mimeType: transcribeMime,
            language: 'nl',
            evaluatePronunciation: false,
            cefrLevel: cefrRef.current,
            scenarioHint: hintRef.current,
            transcriptionPrompt,
            threadId: threadIdRef.current,
            scenarioId: scenarioIdRef.current,
            purpose: transcribePurpose,
          },
          { signal }
        )
        whisperAbort.current = null
        const tRaw = res.text.trim()
        if (!tRaw) {
          setVoiceError('Nothing was detected. Try speaking closer to the mic, or re-record.')
          setPhase('error')
          return
        }
        const startersPick = pickMatchingStarterSuggestion(tRaw, starters)
        const lineRef = explicitRef || startersPick || null
        const t = reconcileTranscriptWithReferencePhrase(tRaw, lineRef).trim()
        if (!t) {
          setVoiceError('Nothing was detected. Try speaking closer to the mic, or re-record.')
          setPhase('error')
          return
        }
        commitReviewDraft(t, blob, undefined)

        const wantAudio = isSpeechAudioAssessmentEnabled() && isFeature1ChatBackendEnabled()
        const wantLlmOnly =
          isSpeechPronunciationEvalEnabled() && !isSpeechAudioAssessmentEnabled() && isFeature1ChatBackendEnabled()

        if (wantAudio) {
          assessmentAbort.current?.abort()
          assessmentAbort.current = new AbortController()
          const assessSignal = assessmentAbort.current.signal
          setAudioAssessment({ status: 'loading' })
          void (async () => {
            try {
              const override = assessmentOverrideRef.current
              const useOverride = override?.mode === 'reference' && Boolean(override.expectedText?.trim())
              const refFromSettings = referencePhraseRef.current?.trim()
              const wantVoiceScenarioRef =
                !useOverride && assessmentModeRef.current === 'reference' && Boolean(refFromSettings)
              const guidedLineRef =
                !useOverride && !wantVoiceScenarioRef
                  ? pickMatchingStarterSuggestion(tRaw, starters)?.trim() || null
                  : null
              const wantRef = useOverride || wantVoiceScenarioRef || Boolean(guidedLineRef)
              const assessmentMode = wantRef ? ('reference' as const) : ('open_response' as const)
              const expectedText = useOverride
                ? override!.expectedText!.trim()
                : wantVoiceScenarioRef
                  ? refFromSettings!
                  : guidedLineRef
              const prepared =
                pcmForStt ?? (await prepareAudioForAzurePronunciationAssessment(blob, mimeType))
              const payload = await requestPronunciationAssessment(
                {
                  audioBase64: prepared.audioBase64,
                  mimeType: prepared.mimeType,
                  transcript: t,
                  expectedText,
                  locale: 'nl-NL',
                  scenarioHint: hintRef.current ?? null,
                  assessmentMode,
                  progressMeta: isFeature1ChatBackendEnabled()
                    ? {
                        threadId: threadIdRef.current ?? null,
                        scenarioId: scenarioIdRef.current ?? null,
                        scenarioTitle: hintRef.current?.trim() || null,
                        level: cefrRef.current === 'B1' ? 'B1' : 'A2',
                      }
                    : undefined,
                },
                { signal: assessSignal }
              )
              assessmentOverrideRef.current = null
              setAudioAssessment({ status: 'ready', payload })
            } catch (e) {
              if (e instanceof Error && e.name === 'AbortError') return
              assessmentOverrideRef.current = null
              const msg =
                e instanceof Error ? e.message : typeof e === 'string' ? e : 'Voice check could not load'
              setAudioAssessment({ status: 'error', message: msg })
            }
          })()
        } else {
          setAudioAssessment({ status: 'idle' })
        }

        if (wantLlmOnly) {
          void (async () => {
            try {
              const { pronunciation } = await evaluateTranscriptPronunciation({
                text: t,
                cefrLevel: cefrRef.current,
                scenarioHint: hintRef.current,
              })
              setTranscriptEvalError(null)
              setPronunciationFeedback(pronunciation)
            } catch (e) {
              setTranscriptEvalError(
                e instanceof Error ? e.message : 'Transcript coaching request failed. Check the API and try again.'
              )
            }
          })()
        }
      } catch (e) {
        whisperAbort.current = null
        if (e instanceof Error && e.name === 'AbortError') {
          enterIdleClean()
          return
        }
        if (getSpeechInputMode() === 'auto' && isBrowserSttSupported()) {
          setPhase('error')
          setVoiceError(
            e instanceof Error
              ? `${e.message} You can switch to browser captions: tap Re-record.`
              : 'Transcription failed. Try Re-record.'
          )
          return
        }
        setVoiceError(e instanceof Error ? e.message : 'Transcription failed')
        setPhase('error')
      }
      return
    }

    const br = browserRef.current
    if (br) {
      clearTick()
      browserRef.current = null
      br.stop((finalText) => {
        void (async () => {
          const tRaw = finalText.trim()
          if (!tRaw) {
            setVoiceError('Nothing was detected. Try again or check the microphone.')
            setPhase('error')
            return
          }
          const starters = guidedStartersRef.current
          const lineRef =
            referencePhraseRef.current?.trim() ||
            pickMatchingStarterSuggestion(tRaw, starters) ||
            null
          const t = reconcileTranscriptWithReferencePhrase(tRaw, lineRef).trim()
          if (isFeature1ChatBackendEnabled() && isSpeechPronunciationEvalEnabled()) {
            setPhase('processing')
            try {
              const { pronunciation } = await evaluateTranscriptPronunciation({
                text: t,
                cefrLevel: cefrRef.current,
                scenarioHint: hintRef.current,
              })
              setTranscriptEvalError(null)
              commitReviewDraft(t, undefined, pronunciation)
            } catch (e) {
              setTranscriptEvalError(
                e instanceof Error ? e.message : 'Transcript coaching request failed. Check the API and try again.'
              )
              commitReviewDraft(t, undefined, undefined)
            }
          } else {
            commitReviewDraft(t, undefined, undefined)
          }
          setAudioAssessment({ status: 'idle' })
        })()
      })
    }
  }, [clearTick, enterIdleClean, commitReviewDraft])

  const reRecord = useCallback(() => {
    /** From review, keep composer text + `assessmentOverrideRef` (phrase/word retry). Do not run `discardTranscriptReview`. */
    if (phaseRef.current === 'review') {
      assessmentAbort.current?.abort()
      assessmentAbort.current = null
      whisperAbort.current?.abort()
      whisperAbort.current = null
      browserRef.current?.abort()
      browserRef.current = null
      mediaRef.current?.cancel()
      mediaRef.current = null
      setPronunciationFeedback(null)
      setTranscriptEvalError(null)
      setAudioAssessment({ status: 'idle' })
      setLastSpokenTranscript('')
      clearRecordingUrl()
      originalTranscriptRef.current = ''
      enterIdleClean()
      void startListening()
      return
    }
    cancelVoice()
    void startListening()
  }, [cancelVoice, clearRecordingUrl, enterIdleClean, startListening])

  useEffect(
    () => () => {
      cancelVoice()
    },
    [cancelVoice]
  )

  return {
    phase,
    seconds,
    secondsLabel: formatMmSs(seconds),
    livePreview,
    voiceError,
    pronunciationFeedback,
    transcriptEvalError,
    audioAssessment,
    lastSpokenTranscript,
    userRecordingUrl,
    shadowListenText,
    dismissPronunciationFeedback,
    closeCoachOverlay,
    discardTranscriptReview,
    consumeInputMetaForSend,
    startListening,
    stopListening,
    cancelVoice,
    reRecord,
    queueReferenceOnlyAssessment,
    beginShadowPractice,
    completeShadowListenAndArmRecording,
    cancelShadowPractice,
  }
}
