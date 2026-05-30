'use client'

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { Mic, MicOff, PenLine, SendHorizontal } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { useNlSpeechRecognition } from '@/hooks/useNlSpeechRecognition'
import type { SpeakingInputMode } from '@/lib/exam-prep/speaking/types'
import { useSpeakingAnswerDeadlineTimer } from '@/lib/exam-prep/speaking/speakingSimulationTimer'
import type { SpeakingExamDraftSnapshot } from '@/lib/exam-prep/speaking/speakingSimulationFlush'
import { track, ANALYTICS_EVENTS, trackInputModalitySwitched } from '@/lib/analytics'

type Tab = 'voice' | 'type'

export function SpeakingSimulationInputPanel({
  sessionKey,
  answerDeadlineMs,
  timerActive,
  onSubmit,
  speakingDraftRef,
  error,
  onDismissError,
}: {
  sessionKey: string
  /** Wall-clock deadline for this answer (min of per-vraag and whole-session budget). */
  answerDeadlineMs: number
  timerActive: boolean
  onSubmit: (payload: {
    text: string
    inputMode: SpeakingInputMode
    transcriptConfidence?: number
    timedOut: boolean
  }) => void
  speakingDraftRef?: MutableRefObject<SpeakingExamDraftSnapshot>
  error: string | null
  onDismissError: () => void
}) {
  const [tab, setTab] = useState<Tab>('voice')
  const [typed, setTyped] = useState('')
  const { supported, listening, interim, transcript, setTranscript, error: speechErr, start, stop, reset, avgConfidence } =
    useNlSpeechRecognition()
  const expiredRef = useRef(false)
  const onSubmitRef = useRef(onSubmit)
  const draftRef = useRef({ tab: 'voice' as Tab, typed: '', transcript: '' })
  const avgConfidenceRef = useRef(avgConfidence)

  useEffect(() => {
    onSubmitRef.current = onSubmit
  }, [onSubmit])
  useEffect(() => {
    avgConfidenceRef.current = avgConfidence
  }, [avgConfidence])
  useEffect(() => {
    draftRef.current = { tab, typed, transcript }
    if (speakingDraftRef) {
      const t = tab === 'type' ? typed.trim() : transcript.trim()
      speakingDraftRef.current = {
        text: t,
        inputMode: tab === 'voice' ? 'voice' : 'type',
        transcriptConfidence: tab === 'voice' ? avgConfidenceRef.current() : undefined,
      }
    }
  }, [tab, typed, transcript, speakingDraftRef])

  useEffect(() => {
    setTyped('')
    reset()
    expiredRef.current = false
    setTab(supported ? 'voice' : 'type')
  }, [sessionKey, reset, supported])

  useEffect(() => {
    if (!supported && tab === 'voice') setTab('type')
  }, [supported, tab])

  const effectiveText = tab === 'type' ? typed : transcript
  const canSubmitManual = effectiveText.trim().length > 0

  const handleExpire = useCallback(() => {
    if (expiredRef.current) return
    expiredRef.current = true
    const { tab: t, typed: ty, transcript: tr } = draftRef.current
    const text = t === 'type' ? ty.trim() : tr.trim()
    const transcriptConfidence = t === 'voice' ? avgConfidenceRef.current() : undefined
    onSubmitRef.current({
      text,
      inputMode: t === 'voice' ? 'voice' : 'type',
      transcriptConfidence,
      timedOut: true,
    })
  }, [])

  const remaining = useSpeakingAnswerDeadlineTimer({
    active: timerActive && answerDeadlineMs > 0,
    deadlineMs: answerDeadlineMs,
    onExpire: handleExpire,
  })

  return (
    <Card variant="outlined" padding="md" className="border-slate-300 bg-white">
      <CardTitle className="text-body font-semibold text-ink-primary">Antwoord</CardTitle>
      <p className="text-body-sm text-ink-secondary mt-1 leading-snug">
        Spreek in waar mogelijk. Typen alleen als de microfoon niet werkt.
      </p>
      <p className="text-caption text-ink-tertiary mt-2 tabular-nums" aria-live="polite">
        Resterend (examentijd): <span className="font-semibold text-ink-secondary">{remaining}s</span>
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
            if (tab === 'voice') {
              trackInputModalitySwitched({
                from: 'voice',
                to: 'type',
                surface: 'exam_speaking_simulation',
                context_id: sessionKey,
                module: 'speaking',
              })
            }
            if (tab !== 'type') {
              track(ANALYTICS_EVENTS.typing_mode_used, {
                surface: 'exam_speaking_simulation',
                context_id: sessionKey,
              })
            }
            setTab('type')
            stop()
            onDismissError()
          }}
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            <PenLine className="w-4 h-4" aria-hidden />
            Typen (reserve)
          </span>
        </button>
      </div>

      {!supported ? (
        <p className="mt-2 text-caption text-ink-tertiary">
          Spraakherkenning is hier niet beschikbaar. Gebruik typen — de simulatie gaat gewoon door.
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
              <Button type="button" variant="secondary" className="min-h-touch inline-flex items-center justify-center gap-2 w-full sm:w-auto" onClick={() => stop()}>
                <MicOff className="w-5 h-5 shrink-0" aria-hidden />
                Stop opname
              </Button>
            )}
            <p className="text-body-sm text-ink-tertiary sm:flex-1 leading-snug">
              Minimaal transcript; geen spellingcontrole-coach tijdens de simulatie.
            </p>
          </div>
          {interim ? (
            <p className="text-body-sm text-ink-tertiary italic" aria-live="polite">
              {interim}
            </p>
          ) : null}
          {speechErr ? <p className="text-body-sm text-error">{speechErr}</p> : null}
          <label className="block">
            <span className="text-caption font-medium text-ink-secondary">Transcript</span>
            <textarea
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value)
                onDismissError()
              }}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-body text-ink-primary min-h-[100px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
              placeholder="Uw antwoord…"
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
              rows={5}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-body text-ink-primary min-h-[120px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
              placeholder="Reserve: alleen gebruiken als spreken niet lukt."
              autoComplete="off"
            />
          </label>
        </div>
      )}

      {error ? <p className="mt-2 text-body-sm text-error">{error}</p> : null}

      <Button
        type="button"
        className="mt-5 w-full min-h-touch inline-flex items-center justify-center gap-2"
        disabled={!canSubmitManual || expiredRef.current}
        onClick={() => {
          if (expiredRef.current) return
          const text = tab === 'type' ? typed.trim() : transcript.trim()
          const transcriptConfidence = tab === 'voice' ? avgConfidence() : undefined
          onSubmit({
            text,
            inputMode: tab === 'voice' ? 'voice' : 'type',
            transcriptConfidence,
            timedOut: false,
          })
        }}
      >
        <SendHorizontal className="w-5 h-5 shrink-0" aria-hidden />
        Lever in
      </Button>
    </Card>
  )
}
