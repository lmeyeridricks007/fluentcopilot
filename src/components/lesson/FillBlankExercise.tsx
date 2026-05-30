'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import type { Exercise } from '@/lib/schemas/exercise.schema'
import { AnswerHintPanel } from '@/components/lesson/AnswerHintPanel'
import { useAnswerHintAfterTwoWrong } from '@/components/lesson/useAnswerHintAfterTwoWrong'
import { playAnswerSuccessSound, playAnswerWrongSound } from '@/lib/lesson-engine/feedbackSounds'
import { fillBlankIsCorrect } from '@/lib/lesson-engine/stepHandler'
import { shuffleMcqOptions } from '@/lib/lesson-engine/shuffleMcqOptions'

type Props = {
  exercise: Exercise
  onResult: (correct: boolean, choice: string) => void
  disabled?: boolean
}

export function FillBlankExercise({ exercise, onResult, disabled }: Props) {
  const [picked, setPicked] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [flash, setFlash] = useState(false)
  const hint = useAnswerHintAfterTwoWrong()

  const chipOptions =
    exercise.type === 'fill_blank' ? exercise.options : null
  const displayOptions = useMemo(
    () => (chipOptions ? shuffleMcqOptions(exercise.id, chipOptions) : []),
    [exercise.id, chipOptions]
  )

  if (exercise.type !== 'fill_blank') return null

  const choose = (opt: string) => {
    if (disabled) return
    setPicked(opt)
    const ok = fillBlankIsCorrect(exercise, opt)
    if (ok) {
      hint.registerCorrect()
      playAnswerSuccessSound()
      setFlash(true)
      window.setTimeout(() => setFlash(false), 450)
    } else {
      hint.registerWrong()
      playAnswerWrongSound()
      setShake(true)
      window.setTimeout(() => setShake(false), 450)
    }
    onResult(ok, opt)
  }

  return (
    <div className={clsx('space-y-3', shake && 'animate-lesson-shake', flash && 'animate-lesson-flash-success rounded-xl')}>
      <p className="text-body font-medium text-ink-primary">{exercise.question}</p>
      <div className="flex flex-wrap gap-2">
        {displayOptions.map((opt, idx) => (
          <button
            key={`${exercise.id}-${idx}-${String(opt)}`}
            type="button"
            disabled={disabled}
            onClick={() => choose(opt)}
            className={clsx(
              'min-h-touch px-5 rounded-full border text-body-sm font-semibold transition-transform active:scale-95',
              picked === opt
                ? fillBlankIsCorrect(exercise, opt)
                  ? 'border-success bg-green-50 text-ink-primary'
                  : 'border-error bg-red-50'
                : 'border-slate-200 bg-white shadow-card'
            )}
          >
            {opt}
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
        />
      )}
    </div>
  )
}
