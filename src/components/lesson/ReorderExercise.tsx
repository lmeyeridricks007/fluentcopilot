'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import type { Exercise } from '@/lib/schemas/exercise.schema'
import { AnswerHintPanel } from '@/components/lesson/AnswerHintPanel'
import { useAnswerHintAfterTwoWrong } from '@/components/lesson/useAnswerHintAfterTwoWrong'
import { playAnswerSuccessSound, playAnswerWrongSound } from '@/lib/lesson-engine/feedbackSounds'
import { reorderIsCorrect } from '@/lib/lesson-engine/stepHandler'

type Props = {
  exercise: Exercise
  delimiter?: string
  onResult: (correct: boolean, built: string) => void
  disabled?: boolean
}

export function ReorderExercise({ exercise, delimiter = ' ', onResult, disabled }: Props) {
  const [pool, setPool] = useState<string[]>(() =>
    exercise.type === 'reorder' ? shuffle([...exercise.options]) : []
  )
  const [slots, setSlots] = useState<(string | null)[]>(() =>
    exercise.type === 'reorder' ? exercise.options.map(() => null) : []
  )
  const [shake, setShake] = useState(false)
  const [flash, setFlash] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const hint = useAnswerHintAfterTwoWrong()

  const filled = useMemo(() => slots.every(Boolean), [slots])

  if (exercise.type !== 'reorder') return null

  const add = (word: string, fromPoolIdx: number) => {
    if (disabled || submitted) return
    const empty = slots.findIndex((s) => !s)
    if (empty < 0) return
    const nextSlots = [...slots]
    nextSlots[empty] = word
    const nextPool = pool.filter((_, i) => i !== fromPoolIdx)
    setSlots(nextSlots)
    setPool(nextPool)
  }

  const removeFromSlot = (slotIdx: number) => {
    if (disabled || submitted) return
    const w = slots[slotIdx]
    if (!w) return
    const nextSlots = [...slots]
    nextSlots[slotIdx] = null
    setSlots(nextSlots)
    setPool((p) => [...p, w])
  }

  const check = () => {
    const built = slots.filter(Boolean).join(delimiter)
    const ok = reorderIsCorrect(exercise, built)
    if (ok) {
      hint.registerCorrect()
      playAnswerSuccessSound()
      setSubmitted(true)
      setFlash(true)
      window.setTimeout(() => setFlash(false), 450)
      onResult(ok, built)
      return
    }
    hint.registerWrong()
    playAnswerWrongSound()
    setShake(true)
    window.setTimeout(() => setShake(false), 450)
    onResult(ok, built)
    setSubmitted(false)
    setPool(shuffle([...exercise.options]))
    setSlots(exercise.options.map(() => null))
  }

  return (
    <div className={clsx('space-y-4', shake && 'animate-lesson-shake', flash && 'animate-lesson-flash-success rounded-xl')}>
      <p className="text-body font-medium text-ink-primary">{exercise.question}</p>
      <div className="flex flex-wrap gap-2 min-h-[52px] p-3 rounded-xl bg-surface-muted border border-dashed border-slate-300">
        {slots.map((s, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled || !s}
            onClick={() => removeFromSlot(i)}
            className={clsx(
              'min-h-touch px-3 rounded-lg border text-body-sm font-medium transition-colors',
              s ? 'border-primary-400 bg-primary-50 text-ink-primary' : 'border-transparent text-ink-tertiary'
            )}
          >
            {s ?? '—'}
          </button>
        ))}
      </div>
      <p className="text-caption text-ink-secondary">Tik op een woord om het toe te voegen. Tik op een vak om het terug te halen.</p>
      <div className="flex flex-wrap gap-2">
        {pool.map((w, i) => (
          <button
            key={`${w}-${i}`}
            type="button"
            disabled={disabled || submitted}
            onClick={() => add(w, i)}
            className="min-h-touch px-4 rounded-lg bg-white border border-slate-200 shadow-card text-body-sm active:scale-95 transition-transform"
          >
            {w}
          </button>
        ))}
      </div>
      {hint.showHintOffer && (
        <button
          type="button"
          onClick={hint.openHint}
          className="w-full min-h-touch rounded-xl border border-amber-300 bg-amber-50/80 text-body-sm font-medium text-amber-950"
        >
          Ik zit vast — toon oplossing
        </button>
      )}
      {hint.hintVisible && (
        <AnswerHintPanel
          correctAnswer={exercise.correctAnswer}
          explanation={exercise.explanation}
          subtitle="Zet de woorden in deze volgorde."
        />
      )}
      <button
        type="button"
        disabled={disabled || !filled || submitted}
        onClick={check}
        className="w-full min-h-touch rounded-xl bg-primary-600 text-white font-semibold disabled:opacity-40"
      >
        Controleer
      </button>
    </div>
  )
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
