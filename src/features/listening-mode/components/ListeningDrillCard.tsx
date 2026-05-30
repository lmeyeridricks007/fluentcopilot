'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Gauge, Headphones, HelpCircle, Mic, ScrollText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ListeningClip } from '@/lib/listening-mode/schema'
import type { ListeningAnswerSurface } from '@/lib/listening-mode/listeningDrillInteractionModel'
import {
  drillAnswerOptions,
  drillCoachRevealText,
  drillPrimaryPrompt,
} from '@/lib/listening-mode/listeningDrillPayloadBuilders'
import type { ListeningDrillPayload } from '@/lib/listening-mode/listeningDrillPayloadTypes'
import { bestOptionMatchIndex } from '@/lib/listening-mode/listeningAnswerMatch'

function speechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type ListeningDrillLockInPayload =
  | { surface: 'tap'; selectedIndex: number }
  | { surface: 'typed'; text: string }
  | { surface: 'spoken'; text: string }

type Props = {
  clip: ListeningClip
  payload: ListeningDrillPayload
  isLast: boolean
  busy: boolean
  submitted: boolean
  correct: boolean | null
  selected: number | null
  showTranscript: boolean
  showMeaning: boolean
  /** Transcript visible before lock-in only via explicit help. */
  transcriptPeekBeforeAnswer: boolean
  onPlay: () => void
  onPlaySlow: () => void
  onPick: (i: number | null) => void
  onLockIn: (p: ListeningDrillLockInPayload) => void
  onToggleTranscript: () => void
  onToggleMeaning: () => void
  onRequestTranscriptHelp: () => void
  onNext: () => void
  /** After first lock-in — unlock slower replay. */
  canSlowReplay: boolean
  /** After lock-in — optional reveal controls (transcript may already be on from help). */
  canReveal: boolean
}

export function ListeningDrillCard({
  clip,
  payload,
  isLast,
  busy,
  submitted,
  correct,
  selected,
  showTranscript,
  showMeaning,
  transcriptPeekBeforeAnswer,
  onPlay,
  onPlaySlow,
  onPick,
  onLockIn,
  onToggleTranscript,
  onToggleMeaning,
  onRequestTranscriptHelp,
  onNext,
  canSlowReplay,
  canReveal,
}: Props) {
  const [surface, setSurface] = useState<ListeningAnswerSurface>('tap')
  const [typed, setTyped] = useState('')
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const recRef = useRef<SpeechRecognition | null>(null)

  const options = useMemo(() => drillAnswerOptions(payload), [payload])
  const headline = drillPrimaryPrompt(payload)
  const listenHint = payload.kind === 'listen_respond' ? payload.whatYouShouldSayNextEn : null
  const canSpeak = typeof window !== 'undefined' && Boolean(speechRecognitionCtor())

  useEffect(() => {
    setSurface('tap')
    setTyped('')
    setVoiceError(null)
    setVoiceBusy(false)
    try {
      recRef.current?.stop()
    } catch {
      /* noop */
    }
    recRef.current = null
  }, [clip.id])

  const typedMatchIndex = useMemo(() => bestOptionMatchIndex(options, typed), [options, typed])

  const onVoiceAnswer = useCallback(() => {
    const Ctor = speechRecognitionCtor()
    if (!Ctor || submitted) return
    setVoiceError(null)
    setVoiceBusy(true)
    try {
      const rec = new Ctor()
      rec.lang = 'nl-NL'
      rec.interimResults = false
      rec.maxAlternatives = 1
      rec.onerror = () => {
        setVoiceBusy(false)
        setVoiceError('Voice capture did not work — try Type or Tap.')
      }
      rec.onend = () => {
        setVoiceBusy(false)
      }
      rec.onresult = (ev: SpeechRecognitionEvent) => {
        const text = ev.results[0]?.[0]?.transcript ?? ''
        setTyped(text.trim())
        const ix = bestOptionMatchIndex(options, text)
        if (ix != null) onPick(ix)
        setVoiceBusy(false)
      }
      recRef.current = rec
      rec.start()
    } catch {
      setVoiceBusy(false)
      setVoiceError('Microphone not available in this browser.')
    }
  }, [submitted, options, onPick])

  useEffect(() => {
    if (submitted || surface !== 'typed') return
    if (typedMatchIndex != null) onPick(typedMatchIndex)
    else onPick(null)
  }, [surface, typedMatchIndex, submitted, onPick])

  const lockDisabled =
    submitted ||
    (surface === 'tap' && selected == null) ||
    (surface === 'typed' && !typed.trim()) ||
    (surface === 'spoken' && selected == null && !typed.trim())

  const onLockInClick = () => {
    if (submitted) return
    if (surface === 'tap' && selected != null) onLockIn({ surface: 'tap', selectedIndex: selected })
    else if (surface === 'typed') onLockIn({ surface: 'typed', text: typed })
    else if (surface === 'spoken') {
      const text = typed.trim()
      if (selected != null) onLockIn({ surface: 'spoken', text: options[selected]?.label ?? text })
      else if (text) onLockIn({ surface: 'spoken', text })
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-[1.35rem] border border-slate-200/70 bg-gradient-to-b from-white via-white to-slate-50/40 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/[0.03]">
      <div className="border-b border-slate-100/90 bg-slate-50/40 px-5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Scenario</p>
        <p className="mt-0.5 text-body-sm font-medium text-slate-800">{payload.scenarioLabel}</p>
      </div>

      <div className="px-5 pb-6 pt-5">
        <h2 className="text-[1.15rem] font-semibold leading-snug tracking-tight text-slate-900 sm:text-lg">{headline}</h2>

        {!submitted &&
        (listenHint ||
          (payload.kind === 'gist' && payload.playbackCoachNoteEn) ||
          payload.kind === 'fast_speech' ||
          payload.kind === 'personalized_focus') ? (
          <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-body-sm text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700 outline-none">Optional tip</summary>
            {listenHint ? <p className="mt-2 leading-relaxed">{listenHint}</p> : null}
            {payload.kind === 'gist' && payload.playbackCoachNoteEn ? (
              <p className="mt-2 leading-relaxed">{payload.playbackCoachNoteEn}</p>
            ) : null}
            {payload.kind === 'fast_speech' ? (
              <p className="mt-2 leading-relaxed text-slate-600">
                <span className="font-medium text-slate-800">Ear target:</span> {payload.target.promptEn}
              </p>
            ) : null}
            {payload.kind === 'personalized_focus' ? (
              <div className="mt-2 space-y-1 leading-relaxed">
                <p className="font-medium text-violet-950">Focus · {payload.weaknessTarget.label}</p>
                <p>{payload.reasonThisSurfacedEn}</p>
                <p className="text-caption text-violet-900/90">
                  Next: <span className="font-semibold">{payload.nextLoopRecommendation.title}</span> —{' '}
                  {payload.nextLoopRecommendation.rationale}
                </p>
              </div>
            ) : null}
          </details>
        ) : null}

        {/* Audio-first */}
        <div className="mt-6 flex flex-col items-center">
          <button
            type="button"
            disabled={busy}
            onClick={onPlay}
            className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg shadow-teal-900/20 ring-4 ring-teal-100/90 transition hover:bg-teal-800 hover:ring-teal-200 disabled:opacity-60"
            aria-label={busy ? 'Playing' : 'Play Dutch audio'}
          >
            <Headphones className="h-8 w-8" aria-hidden />
          </button>
          <p className="mt-3 text-center text-caption text-slate-500">
            {busy ? 'Playing…' : 'Tap when you are ready — audio stays central.'}
          </p>
          {canSlowReplay ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-slate-700"
                disabled={busy}
                onClick={onPlay}
              >
                Replay
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-slate-700"
                disabled={busy}
                onClick={onPlaySlow}
              >
                <Gauge className="h-4 w-4" aria-hidden />
                Slower
              </Button>
            </div>
          ) : null}
        </div>

        {!submitted ? (
          <div className="mt-6">
            <p className="text-center text-caption font-medium uppercase tracking-[0.12em] text-slate-400">Answer</p>
            <div className="mt-2 flex justify-center gap-1 rounded-xl bg-slate-100/90 p-1">
              {(['tap', 'typed', 'spoken'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={s === 'spoken' && !canSpeak}
                  onClick={() => setSurface(s)}
                  className={`min-h-touch flex-1 rounded-lg px-2 text-caption font-semibold capitalize transition sm:flex-none sm:px-4 ${
                    surface === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  } ${s === 'spoken' && !canSpeak ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  {s === 'spoken' ? 'Speak' : s}
                </button>
              ))}
            </div>

            {surface === 'tap' ? (
              <ul className="mt-4 space-y-2">
                {options.map((opt, i) => {
                  const isSel = selected === i
                  return (
                    <li key={opt.id}>
                      <button
                        type="button"
                        onClick={() => onPick(i)}
                        className={`w-full min-h-touch rounded-xl border px-4 py-3.5 text-left text-body font-medium transition ${
                          isSel
                            ? 'border-teal-500/90 bg-teal-50/60 text-slate-900'
                            : 'border-slate-200/90 bg-white text-slate-800 hover:border-teal-200/80'
                        }`}
                      >
                        {opt.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}

            {surface === 'typed' ? (
              <div className="mt-4">
                <label htmlFor="listening-typed-answer" className="sr-only">
                  Type your answer
                </label>
                <textarea
                  id="listening-typed-answer"
                  rows={3}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="Type what you would say or heard…"
                  className="w-full resize-none rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-body text-slate-900 shadow-inner outline-none ring-teal-500/30 focus:border-teal-300 focus:ring-2"
                  autoComplete="off"
                  spellCheck={false}
                />
                {typed.trim() && typedMatchIndex == null ? (
                  <p className="mt-2 text-caption text-amber-800/90">No close match yet — you can still lock in.</p>
                ) : null}
                {typed.trim() && typedMatchIndex != null ? (
                  <p className="mt-2 text-caption text-teal-800/90">Closest option highlighted — tap Lock in.</p>
                ) : null}
              </div>
            ) : null}

            {surface === 'spoken' ? (
              <div className="mt-4 space-y-3 text-center">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canSpeak || voiceBusy || submitted}
                  className="gap-2"
                  onClick={() => void onVoiceAnswer()}
                >
                  <Mic className="h-4 w-4" aria-hidden />
                  {voiceBusy ? 'Listening…' : 'Speak answer'}
                </Button>
                {voiceError ? <p className="text-caption text-rose-700">{voiceError}</p> : null}
                {typed ? <p className="text-body-sm text-slate-600">Heard: “{typed}”</p> : null}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col items-stretch gap-3 sm:items-center">
              <Button
                type="button"
                className="w-full min-h-touch rounded-xl text-body font-semibold sm:max-w-xs"
                disabled={lockDisabled}
                onClick={onLockInClick}
              >
                Lock in answer
              </Button>
              {!showTranscript ? (
                <button
                  type="button"
                  onClick={onRequestTranscriptHelp}
                  className="inline-flex min-h-touch items-center justify-center gap-2 self-center text-caption font-semibold text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
                >
                  <HelpCircle className="h-4 w-4 shrink-0" aria-hidden />
                  Stuck? Show Dutch text
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onToggleTranscript}
                  className="self-center text-caption font-semibold text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
                >
                  Hide Dutch text
                </button>
              )}
            </div>
            {!submitted && showTranscript ? (
              <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-body leading-relaxed text-slate-900 ring-1 ring-slate-200/80">
                {clip.transcriptNl}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-8 space-y-4 border-t border-slate-100 pt-6">
            <p
              className={`text-center text-body font-semibold ${correct ? 'text-emerald-800' : 'text-slate-800'}`}
              role="status"
            >
              {correct ? 'That matches what you heard — well done.' : 'Not quite — replay slower, then peek once if useful.'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" variant="secondary" size="sm" className="gap-1.5" disabled={busy} onClick={onPlay}>
                <Headphones className="h-4 w-4" aria-hidden />
                Replay
              </Button>
              {canSlowReplay ? (
                <Button type="button" variant="secondary" size="sm" className="gap-1.5" disabled={busy} onClick={onPlaySlow}>
                  <Gauge className="h-4 w-4" aria-hidden />
                  Slower
                </Button>
              ) : null}
            </div>
            {canReveal ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={onToggleTranscript}>
                  <ScrollText className="h-4 w-4" aria-hidden />
                  {showTranscript ? 'Hide' : 'Show'} transcript
                </Button>
                <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={onToggleMeaning}>
                  <Sparkles className="h-4 w-4" aria-hidden />
                  What it meant
                </Button>
              </div>
            ) : null}
            {showTranscript ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-body leading-relaxed text-slate-900 ring-1 ring-slate-200/80">
                {clip.transcriptNl}
              </p>
            ) : null}
            {showMeaning ? (
              <p className="text-center text-body-sm leading-relaxed text-slate-600">{drillCoachRevealText(payload)}</p>
            ) : null}
            <Button type="button" className="mx-auto w-full min-h-touch max-w-sm rounded-xl text-body font-semibold" onClick={onNext}>
              {isLast ? 'View coach recap' : 'Continue'}
            </Button>
          </div>
        )}

        {submitted && transcriptPeekBeforeAnswer ? (
          <p className="mt-4 text-center text-caption text-slate-400">You used on-screen Dutch before locking in — that is fine when you need it.</p>
        ) : null}
      </div>
    </section>
  )
}
