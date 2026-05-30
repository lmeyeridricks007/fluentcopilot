'use client'

import { useEffect, useRef } from 'react'
import { Loader2, Mic, RotateCcw, SendHorizontal, Square, X } from 'lucide-react'
import { clsx } from 'clsx'
import { SuggestionChips } from './SuggestionChips'
import { PronunciationFeedbackCard } from './PronunciationFeedbackCard'
import { VoiceQualityFeedbackCard } from './VoiceQualityFeedbackCard'
import { useStickyVoiceInput } from '@/lib/speech/useStickyVoiceInput'
import type { ComposerSendPayload } from '@/lib/conversation/composerSendPayload'
import { getApiBaseUrl } from '@/lib/api/apiConfig'
import { getSpeakingReferenceAudio } from '@/lib/speaking/speakingAssessmentClient'

/** Compact send — do not use `surfacePrimaryCta` here: it includes `w-full` and steals flex space from the textarea. */
const sendButtonClass = clsx(
  'shrink-0 min-h-touch w-12 h-12 rounded-xl inline-flex items-center justify-center',
  'font-bold text-white bg-primary-600',
  'shadow-[0_6px_22px_-6px_rgba(124,58,237,0.55)] ring-1 ring-primary-500/55',
  'transition-[transform,box-shadow,background-color] duration-150 ease-out',
  'active:scale-[0.98] touch-manipulation'
)

const micButtonClass = clsx(
  'shrink-0 min-h-touch w-12 h-12 rounded-xl inline-flex items-center justify-center',
  'border border-slate-200/90 bg-white text-ink-primary',
  'shadow-sm hover:bg-slate-50 hover:border-slate-300/90 transition-colors',
  'active:scale-[0.98] touch-manipulation'
)

async function speakBrowserNlReference(text: string): Promise<void> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    throw new Error('Browser speech is not available.')
  }
  await new Promise<void>((resolve, reject) => {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'nl-NL'
    const pick = () => {
      const voices = window.speechSynthesis.getVoices()
      const v =
        voices.find((x) => x.lang?.toLowerCase().startsWith('nl-nl')) ||
        voices.find((x) => x.lang?.toLowerCase().startsWith('nl')) ||
        null
      if (v) u.voice = v
    }
    pick()
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        pick()
      }
    }
    u.onend = () => resolve()
    u.onerror = () => reject(new Error('Browser TTS failed.'))
    window.speechSynthesis.speak(u)
  })
}

export function StickyChatComposer({
  value,
  onChange,
  onSend,
  disabled,
  sending,
  placeholder,
  suggestions,
  onPickSuggestion,
  endAndReview,
  voiceEnabled = true,
  voiceCefrLevel = 'A2',
  voiceScenarioHint,
  voiceThreadId,
  voiceScenarioId,
  voiceReferencePhrase,
  voiceAssessmentMode = 'open_response',
  voiceGuidedStarters,
  voiceOnApplyPhrase,
  voiceOnSavePhrase,
}: {
  value: string
  onChange: (v: string) => void
  /** Optional speech meta + optional voice assessment snapshot from the mic review step. */
  onSend: (payload: ComposerSendPayload) => void
  disabled?: boolean
  sending?: boolean
  placeholder?: string
  suggestions: string[]
  onPickSuggestion: (text: string) => void
  /** Visible secondary CTA — finish thread & recap (non-destructive styling). */
  endAndReview?: {
    visible: boolean
    disabled?: boolean
    onPress: () => void
    label?: string
  }
  /** When false, microphone dictation is hidden and any capture is cancelled. */
  voiceEnabled?: boolean
  /** CEFR level for pronunciation coaching tone (A2 = simpler, B1 = slightly richer). */
  voiceCefrLevel?: 'A2' | 'B1'
  /** Optional scenario title / intent hint for the pronunciation evaluator. */
  voiceScenarioHint?: string
  /** Thread id forwarded to transcribe API (logging). */
  voiceThreadId?: string
  /** Scenario id forwarded to transcribe API (logging). */
  voiceScenarioId?: string
  /** Optional target phrase for `reference` voice assessment (requires `voiceAssessmentMode`). */
  voiceReferencePhrase?: string | null
  /** `reference` when `voiceReferencePhrase` is set; default `open_response`. */
  voiceAssessmentMode?: 'reference' | 'open_response'
  /** Guided scenario starters — server STT bias + transcript repair when one line clearly matches. */
  voiceGuidedStarters?: readonly string[]
  /** Put retry target into the composer (speaking coach). */
  voiceOnApplyPhrase?: (phrase: string) => void
  /** Save word/phrase from speaking coach (e.g. library). */
  voiceOnSavePhrase?: (phrase: string) => void | Promise<void>
}) {
  const voice = useStickyVoiceInput({
    composerValue: value,
    onChange,
    cefrLevel: voiceCefrLevel,
    scenarioHint: voiceScenarioHint,
    threadId: voiceThreadId,
    scenarioId: voiceScenarioId,
    voiceReferencePhrase: voiceReferencePhrase,
    voiceAssessmentMode: voiceAssessmentMode,
    voiceGuidedStarters: voiceGuidedStarters,
  })

  const shadowPlaybackAbortRef = useRef<AbortController | null>(null)
  const shadowAudioElRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (voice.phase !== 'shadow_listen' || !voice.shadowListenText?.trim()) return
    const text = voice.shadowListenText.trim()
    shadowPlaybackAbortRef.current?.abort()
    const ac = new AbortController()
    shadowPlaybackAbortRef.current = ac
    let cancelled = false

    void (async () => {
      try {
        if (getApiBaseUrl()) {
          const res = await getSpeakingReferenceAudio({ text, speed: 'normal', locale: 'nl-NL' }, { signal: ac.signal })
          if (cancelled || ac.signal.aborted) return
          if (res.url) {
            await new Promise<void>((resolve, reject) => {
              const el = new Audio(res.url!)
              shadowAudioElRef.current = el
              el.onended = () => resolve()
              el.onerror = () => reject(new Error('Reference playback failed.'))
              void el.play().catch(reject)
            })
          } else if (res.useBrowserTts) {
            await speakBrowserNlReference(text)
          }
        } else {
          await speakBrowserNlReference(text)
        }
        if (cancelled || ac.signal.aborted) return
        await new Promise((r) => setTimeout(r, 450))
        if (cancelled || ac.signal.aborted) return
        await voice.completeShadowListenAndArmRecording()
      } catch {
        if (!cancelled && !ac.signal.aborted) {
          voice.cancelShadowPractice()
        }
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
      const el = shadowAudioElRef.current
      if (el) {
        el.pause()
        el.removeAttribute('src')
        el.load()
        shadowAudioElRef.current = null
      }
      try {
        window.speechSynthesis?.cancel()
      } catch {
        /* ignore */
      }
    }
  }, [voice.phase, voice.shadowListenText, voice.completeShadowListenAndArmRecording, voice.cancelShadowPractice])

  useEffect(() => {
    if (!voiceEnabled) voice.cancelVoice()
    // `voice` is a new object every render — depend on stable `cancelVoice` only.
  }, [voiceEnabled, voice.cancelVoice])

  const micBusy = voice.phase === 'recording' || voice.phase === 'processing' || voice.phase === 'shadow_listen'
  const micDisabled = Boolean(
    disabled || sending || !voiceEnabled || voice.phase === 'review' || voice.phase === 'shadow_listen'
  )

  const handleSend = () => {
    if (disabled || !value.trim() || sending) return
    const sendPayload = voice.consumeInputMetaForSend()
    onSend(sendPayload)
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 max-w-lg mx-auto w-full pointer-events-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      <div
        className={clsx(
          'pointer-events-auto mx-3 mb-[calc(3.5rem+env(safe-area-inset-bottom))] rounded-2xl border border-slate-200/90',
          'bg-surface-elevated/95 backdrop-blur-md shadow-[0_-10px_40px_-12px_rgba(15,23,42,0.18)]',
          'flex flex-col min-h-0 p-2.5',
          /* Cap height so tall voice feedback scrolls; reserve bottom tab bar + safe area */
          'max-h-[calc(100dvh-4.25rem-env(safe-area-inset-bottom)-3.5rem)]'
        )}
      >
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
        <SuggestionChips suggestions={suggestions} onPick={onPickSuggestion} disabled={disabled} />
        {endAndReview?.visible ? (
          <div className="mb-2 flex justify-center">
            <button
              type="button"
              disabled={endAndReview.disabled}
              onClick={endAndReview.onPress}
              className={clsx(
                'min-h-[2.75rem] px-4 rounded-full border border-slate-200/90 bg-white/90 text-caption font-semibold text-ink-primary',
                'shadow-sm hover:bg-slate-50 hover:border-slate-300/90 transition-colors',
                'disabled:opacity-40 disabled:pointer-events-none'
              )}
            >
              {endAndReview.label ?? 'End & review'}
            </button>
          </div>
        ) : null}

        {voice.phase === 'review' ? (
          <div
            className="mb-2 rounded-xl border border-primary-200/80 bg-primary-50/40 px-3 py-2.5 space-y-2"
            role="region"
            aria-label="Transcript review"
          >
            <p className="text-caption font-semibold text-primary-900">Review transcript</p>
            <p className="text-caption text-ink-secondary leading-snug">
              Edit your Dutch above if needed, then tap Send. Nothing is posted until you confirm.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => voice.discardTranscriptReview()}
                className="min-h-touch inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-caption font-semibold text-ink-secondary"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => voice.reRecord()}
                className="min-h-touch inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-white px-2.5 text-caption font-semibold text-primary-900"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                Re-record
              </button>
            </div>
          </div>
        ) : null}

        {voice.phase === 'review' && voice.transcriptEvalError ? (
          <div className="mb-2 rounded-xl border border-red-300/90 bg-red-50/90 px-3 py-2.5 text-caption text-red-950">
            <p className="font-semibold text-body-sm">Transcript coach failed</p>
            <p className="mt-1 leading-snug">{voice.transcriptEvalError}</p>
          </div>
        ) : null}
        {voice.phase === 'review' &&
        voice.audioAssessment.status === 'ready' &&
        !voice.audioAssessment.payload.assessment ? (
          <div className="mb-2 rounded-xl border border-red-300/90 bg-red-50/90 px-3 py-2.5 text-caption text-red-950">
            <p className="font-semibold text-body-sm">Voice pronunciation scoring unavailable</p>
            <p className="mt-1 leading-snug">
              {voice.audioAssessment.payload.caveats.length > 0
                ? voice.audioAssessment.payload.caveats.join(' ')
                : 'The service returned no assessment for this clip. If you are the developer, check pronunciation settings and speech credentials on the server.'}
            </p>
          </div>
        ) : null}
        {voice.phase === 'review' && voice.audioAssessment.status === 'loading' ? (
          <div className="mb-2 rounded-xl border border-violet-200/70 bg-violet-50/40 px-3 py-2 text-caption text-ink-secondary">
            Checking pronunciation from your recording…
          </div>
        ) : null}
        {voice.phase === 'review' && voice.audioAssessment.status === 'error' ? (
          <div className="mb-2 rounded-xl border border-red-300/90 bg-red-50/90 px-3 py-2.5 text-caption text-red-950">
            <p className="font-semibold text-body-sm">Voice scoring request failed</p>
            <p className="mt-1 leading-snug">{voice.audioAssessment.message}</p>
          </div>
        ) : null}
        {voice.phase === 'review' && voice.audioAssessment.status === 'ready' ? (
          <VoiceQualityFeedbackCard
            payload={voice.audioAssessment.payload}
            spokenTranscript={voice.lastSpokenTranscript}
            userRecordingUrl={voice.userRecordingUrl}
            compareCoachingText={
              (voiceReferencePhrase?.trim() || value.trim() || voice.lastSpokenTranscript || '').trim() || undefined
            }
            onDismiss={voice.dismissPronunciationFeedback}
            onAfterPhraseApplied={voice.closeCoachOverlay}
            onApplyPhraseToComposer={voiceOnApplyPhrase ?? ((phrase) => onChange(phrase))}
            onSavePhrase={voiceOnSavePhrase}
            onQueuePhraseAssessment={voice.queueReferenceOnlyAssessment}
            onBeginShadowPractice={voice.beginShadowPractice}
          />
        ) : null}
        {voice.pronunciationFeedback ? (
          <PronunciationFeedbackCard
            feedback={voice.pronunciationFeedback}
            spokenTranscript={voice.lastSpokenTranscript}
            userRecordingUrl={voice.userRecordingUrl}
            onDismiss={voice.dismissPronunciationFeedback}
          />
        ) : null}

        {voiceEnabled && (voice.phase !== 'idle' || voice.voiceError) && voice.phase !== 'review' ? (
          <div
            className="mb-2 rounded-xl border border-slate-200/80 bg-surface-muted/40 px-3 py-2 space-y-2"
            role="region"
            aria-label="Voice input"
          >
            {voice.phase === 'shadow_listen' ? (
              <div className="space-y-2">
                <p className="text-caption font-semibold text-primary-900">Shadow practice</p>
                <p className="text-caption text-ink-secondary leading-snug">
                  Listen to the reference chunk, then your mic opens automatically so you can repeat it.
                </p>
                <button
                  type="button"
                  onClick={() => voice.cancelShadowPractice()}
                  className="min-h-touch inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-caption font-semibold text-ink-secondary"
                >
                  Cancel shadow
                </button>
              </div>
            ) : null}
            {voice.phase === 'recording' ? (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <span className="text-caption font-bold text-red-800 tabular-nums">{voice.secondsLabel}</span>
                  <span className="text-caption text-ink-secondary truncate">Recording…</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void voice.stopListening()}
                    className="min-h-touch min-w-touch rounded-lg bg-red-600 text-white flex items-center justify-center px-2"
                    aria-label="Stop and transcribe"
                    title="Stop"
                  >
                    <Square className="w-4 h-4 fill-current" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={voice.cancelVoice}
                    className="min-h-touch px-2 rounded-lg border border-slate-200 bg-white text-caption font-semibold text-ink-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            {voice.phase === 'processing' ? (
              <div className="flex items-center gap-2 text-caption text-ink-secondary">
                <Loader2 className="w-4 h-4 motion-safe:animate-spin shrink-0" aria-hidden />
                <span>Turning speech into text…</span>
              </div>
            ) : null}
            {voice.livePreview && voice.phase === 'recording' ? (
              <p className="text-body-sm text-ink-primary leading-snug border-t border-slate-200/60 pt-2">
                {voice.livePreview}
              </p>
            ) : null}
            {voice.voiceError ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-amber-200/60 pt-2">
                <p className="text-caption text-amber-950 leading-snug">{voice.voiceError}</p>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={voice.reRecord}
                    className="min-h-touch inline-flex items-center gap-1 rounded-lg border border-amber-300/80 bg-amber-50 px-2.5 text-caption font-semibold text-amber-950"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                    Re-record
                  </button>
                  <button
                    type="button"
                    onClick={() => voice.cancelVoice()}
                    className="min-h-touch inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-caption font-semibold text-ink-secondary"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden />
                    Dismiss
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        </div>

        <div className="shrink-0 pt-2 mt-1 border-t border-slate-200/80">
        <div className="flex flex-row gap-2 items-end w-full min-w-0">
          {voiceEnabled ? (
            <button
              type="button"
              disabled={micDisabled || micBusy}
              onClick={() => void voice.startListening()}
              className={clsx(micButtonClass, (micDisabled || micBusy) && 'opacity-40 pointer-events-none')}
              aria-label="Speak in Dutch"
              title="Speak in Dutch"
            >
              <Mic className="w-5 h-5 shrink-0" aria-hidden />
            </button>
          ) : null}
          <label className="flex-1 min-w-0 basis-0 min-h-0 block">
            <span className="sr-only">Message in Dutch</span>
            <textarea
              rows={2}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (!disabled && value.trim()) handleSend()
                }
              }}
              placeholder={placeholder ?? 'Type your reply in Dutch…'}
              className={clsx(
                'box-border block w-full min-w-0 max-w-full resize-none rounded-xl border border-slate-200 bg-white',
                'px-3 py-2.5 text-body-sm text-ink-primary placeholder:text-ink-tertiary',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500',
                'min-h-[52px] max-h-28 leading-normal'
              )}
            />
          </label>
          <button
            type="button"
            disabled={disabled || !value.trim() || sending}
            onClick={handleSend}
            className={clsx(
              sendButtonClass,
              'disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed',
              sending && 'motion-safe:ring-2 motion-safe:ring-primary-300/50'
            )}
            aria-label="Send message"
            aria-busy={sending}
          >
            {sending ? (
              <Loader2 className="w-5 h-5 shrink-0 motion-safe:animate-spin" aria-hidden />
            ) : (
              <SendHorizontal className="w-5 h-5 shrink-0" aria-hidden />
            )}
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
