'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Loader2, Mic, MicOff, PenLine, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { usePremiumStore } from '@/store/premiumStore'
import { useAuthStore } from '@/store/authStore'
import type { FreerEvaluationResult } from '@/lib/freerPracticeEvaluation'
import {
  AUTOSAVE_DEBOUNCE_TEXT_MS,
  AUTOSAVE_MIN_MEANINGFUL_TEXT_CHARS,
  freerPracticeTextDraftKey,
  parseFreerPracticeTextDraft,
  readAutosaveBody,
  removeAutosaveDraft,
  trackAutosaveRestored,
  writeAutosaveDraft,
} from '@/lib/autosave'

type Tab = 'typed' | 'spoken'

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export function isFreerPracticeStepTitle(title: string): boolean {
  const t = title.trim().toLowerCase()
  return t.includes('freer practice') || (t.includes('your turn') && t.includes('freer'))
}

type Props = {
  activityPrompt: string
  stepKey: string
}

export function FreerPracticePremiumPanel({ activityPrompt, stepKey }: Props) {
  const router = useRouter()
  const isPremium = usePremiumStore((s) => s.isPremium)
  const userId = useAuthStore((s) => s.user?.id ?? '')
  const [tab, setTab] = useState<Tab>('typed')
  const [draft, setDraft] = useState('')
  const [spokenTranscript, setSpokenTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FreerEvaluationResult | null>(null)
  const confidencesRef = useRef<number[]>([])
  const recRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    setSpeechSupported(!!getSpeechRecognitionCtor())
  }, [])

  useEffect(() => {
    if (!speechSupported && tab === 'spoken') setTab('typed')
  }, [speechSupported, tab])

  useLayoutEffect(() => {
    setInterim('')
    setResult(null)
    setError(null)
    setListening(false)
    confidencesRef.current = []
    try {
      recRef.current?.stop()
    } catch {
      /* noop */
    }
    recRef.current = null

    let restored = false
    if (userId) {
      const key = freerPracticeTextDraftKey(stepKey)
      const raw = readAutosaveBody(userId, key)
      const d = parseFreerPracticeTextDraft(raw)
      if (d?.stepKey === stepKey) {
        setTab(d.tab)
        setDraft(d.draft)
        setSpokenTranscript(d.spokenTranscript)
        restored = true
        trackAutosaveRestored('text_answer', stepKey)
      }
    }
    if (!restored) {
      setDraft('')
      setSpokenTranscript('')
      setTab('typed')
    }
  }, [stepKey, userId])

  const debounceFreerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!userId) return
    const key = freerPracticeTextDraftKey(stepKey)
    const combined = `${draft}${spokenTranscript}`.replace(/\s/g, '')
    if (debounceFreerRef.current) {
      clearTimeout(debounceFreerRef.current)
      debounceFreerRef.current = null
    }
    if (combined.length < AUTOSAVE_MIN_MEANINGFUL_TEXT_CHARS) return
    debounceFreerRef.current = setTimeout(() => {
      debounceFreerRef.current = null
      const c = `${draft}${spokenTranscript}`.replace(/\s/g, '')
      if (c.length < AUTOSAVE_MIN_MEANINGFUL_TEXT_CHARS) return
      const payload = {
        v: 1 as const,
        stepKey,
        tab,
        draft,
        spokenTranscript,
      }
      writeAutosaveDraft(userId, key, 'text_answer', stepKey, payload, { save_mode: 'debounced' })
    }, AUTOSAVE_DEBOUNCE_TEXT_MS)
    return () => {
      if (debounceFreerRef.current) {
        clearTimeout(debounceFreerRef.current)
        debounceFreerRef.current = null
      }
    }
  }, [userId, stepKey, tab, draft, spokenTranscript])

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop()
      } catch {
        /* noop */
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    try {
      recRef.current?.stop()
    } catch {
      /* noop */
    }
    recRef.current = null
    setListening(false)
    setInterim('')
  }, [])

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return
    confidencesRef.current = []
    setInterim('')
    setError(null)
    const rec = new Ctor()
    recRef.current = rec
    rec.lang = 'nl-NL'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interimPiece = ''
      let finalPiece = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const res = event.results[i]
        const piece = res[0]?.transcript ?? ''
        const c = res[0] && 'confidence' in res[0] ? (res[0] as { confidence?: number }).confidence : undefined
        if (typeof c === 'number' && !Number.isNaN(c)) confidencesRef.current.push(c)
        if (res.isFinal) finalPiece += piece
        else interimPiece += piece
      }
      if (finalPiece) {
        const add = finalPiece.trim()
        setSpokenTranscript((prev) => (prev ? `${prev} ${add}` : add))
      }
      setInterim(interimPiece.trim())
    }

    rec.onerror = () => {
      setError('Speech recognition hit an error. Try again or switch to typing.')
      stopListening()
    }

    rec.onend = () => {
      setListening(false)
      setInterim('')
      recRef.current = null
    }

    try {
      rec.start()
      setListening(true)
    } catch {
      setError('Could not start the microphone listener.')
    }
  }, [stopListening])

  const avgConfidence = useCallback(() => {
    const arr = confidencesRef.current
    if (arr.length === 0) return undefined
    return arr.reduce((a, b) => a + b, 0) / arr.length
  }, [])

  const submit = async () => {
    const text = tab === 'typed' ? draft.trim() : spokenTranscript.trim()
    if (!text) {
      setError(tab === 'typed' ? 'Write something first, then request feedback.' : 'Speak or type your answer first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/freer-practice/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          mode: tab === 'typed' ? 'typed' : 'spoken',
          activityPrompt,
          speechConfidence: tab === 'spoken' ? avgConfidence() : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(typeof err.error === 'string' ? err.error : 'Feedback request failed.')
        return
      }
      const data = (await res.json()) as FreerEvaluationResult
      setResult(data)
      if (userId) {
        removeAutosaveDraft(userId, freerPracticeTextDraftKey(stepKey), 'text_answer', stepKey, 'submit')
      }
    } catch {
      setError('Network error — try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isPremium) {
    return (
      <Card variant="outlined" className="mt-5 border-dashed border-slate-300 bg-slate-50/60">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-body-lg">Premium: practice feedback</CardTitle>
            <p className="text-body-sm text-ink-secondary mt-1">
              Type or speak your Dutch, then get structured feedback on task fit, connectors, questions, and phrase-bank
              use. Spoken mode includes a simple clarity score from your browser&apos;s speech engine.
            </p>
          </div>
          <Button type="button" className="shrink-0" onClick={() => router.push('/app/premium')}>
            View Premium
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card variant="outlined" className="mt-5">
      <div className="flex items-start gap-2">
        <Sparkles className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" aria-hidden />
        <div>
          <CardTitle className="text-body-lg">Your answer — feedback</CardTitle>
          <p className="text-body-sm text-ink-secondary mt-1">
            Draft in Dutch (4–6 sentences, one question, **en/maar/want**). We check against this step&apos;s instructions
            and phrase bank. Voice uses live dictation in your browser (Dutch), not cloud recording.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-1 p-1 rounded-lg bg-surface-muted w-fit">
        {(
          [
            { id: 'typed' as const, label: 'Type', Icon: PenLine },
            { id: 'spoken' as const, label: 'Speak', Icon: Mic },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id)
              setError(null)
              if (listening) stopListening()
            }}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-body-sm font-medium transition-colors',
              tab === id
                ? 'bg-surface-elevated text-ink-primary shadow-sm'
                : 'text-ink-secondary hover:text-ink-primary'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === 'typed' ? (
        <label className="block mt-4">
          <span className="text-body-sm font-medium text-ink-primary">Your text</span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="mt-1 w-full min-h-[140px] px-3 py-2 rounded-lg border border-slate-300 bg-surface-elevated text-ink-primary text-body placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Schrijf hier je zinnen in het Nederlands…"
            spellCheck={false}
          />
        </label>
      ) : (
        <div className="mt-4 space-y-2">
          {!speechSupported ? (
            <p className="text-body-sm text-ink-secondary">
              Live dictation is not supported in this browser — use Type, or try Chrome / Edge.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={listening ? 'danger' : 'secondary'}
                size="sm"
                className="inline-flex items-center gap-1.5"
                onClick={() => (listening ? stopListening() : startListening())}
              >
                {listening ? (
                  <>
                    <MicOff className="w-4 h-4 shrink-0" aria-hidden />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 shrink-0" aria-hidden />
                    Start speaking
                  </>
                )}
              </Button>
              {listening ? (
                <span className="text-body-sm text-primary-600">Listening (nl-NL)…</span>
              ) : null}
            </div>
          )}
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 min-h-[100px] text-body text-ink-primary whitespace-pre-wrap">
            {spokenTranscript || interim ? (
              <>
                {spokenTranscript}
                {interim ? <span className="text-ink-tertiary"> {interim}</span> : null}
              </>
            ) : (
              <span className="text-ink-tertiary">Transcript appears here. You can edit below if needed.</span>
            )}
          </div>
          <label className="block">
            <span className="text-body-sm font-medium text-ink-primary">Edit transcript</span>
            <textarea
              value={spokenTranscript}
              onChange={(e) => setSpokenTranscript(e.target.value)}
              rows={4}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 bg-surface-elevated text-ink-primary text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              spellCheck={false}
            />
          </label>
        </div>
      )}

      {error ? (
        <p className="mt-3 text-body-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={submit} disabled={loading} className="inline-flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden /> : null}
          Get feedback
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setResult(null)
            setError(null)
          }}
        >
          Clear result
        </Button>
      </div>

      {result ? (
        <div className="mt-5 space-y-4 border-t border-slate-200 pt-4">
          <p className="text-body text-ink-primary font-medium">{result.summary}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <ScoreRow label="Task fit" value={result.scores.taskFit} />
            <ScoreRow label="Structure" value={result.scores.structure} />
            <ScoreRow
              label="Speech clarity"
              value={result.scores.pronunciation}
              emptyLabel="Typed — no speech score"
            />
          </div>
          {result.strengths.length > 0 ? (
            <div>
              <p className="text-caption font-medium text-ink-tertiary uppercase tracking-wide mb-1">Strengths</p>
              <ul className="list-disc pl-5 space-y-1 text-body-sm text-ink-primary">
                {result.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.improvements.length > 0 ? (
            <div>
              <p className="text-caption font-medium text-ink-tertiary uppercase tracking-wide mb-1">Next steps</p>
              <ul className="list-disc pl-5 space-y-1 text-body-sm text-ink-primary">
                {result.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-caption text-ink-tertiary">
            Scores are heuristic (rule-based), not a human examiner. For deeper pronunciation coaching, use Practice →
            Voice / Pronunciation when available.
          </p>
        </div>
      ) : null}
    </Card>
  )
}

function ScoreRow({
  label,
  value,
  emptyLabel,
}: {
  label: string
  value: number | null
  emptyLabel?: string
}) {
  return (
    <div>
      <div className="flex justify-between text-body-sm mb-1">
        <span className="text-ink-secondary">{label}</span>
        <span className="font-medium text-ink-primary">
          {value == null ? emptyLabel ?? '—' : `${value}%`}
        </span>
      </div>
      {value != null ? <ProgressBar value={value} max={100} variant="default" /> : null}
    </div>
  )
}
