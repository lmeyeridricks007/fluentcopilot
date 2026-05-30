'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { SkillTrackExercise } from '@/lib/schemas/practice/skillTrack.schema'

function norm(s: string, lower: boolean): string {
  const t = s.trim()
  return lower ? t.toLowerCase() : t
}

export function SkillTrackExerciseView({
  exercise,
  trackId,
  onSubmit,
}: {
  exercise: SkillTrackExercise
  trackId: string
  onSubmit: (correct: boolean | null, participated?: boolean) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [typed, setTyped] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [speakingStep, setSpeakingStep] = useState<0 | 1 | 2>(0)
  const [continueLocked, setContinueLocked] = useState(false)
  const [micBusy, setMicBusy] = useState(false)
  /** Hoisted to the top with all other hooks. Previously declared after the
   *  `speaking_prompt` early-return, which violated Rules of Hooks and would
   *  crash React when the same component instance changed exercise kind. */
  const [gradedCorrect, setGradedCorrect] = useState<boolean | null>(null)

  useEffect(() => {
    setSpeakingStep(0)
    setContinueLocked(false)
    setMicBusy(false)
    setSelected(null)
    setTyped('')
    setRevealed(false)
    setGradedCorrect(null)
  }, [exercise.id])

  const fireAnswered = (correct: boolean | null) => {
    track(ANALYTICS_EVENTS.skill_track_exercise_answered, {
      trackId,
      exerciseId: exercise.id,
      kind: exercise.kind,
      correct,
    })
  }

  if (exercise.kind === 'speaking_prompt') {
    const playModel = () => {
      track(ANALYTICS_EVENTS.skill_track_speaking_model_played, { trackId, exerciseId: exercise.id })
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setSpeakingStep(1)
        return
      }
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(exercise.modelNl)
      u.lang = 'nl-NL'
      u.onend = () => setSpeakingStep(1)
      window.speechSynthesis.speak(u)
    }

    const runMicProbe = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setSpeakingStep(2)
        return
      }
      setMicBusy(true)
      try {
        track(ANALYTICS_EVENTS.skill_track_speaking_mic_check, { trackId, exerciseId: exercise.id })
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const rec = new MediaRecorder(stream)
        const chunks: Blob[] = []
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data)
        }
        rec.start()
        await new Promise((r) => setTimeout(r, 2200))
        rec.stop()
        await new Promise<void>((resolve) => {
          rec.onstop = () => resolve()
        })
        stream.getTracks().forEach((t) => t.stop())
      } catch {
        /* mic denied or unsupported */
      } finally {
        setMicBusy(false)
        setSpeakingStep(2)
      }
    }

    return (
      <Card variant="flat" padding="md" className="border border-slate-200 space-y-4">
        <div>
          <p className="text-caption font-medium text-ink-secondary">{exercise.title}</p>
          <p className="text-body-sm text-ink-secondary mt-1">{exercise.instructions}</p>
        </div>
        <div className="rounded-xl bg-surface-muted/70 p-4 border border-slate-200/80">
          <p className="text-body-sm font-semibold text-ink-primary leading-relaxed">{exercise.modelNl}</p>
          {exercise.modelEn ? (
            <p className="text-caption text-ink-secondary mt-2">{exercise.modelEn}</p>
          ) : null}
        </div>
        <p className="text-body-sm text-ink-primary">{exercise.task}</p>

        {speakingStep === 0 ? (
          <Button type="button" size="lg" fullWidth onClick={playModel}>
            Hear model Dutch
          </Button>
        ) : null}

        {speakingStep === 1 ? (
          <div className="space-y-3">
            <p className="text-body-sm text-ink-secondary">
              Repeat out loud — match rhythm and stress. Optional: quick mic check confirms you spoke.
            </p>
            <Button type="button" size="lg" fullWidth onClick={() => setSpeakingStep(2)}>
              I repeated out loud
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              fullWidth
              disabled={micBusy}
              onClick={() => void runMicProbe()}
            >
              {micBusy ? 'Listening…' : 'Quick mic check (2s)'}
            </Button>
          </div>
        ) : null}

        {speakingStep === 2 ? (
          <div className="space-y-3">
            <p className="text-body-sm text-ink-secondary">
              {exercise.selfCheckReminder} One more rep tomorrow and this line will feel automatic.
            </p>
            <Button
              type="button"
              size="lg"
              fullWidth
              disabled={continueLocked}
              onClick={() => {
                if (continueLocked) return
                setContinueLocked(true)
                fireAnswered(null)
                onSubmit(null, true)
              }}
            >
              Continue
            </Button>
          </div>
        ) : null}
      </Card>
    )
  }

  if (exercise.kind === 'mcq') {
    const submitMcq = () => {
      if (selected === null) return
      const ok = selected === exercise.correctIndex
      fireAnswered(ok)
      setRevealed(true)
      setGradedCorrect(ok)
    }
    return (
      <Card variant="flat" padding="md" className="border border-slate-200 space-y-4">
        <div>
          <p className="text-caption font-medium text-ink-secondary">{exercise.title}</p>
          <p className="text-body-sm text-ink-secondary mt-1">{exercise.instructions}</p>
          <p className="text-body-sm font-medium text-ink-primary mt-3">{exercise.prompt}</p>
        </div>
        <ul className="space-y-2">
          {exercise.options.map((opt, i) => (
            <li key={i}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => !revealed && setSelected(i)}
                className={`w-full text-left rounded-xl border px-3 py-2.5 text-body-sm transition-colors ${
                  selected === i
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                } ${revealed && i === exercise.correctIndex ? 'ring-2 ring-emerald-300' : ''} ${
                  revealed && selected === i && i !== exercise.correctIndex ? 'ring-2 ring-amber-300' : ''
                }`}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
        {revealed ? (
          <div className="space-y-3">
            <p className="text-caption text-ink-secondary">
              {gradedCorrect
                ? exercise.feedbackCorrect ?? 'Nice.'
                : exercise.feedbackWrong ?? 'Check the model answer and try a similar line later.'}
            </p>
            <Button type="button" size="lg" fullWidth onClick={() => onSubmit(gradedCorrect === true)}>
              Continue
            </Button>
          </div>
        ) : (
          <Button type="button" size="lg" fullWidth disabled={selected === null} onClick={submitMcq}>
            Check
          </Button>
        )}
      </Card>
    )
  }

  if (exercise.kind === 'reading_mcq' || exercise.kind === 'repair_mcq') {
    const prompt = exercise.kind === 'reading_mcq' ? exercise.question : exercise.prompt
    const passage =
      exercise.kind === 'reading_mcq' ? exercise.passage : `${exercise.contextNl}${exercise.contextEn ? ` — ${exercise.contextEn}` : ''}`
    return (
      <Card variant="flat" padding="md" className="border border-slate-200 space-y-4">
        <div>
          <p className="text-caption font-medium text-ink-secondary">{exercise.title}</p>
          <p className="text-body-sm text-ink-secondary mt-1">{exercise.instructions}</p>
        </div>
        <div className="rounded-xl bg-surface-muted/60 p-3 border border-slate-200/80">
          <p className="text-body-sm text-ink-primary leading-relaxed whitespace-pre-wrap">{passage}</p>
        </div>
        <p className="text-body-sm font-medium text-ink-primary">{prompt}</p>
        <ul className="space-y-2">
          {exercise.options.map((opt, i) => (
            <li key={i}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => !revealed && setSelected(i)}
                className={`w-full text-left rounded-xl border px-3 py-2.5 text-body-sm transition-colors ${
                  selected === i ? 'border-primary-400 bg-primary-50' : 'border-slate-200'
                }`}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
        {revealed ? (
          <div className="space-y-3">
            <p className="text-caption text-ink-secondary">
              {gradedCorrect
                ? exercise.feedbackCorrect ?? 'Good.'
                : exercise.feedbackWrong ?? 'Listen for polite, short repairs.'}
            </p>
            <Button type="button" size="lg" fullWidth onClick={() => onSubmit(gradedCorrect === true)}>
              Continue
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="lg"
            fullWidth
            disabled={selected === null}
            onClick={() => {
              if (selected === null) return
              const ok = selected === exercise.correctIndex
              fireAnswered(ok)
              setRevealed(true)
              setGradedCorrect(ok)
            }}
          >
            Check
          </Button>
        )}
      </Card>
    )
  }

  if (exercise.kind === 'typed_check') {
    const check = () => {
      const t = norm(typed, exercise.caseInsensitive !== false)
      const ok = exercise.acceptableAnswers.some((a) => t.includes(norm(a, exercise.caseInsensitive !== false)))
      fireAnswered(ok)
      setRevealed(true)
      setGradedCorrect(ok)
    }
    return (
      <Card variant="flat" padding="md" className="border border-slate-200 space-y-4">
        <div>
          <p className="text-caption font-medium text-ink-secondary">{exercise.title}</p>
          <p className="text-body-sm text-ink-secondary mt-1">{exercise.instructions}</p>
          <p className="text-body-sm font-medium text-ink-primary mt-3">{exercise.prompt}</p>
        </div>
        <textarea
          rows={3}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={revealed}
          placeholder={exercise.placeholder ?? 'Type in Dutch…'}
          className="w-full resize-none rounded-xl border border-slate-200 bg-surface-elevated px-3 py-2.5 text-body-sm"
        />
        {revealed ? (
          <div className="space-y-3">
            <p className="text-caption text-ink-secondary">
              {gradedCorrect
                ? exercise.feedbackCorrect ?? 'Looks usable.'
                : exercise.feedbackWrong ?? 'Try a shorter line with the suggested words.'}
            </p>
            <Button type="button" size="lg" fullWidth onClick={() => onSubmit(gradedCorrect === true)}>
              Continue
            </Button>
          </div>
        ) : (
          <Button type="button" size="lg" fullWidth disabled={!typed.trim()} onClick={check}>
            Check
          </Button>
        )}
      </Card>
    )
  }

  return null
}
