'use client'

import { useState } from 'react'
import { speakNl } from '@/lib/lesson-engine/speakNl'
import { ChoiceExercise } from '@/components/lesson/ChoiceExercise'
import { ReorderExercise } from '@/components/lesson/ReorderExercise'
import { FillBlankExercise } from '@/components/lesson/FillBlankExercise'
import type { Exercise } from '@/lib/schemas/exercise.schema'

export type RecapTask =
  | {
      kind: 'listen_mcq'
      question: string
      snippetNl: string
      options: string[]
      correctAnswer: string
    }
  | { kind: 'speak'; prompt: string; targetNl: string; mockPass?: boolean }
  | { kind: 'fill_blank'; sentence: string; options: string[]; correctAnswer: string }
  | { kind: 'reorder'; tokens: string[]; correctAnswer: string }

type Props = {
  tasks: RecapTask[]
  onComplete: () => void
}

export function RecapCard({ tasks, onComplete }: Props) {
  const [idx, setIdx] = useState(0)

  const task = tasks[idx]

  const advance = () => {
    if (idx + 1 >= tasks.length) onComplete()
    else {
      setIdx((i) => i + 1)
    }
  }

  if (!task) return null

  if (task.kind === 'listen_mcq') {
    const ex: Exercise = {
      id: `recap-mcq-${idx}`,
      type: 'multiple_choice',
      question: `${task.question}\n\n“${task.snippetNl}”`,
      options: task.options,
      correctAnswer: task.correctAnswer,
      difficulty: 'A2_low',
      metadata: {},
    }
    return (
      <div className="space-y-4">
        <ChoiceExercise
          exercise={ex}
          onResult={(ok) => {
            if (ok) window.setTimeout(advance, 650)
          }}
        />
      </div>
    )
  }

  if (task.kind === 'speak') {
    return (
      <div className="space-y-4">
        <p className="text-body font-medium">{task.prompt}</p>
        <button
          type="button"
          onClick={() => speakNl(task.targetNl)}
          className="w-full min-h-touch rounded-xl border border-slate-200 bg-white shadow-card"
        >
          🔊 Model
        </button>
        <button
          type="button"
          onClick={() => window.setTimeout(advance, 400)}
          className="w-full min-h-touch rounded-xl bg-primary-600 text-white font-semibold"
        >
          Klaar — ik deed mijn best
        </button>
      </div>
    )
  }

  if (task.kind === 'fill_blank') {
    const ex: Exercise = {
      id: `recap-fill-${idx}`,
      type: 'fill_blank',
      question: task.sentence.replace('___', '____'),
      options: task.options,
      correctAnswer: task.correctAnswer,
      difficulty: 'A2_low',
      metadata: {},
    }
    return (
      <FillBlankExercise
        exercise={ex}
        onResult={(ok) => {
          if (ok) window.setTimeout(advance, 650)
        }}
      />
    )
  }

  if (task.kind === 'reorder') {
    const ex: Exercise = {
      id: `recap-reorder-${idx}`,
      type: 'reorder',
      question: 'Maak de groet.',
      options: [...task.tokens],
      correctAnswer: task.correctAnswer,
      difficulty: 'A2_low',
      metadata: {},
    }
    return (
      <ReorderExercise
        exercise={ex}
        delimiter=" "
        onResult={(ok) => {
          if (ok) window.setTimeout(advance, 650)
        }}
      />
    )
  }

  return null
}
