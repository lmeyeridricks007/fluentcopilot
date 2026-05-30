'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { AnswerHintPanel } from '@/components/lesson/AnswerHintPanel'
import { useAnswerHintAfterTwoWrong } from '@/components/lesson/useAnswerHintAfterTwoWrong'
import { playAnswerSuccessSound, playAnswerWrongSound } from '@/lib/lesson-engine/feedbackSounds'
import { speakDialogueLines, stopSpeak } from '@/lib/lesson-engine/speakNl'
import type { Exercise } from '@/lib/schemas/exercise.schema'
import { answersMatch } from '@/lib/lesson-engine/stepHandler'
import { shuffleMcqOptions } from '@/lib/lesson-engine/shuffleMcqOptions'

export type DialogueLine = { speaker: string; nl: string; en: string }

type Props = {
  dialogue: DialogueLine[]
  hideTranscriptUntilPlayed: boolean
  /** When omitted, only play + transcript (MCQs handled outside). */
  exercise?: Exercise
  onAnswer?: (correct: boolean, choice: string) => void
  disabled?: boolean
}

export function DialoguePlayer({
  dialogue,
  hideTranscriptUntilPlayed,
  exercise,
  onAnswer,
  disabled,
}: Props) {
  const [played, setPlayed] = useState(false)
  const [reveal, setReveal] = useState(!hideTranscriptUntilPlayed)
  const [selected, setSelected] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [flash, setFlash] = useState(false)
  const hint = useAnswerHintAfterTwoWrong()

  const mcqExercise =
    exercise?.type === 'multiple_choice' ? exercise : null
  const mcqDisplayOptions = useMemo(
    () =>
      mcqExercise ? shuffleMcqOptions(mcqExercise.id, mcqExercise.options) : [],
    [mcqExercise]
  )

  const playAll = () => {
    stopSpeak()
    setPlayed(true)
    speakDialogueLines(
      dialogue.map((l) => l.nl),
      { pauseMsBetween: 480 }
    )
    window.setTimeout(() => setReveal(true), hideTranscriptUntilPlayed ? 400 : 0)
  }

  const pick = (opt: string) => {
    if (!exercise || disabled || exercise.type !== 'multiple_choice') return
    setSelected(opt)
    const ok = answersMatch(exercise.correctAnswer, opt)
    if (ok) {
      playAnswerSuccessSound()
      setFlash(true)
      window.setTimeout(() => setFlash(false), 500)
      onAnswer?.(true, opt)
    } else {
      playAnswerWrongSound()
      setShake(true)
      window.setTimeout(() => setShake(false), 450)
      onAnswer?.(false, opt)
    }
  }

  return (
    <div className={clsx('space-y-4', flash && 'animate-lesson-flash-success rounded-card')}>
      <button
        type="button"
        onClick={playAll}
        disabled={disabled}
        className={clsx(
          'w-full min-h-touch rounded-xl bg-primary-600 text-white font-semibold text-body shadow-elevated transition-transform active:scale-[0.98]',
          !played && 'animate-lesson-pulse-ring'
        )}
      >
        ▶ Speel gesprek
      </button>
      <div
        className={clsx(
          'rounded-card border border-slate-200 bg-surface-muted/80 p-3 space-y-2 transition-opacity duration-500',
          !reveal && hideTranscriptUntilPlayed && 'opacity-40'
        )}
      >
        {dialogue.map((line, i) => (
          <div key={i} className="text-body-sm">
            <span className="font-semibold text-primary-700">{line.speaker}: </span>
            <span className="text-ink-primary">{reveal || !hideTranscriptUntilPlayed ? line.nl : '•••'}</span>
            {(reveal || !hideTranscriptUntilPlayed) && (
              <span className="block text-caption text-ink-tertiary mt-0.5">{line.en}</span>
            )}
          </div>
        ))}
      </div>
      {exercise && exercise.type === 'multiple_choice' && (
        <div className={clsx('space-y-2', shake && 'animate-lesson-shake')}>
          <p className="text-body font-medium text-ink-primary">{exercise.question}</p>
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
          {mcqDisplayOptions.map((opt, idx) => (
            <button
              key={`${exercise.id}-${idx}-${String(opt)}`}
              type="button"
              disabled={disabled}
              onClick={() => pick(opt)}
              className={clsx(
                'w-full min-h-touch rounded-lg border text-left px-4 py-3 text-body-sm transition-colors',
                selected === opt
                  ? answersMatch(exercise.correctAnswer, opt)
                    ? 'border-success bg-green-50 text-ink-primary'
                    : 'border-error bg-red-50'
                  : 'border-slate-200 bg-surface-elevated active:bg-slate-50'
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
