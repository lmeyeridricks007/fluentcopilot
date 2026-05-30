'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LessonStepContent } from './LessonStepContent'
import { extractDutchSnippetForTts } from './speakTextUtils'
import { useSpeechSynthesis } from './useSpeechSynthesis'
import type { FourSkillsKey } from './fourSkillsStepUtils'

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

const textareaClass =
  'w-full min-h-[104px] px-3 py-2 rounded-lg border border-slate-300 bg-surface-elevated text-body text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y'

type Props = {
  skill: FourSkillsKey
  body: string
  /** Changes when lesson step changes — clears local fields. */
  resetKey: string
}

export function FourSkillsSectionInteractive({ skill, body, resetKey }: Props) {
  const [listenNote, setListenNote] = useState('')
  const [readAnswer, setReadAnswer] = useState('')
  const [writeAnswer, setWriteAnswer] = useState('')
  const [speakTranscript, setSpeakTranscript] = useState('')
  const [speakInterim, setSpeakInterim] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const { speak } = useSpeechSynthesis()
  const [allowTts, setAllowTts] = useState(false)
  const recRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    setListenNote('')
    setReadAnswer('')
    setWriteAnswer('')
    setSpeakTranscript('')
    setSpeakInterim('')
    try {
      recRef.current?.stop()
    } catch {
      /* noop */
    }
    recRef.current = null
    setSpeaking(false)
  }, [resetKey])

  useEffect(() => {
    setAllowTts(typeof window !== 'undefined' && !!window.speechSynthesis)
    setSpeechSupported(!!getSpeechRecognitionCtor())
  }, [])

  const dutchForTts = extractDutchSnippetForTts(body)

  const stopSpeaking = useCallback(() => {
    try {
      recRef.current?.stop()
    } catch {
      /* noop */
    }
    recRef.current = null
    setSpeaking(false)
    setSpeakInterim('')
  }, [])

  const startSpeaking = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return
    setSpeakInterim('')
    const rec = new Ctor()
    recRef.current = rec
    rec.lang = 'nl-NL'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        const piece = res[0]?.transcript ?? ''
        if (res.isFinal) final += piece
        else interim += piece
      }
      if (final.trim()) {
        const add = final.trim()
        setSpeakTranscript((prev) => (prev ? `${prev} ${add}` : add))
      }
      setSpeakInterim(interim.trim())
    }
    rec.onerror = () => stopSpeaking()
    rec.onend = () => {
      setSpeaking(false)
      setSpeakInterim('')
      recRef.current = null
    }
    try {
      rec.start()
      setSpeaking(true)
    } catch {
      stopSpeaking()
    }
  }, [stopSpeaking])

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop()
      } catch {
        /* noop */
      }
    }
  }, [])

  if (skill === 'listening') {
    return (
      <div className="space-y-4 text-body text-ink-primary">
        <LessonStepContent text={body} />
        {dutchForTts ? (
          <div className="space-y-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto min-h-touch px-6 inline-flex items-center justify-center gap-2 text-body font-medium"
              disabled={!allowTts}
              onClick={() => speak(dutchForTts)}
            >
              <Volume2 className="w-5 h-5 shrink-0" aria-hidden />
              Play Dutch line (TTS)
            </Button>
            <p className="text-body-sm text-ink-tertiary">
              {allowTts
                ? 'Plays the main Dutch snippet from this task.'
                : 'Speech synthesis is not available in this browser.'}
            </p>
          </div>
        ) : null}
        <div>
          <label htmlFor={`four-l-${resetKey}`} className="block text-body-sm font-medium text-ink-primary mb-1.5">
            Your notes — what did you hear or understand?
          </label>
          <textarea
            id={`four-l-${resetKey}`}
            className={textareaClass}
            placeholder="Optional — keywords in Dutch or English."
            value={listenNote}
            onChange={(e) => setListenNote(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>
    )
  }

  if (skill === 'reading') {
    return (
      <div className="space-y-4 text-body text-ink-primary">
        <LessonStepContent text={body} />
        {dutchForTts ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto min-h-touch px-5 inline-flex items-center justify-center gap-2"
            disabled={!allowTts}
            onClick={() => speak(dutchForTts)}
          >
            <Volume2 className="w-5 h-5 shrink-0" aria-hidden />
            Hear the Dutch line again
          </Button>
        ) : null}
        <div>
          <label htmlFor={`four-r-${resetKey}`} className="block text-body-sm font-medium text-ink-primary mb-1.5">
            Your response
          </label>
          <textarea
            id={`four-r-${resetKey}`}
            className={textareaClass}
            placeholder="e.g. main idea in one English sentence, or your notes."
            value={readAnswer}
            onChange={(e) => setReadAnswer(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>
    )
  }

  if (skill === 'writing') {
    return (
      <div className="space-y-4 text-body text-ink-primary">
        <LessonStepContent text={body} />
        <div>
          <label htmlFor={`four-w-${resetKey}`} className="block text-body-sm font-medium text-ink-primary mb-1.5">
            Write here
          </label>
          <textarea
            id={`four-w-${resetKey}`}
            className={textareaClass}
            placeholder="Type your Dutch sentence in this box."
            value={writeAnswer}
            onChange={(e) => setWriteAnswer(e.target.value)}
            autoComplete="off"
            lang="nl"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 text-body text-ink-primary">
      <LessonStepContent text={body} />
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 space-y-3">
        <p className="text-body-sm font-medium text-ink-secondary">Speak practice</p>
        {speechSupported ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {!speaking ? (
              <Button
                type="button"
                variant="secondary"
                className="min-h-touch inline-flex items-center justify-center gap-2 px-5 w-full sm:w-auto"
                onClick={startSpeaking}
              >
                <Mic className="w-5 h-5 shrink-0" aria-hidden />
                Start microphone
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="min-h-touch inline-flex items-center justify-center gap-2 px-5 w-full sm:w-auto border-error/30"
                onClick={stopSpeaking}
              >
                <MicOff className="w-5 h-5 shrink-0" aria-hidden />
                Stop
              </Button>
            )}
            <p className="text-body-sm text-ink-tertiary sm:flex-1">
              Listens in Dutch (nl-NL). Edit the transcript if the browser misheard you.
            </p>
          </div>
        ) : (
          <p className="text-body-sm text-ink-tertiary">
            Microphone capture needs Web Speech API support (e.g. Chrome). Type what you said in the box below.
          </p>
        )}
        {speakInterim ? (
          <p className="text-body-sm text-ink-tertiary italic" aria-live="polite">
            {speakInterim}
          </p>
        ) : null}
        <div>
          <label htmlFor={`four-s-${resetKey}`} className="block text-body-sm font-medium text-ink-primary mb-1.5">
            What you said (or type it)
          </label>
          <textarea
            id={`four-s-${resetKey}`}
            className={textareaClass}
            placeholder="Transcript appears here while you speak, or type your sentence after practicing aloud."
            value={speakTranscript}
            onChange={(e) => setSpeakTranscript(e.target.value)}
            autoComplete="off"
            lang="nl"
          />
        </div>
      </div>
    </div>
  )
}
