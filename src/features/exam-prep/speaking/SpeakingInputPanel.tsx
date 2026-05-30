'use client'

import { useEffect, useState } from 'react'
import { Mic, MicOff, PenLine, SendHorizontal } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { useNlSpeechRecognition } from '@/hooks/useNlSpeechRecognition'
import type { SpeakingInputMode } from '@/lib/exam-prep/speaking/types'

type Tab = 'voice' | 'type'

export function SpeakingInputPanel({
  sessionKey,
  onSubmit,
  error,
  onDismissError,
}: {
  sessionKey: string
  onSubmit: (payload: { text: string; inputMode: SpeakingInputMode; transcriptConfidence?: number }) => void
  error: string | null
  onDismissError: () => void
}) {
  const [tab, setTab] = useState<Tab>('voice')
  const [typed, setTyped] = useState('')
  const { supported, listening, interim, transcript, setTranscript, error: speechErr, start, stop, reset, avgConfidence } =
    useNlSpeechRecognition()

  useEffect(() => {
    setTyped('')
    reset()
    setTab(supported ? 'voice' : 'type')
  }, [sessionKey, reset, supported])

  useEffect(() => {
    if (!supported && tab === 'voice') setTab('type')
  }, [supported, tab])

  const effectiveText = tab === 'type' ? typed : transcript
  const canSubmit = effectiveText.trim().length > 0

  return (
    <Card variant="outlined" padding="md" className="border-slate-200">
      <CardTitle className="text-body font-semibold text-ink-primary">Uw antwoord</CardTitle>
      <p className="text-body-sm text-ink-secondary mt-1 leading-snug">
        Spreek liever in — zo oefen je zoals op het examen. Typen blijft mogelijk als reserve.
      </p>

      <div className="mt-4 flex rounded-lg border border-slate-200 bg-slate-50/80 p-1">
        <button
          type="button"
          className={clsx(
            'flex-1 min-h-touch rounded-md text-body-sm font-semibold transition-colors',
            tab === 'voice' ? 'bg-white text-ink-primary shadow-sm' : 'text-ink-secondary'
          )}
          onClick={() => {
            setTab('voice')
            onDismissError()
          }}
          disabled={!supported}
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            <Mic className="w-4 h-4" aria-hidden />
            Spreken
          </span>
        </button>
        <button
          type="button"
          className={clsx(
            'flex-1 min-h-touch rounded-md text-body-sm font-semibold transition-colors',
            tab === 'type' ? 'bg-white text-ink-primary shadow-sm' : 'text-ink-secondary'
          )}
          onClick={() => {
            setTab('type')
            stop()
            onDismissError()
          }}
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            <PenLine className="w-4 h-4" aria-hidden />
            Typen
          </span>
        </button>
      </div>

      {!supported ? (
        <p className="mt-2 text-caption text-ink-tertiary">
          Spraakherkenning is niet beschikbaar in deze browser. Gebruik typen — dit telt volledig mee in training.
        </p>
      ) : null}

      {tab === 'voice' ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {!listening ? (
              <Button
                type="button"
                variant="secondary"
                className="min-h-touch inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                onClick={() => {
                  onDismissError()
                  start()
                }}
              >
                <Mic className="w-5 h-5 shrink-0" aria-hidden />
                Start opname
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="min-h-touch inline-flex items-center justify-center gap-2 w-full sm:w-auto border-error/30"
                onClick={() => stop()}
              >
                <MicOff className="w-5 h-5 shrink-0" aria-hidden />
                Stop opname
              </Button>
            )}
            <p className="text-body-sm text-ink-tertiary sm:flex-1 leading-snug">
              We luisteren in het Nederlands (nl-NL). Controleer het transcript en pas het aan als het niet klopt.
            </p>
          </div>
          {interim ? (
            <p className="text-body-sm text-ink-tertiary italic" aria-live="polite">
              {interim}
            </p>
          ) : null}
          {speechErr ? <p className="text-body-sm text-error">{speechErr}</p> : null}
          <label className="block">
            <span className="text-caption font-medium text-ink-secondary">Transcript (bewerkbaar)</span>
            <textarea
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value)
                onDismissError()
              }}
              rows={5}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-body text-ink-primary min-h-[120px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
              placeholder="Uw gesproken antwoord verschijnt hier…"
              autoComplete="off"
            />
          </label>
        </div>
      ) : (
        <div className="mt-4">
          <label className="block">
            <span className="text-caption font-medium text-ink-secondary">Typ uw antwoord in het Nederlands</span>
            <textarea
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value)
                onDismissError()
              }}
              rows={6}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-body text-ink-primary min-h-[140px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
              placeholder="Schrijf hier uw antwoord…"
              autoComplete="off"
            />
          </label>
        </div>
      )}

      {error ? <p className="mt-2 text-body-sm text-error">{error}</p> : null}

      <Button
        type="button"
        className="mt-5 w-full min-h-touch inline-flex items-center justify-center gap-2"
        disabled={!canSubmit}
        onClick={() => {
          const text = tab === 'type' ? typed.trim() : transcript.trim()
          const transcriptConfidence = tab === 'voice' ? avgConfidence() : undefined
          onSubmit({
            text,
            inputMode: tab === 'voice' ? 'voice' : 'type',
            transcriptConfidence,
          })
        }}
      >
        <SendHorizontal className="w-5 h-5 shrink-0" aria-hidden />
        Controleer antwoord
      </Button>
    </Card>
  )
}
