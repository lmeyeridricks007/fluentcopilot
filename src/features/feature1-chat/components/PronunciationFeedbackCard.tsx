'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Volume2, X } from 'lucide-react'
import { clsx } from 'clsx'
import type { PronunciationFeedback } from '@/lib/speech/pronunciationTypes'
import { chatAudioManager } from '@/lib/audio/chatAudioManager'
import { requestGenerateSpeech } from '@/lib/audio/audioClient'
import { ensureVoices, speakWithBrowserTts, stopBrowserSpeech } from '@/lib/audio/browserSpeechPlayback'
import { shouldAttemptOpenAiTts } from '@/lib/api/apiConfig'

function HighlightedTranscript({ text, highlights }: { text: string; highlights: string[] }) {
  const hl = new Set(highlights.map((w) => w.toLowerCase().trim()).filter(Boolean))
  if (!text || hl.size === 0) {
    return <span className="text-body-sm text-ink-primary">{text}</span>
  }
  const parts = text.split(/(\s+)/)
  return (
    <span className="text-body-sm text-ink-primary leading-relaxed">
      {parts.map((part, i) => {
        if (/^\s+$/.test(part)) {
          return <span key={i}>{part}</span>
        }
        const stripped = part.replace(/^['"([{]+|['"\])}.,;:!?]+$/g, '')
        const hit =
          hl.has(part.toLowerCase()) ||
          hl.has(stripped.toLowerCase()) ||
          hl.has(part.replace(/^[.,;:!?'"()-]+|[.,;:!?'"()-]+$/g, '').toLowerCase())
        if (hit) {
          return (
            <mark key={i} className="bg-amber-200/90 text-ink-primary rounded px-0.5 font-medium">
              {part}
            </mark>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

export function PronunciationFeedbackCard({
  feedback,
  spokenTranscript,
  userRecordingUrl,
  onDismiss,
}: {
  feedback: PronunciationFeedback
  spokenTranscript: string
  userRecordingUrl: string | null
  onDismiss: () => void
}) {
  const exampleLine =
    feedback.exampleBetterSentence.trim() || feedback.suggestedCorrection.trim() || ''

  const [exampleAudioUrl, setExampleAudioUrl] = useState<string | null>(null)
  const [exampleAudioLoading, setExampleAudioLoading] = useState(false)
  const [exampleTtsError, setExampleTtsError] = useState<string | null>(null)

  useEffect(() => {
    if (!exampleLine) {
      setExampleAudioUrl(null)
      setExampleAudioLoading(false)
      setExampleTtsError(null)
      return
    }
    if (!shouldAttemptOpenAiTts()) {
      setExampleAudioUrl(null)
      setExampleAudioLoading(false)
      setExampleTtsError(null)
      return
    }
    let cancelled = false
    setExampleAudioLoading(true)
    setExampleAudioUrl(null)
    setExampleTtsError(null)
    void requestGenerateSpeech({ text: exampleLine, language: 'nl-NL' }, {})
      .then((res) => {
        if (!cancelled) setExampleAudioUrl(res.audioUrl)
      })
      .catch((e) => {
        if (!cancelled) {
          setExampleAudioUrl(null)
          setExampleTtsError(
            e instanceof Error ? e.message : 'Could not load example audio from the server.'
          )
        }
      })
      .finally(() => {
        if (!cancelled) setExampleAudioLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [exampleLine])

  const playExample = useCallback(() => {
    if (!exampleLine) return
    chatAudioManager.stop()
    stopBrowserSpeech()
    void ensureVoices()
    speakWithBrowserTts(exampleLine, {
      onend: () => {},
      onerror: () => {},
    })
  }, [exampleLine])

  const good = feedback.overallTone === 'sounds_good'

  return (
    <div
      className={clsx(
        'mb-2 rounded-xl border px-3 py-3 shadow-sm',
        good ? 'border-emerald-200/90 bg-emerald-50/50' : 'border-primary-200/80 bg-primary-50/40'
      )}
      role="region"
      aria-label="Pronunciation feedback"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">Wording coach</p>
          <p className={clsx('text-body-sm font-bold mt-0.5', good ? 'text-emerald-900' : 'text-primary-900')}>
            {good ? 'Sounds good (from text)' : 'Improve this (from text)'}
          </p>
          <p className="text-[10px] text-ink-tertiary mt-0.5 leading-snug">
            Based on the transcript only — not how your voice scored on the recording.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 min-h-touch min-w-touch rounded-lg flex items-center justify-center text-ink-tertiary hover:bg-white/80"
          aria-label="Dismiss feedback"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {(['pronunciation', 'fluency', 'clarity'] as const).map((k) => {
          const label = k === 'pronunciation' ? 'Pronunciation' : k === 'fluency' ? 'Fluency' : 'Clarity'
          const v =
            k === 'pronunciation'
              ? feedback.pronunciationScore
              : k === 'fluency'
                ? feedback.fluencyScore
                : feedback.clarityScore
          return (
            <span
              key={k}
              className="inline-flex items-center gap-1 rounded-full bg-white/90 border border-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-ink-secondary"
            >
              {label} <span className="text-ink-primary tabular-nums">{v}/5</span>
            </span>
          )
        })}
      </div>

      <p className="text-caption text-ink-secondary mt-2 leading-snug">{feedback.shortSummary}</p>

      {spokenTranscript ? (
        <div className="mt-2 rounded-lg bg-white/70 border border-slate-200/60 px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary mb-1">Transcript</p>
          <HighlightedTranscript text={spokenTranscript} highlights={feedback.highlightWords} />
        </div>
      ) : null}

      {feedback.keyIssues.length > 0 ? (
        <ul className="mt-2 list-disc pl-4 space-y-0.5 text-caption text-ink-primary">
          {feedback.keyIssues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}

      {feedback.suggestedCorrection.trim() ? (
        <div className="mt-2 rounded-lg border border-slate-200/70 bg-white/80 px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">Suggested</p>
          <p className="text-body-sm text-ink-primary mt-0.5">{feedback.suggestedCorrection}</p>
        </div>
      ) : null}

      {feedback.exampleBetterSentence.trim() ? (
        <div className="mt-2 rounded-lg border border-primary-200/50 bg-white/90 px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary-900/80">Example</p>
          <p className="text-body-sm font-medium text-ink-primary mt-0.5">{feedback.exampleBetterSentence}</p>
        </div>
      ) : null}

      <p className="text-caption text-ink-secondary mt-2 italic">{feedback.encouragement}</p>

      <div className="mt-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
          Compare playback
        </p>
        {!userRecordingUrl ? (
          <p className="text-caption text-amber-900/90 leading-snug">
            No saved mic clip for this line — the app only keeps your take when recording uses server capture (the same
            path as voice scoring). Allow the microphone and use the in-app recorder; avoid browser-only speech mode if
            you need playback here.
          </p>
        ) : null}
        <div
          className={clsx(
            'grid gap-3',
            userRecordingUrl && exampleLine ? 'sm:grid-cols-2' : 'grid-cols-1'
          )}
        >
          {userRecordingUrl ? (
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
                Your recording
              </span>
              <audio src={userRecordingUrl} controls className="w-full h-9" />
            </div>
          ) : null}
          {exampleLine ? (
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
                Model (same TTS as chat)
              </span>
              {exampleAudioLoading ? (
                <div className="flex items-center gap-2 text-caption text-ink-secondary py-1">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
                  Loading example audio…
                </div>
              ) : exampleAudioUrl ? (
                <audio src={exampleAudioUrl} controls className="w-full h-9" />
              ) : exampleTtsError ? (
                <p className="text-caption text-red-800 leading-snug">{exampleTtsError}</p>
              ) : (
                <button
                  type="button"
                  onClick={playExample}
                  className="inline-flex items-center justify-center gap-1.5 min-h-touch rounded-xl border border-primary-200 bg-white px-3 text-caption font-semibold text-primary-900 hover:bg-primary-50 w-full sm:w-auto"
                >
                  <Volume2 className="w-4 h-4 shrink-0" aria-hidden />
                  Hear example (browser voice)
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
