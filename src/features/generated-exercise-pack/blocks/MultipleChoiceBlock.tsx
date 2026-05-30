'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import type { ExerciseBlockResultPayload } from '../exerciseBlockResult'
import { BlockSurface } from '../blockPrimitives'

export type McOptionView = { id: string; label: string }

function excerptLabel(s: string, max = 240): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

export function MultipleChoiceBlock(props: {
  blockId: string
  question: string
  options: McOptionView[]
  correctOptionId: string
  correctExplanation?: string
  /** Extra guidance after a wrong tap (learner can pick again). */
  incorrectFeedbackStyle?: 'listening' | 'meaning' | 'usage'
  compact?: boolean
  disabled?: boolean
  onComplete: (result: ExerciseBlockResultPayload) => void
}) {
  const { question, options, correctOptionId, correctExplanation, incorrectFeedbackStyle, compact, disabled, onComplete } = props
  const [picked, setPicked] = useState<string | null>(null)
  const [wrong, setWrong] = useState(false)
  const [solved, setSolved] = useState(false)

  const correctLabel = useMemo(
    () => options.find((o) => o.id === correctOptionId)?.label?.trim() ?? '',
    [options, correctOptionId],
  )

  const pick = (id: string) => {
    if (disabled || solved) return
    setPicked(id)
    setWrong(false)
    if (id === correctOptionId) {
      setSolved(true)
      onComplete({
        correctness: 1,
        outcome: 'correct',
        userAnswer: { selectedId: id },
      })
    } else {
      setWrong(true)
    }
  }

  const wrongDetail =
    wrong && picked && picked !== correctOptionId ? (
      <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 space-y-2">
        <p className="text-caption font-semibold text-amber-950">Not quite</p>
        {incorrectFeedbackStyle === 'listening' ? (
          <>
            <p className="text-caption text-amber-950 leading-relaxed">
              The clip follows this wording — replay audio and match from the first words (names, numbers, and fixed chunks
              should line up):
            </p>
            <p className="text-caption font-medium text-ink-primary whitespace-pre-wrap rounded-lg border border-amber-100/80 bg-white/90 px-2.5 py-2 max-h-44 overflow-y-auto leading-snug">
              {correctLabel}
            </p>
            <p className="text-caption text-amber-900/95 leading-relaxed">
              The other choices are everyday snippets; they will not track what you heard syllable-for-syllable. Tap another
              option when you are ready.
            </p>
          </>
        ) : incorrectFeedbackStyle === 'meaning' ? (
          <p className="text-caption text-amber-950 leading-relaxed">
            The closest meaning for your capture is: <span className="font-semibold">{excerptLabel(correctLabel, 280)}</span>.
            Compare tone and situation with your pick, then try another option.
          </p>
        ) : incorrectFeedbackStyle === 'usage' ? (
          <p className="text-caption text-amber-950 leading-relaxed">
            The best situational fit is: <span className="font-semibold">{excerptLabel(correctLabel, 280)}</span>. Think where
            you would realistically say your line, then try another option.
          </p>
        ) : (
          <p className="text-caption text-amber-950 leading-relaxed">
            Correct answer: <span className="font-semibold">{excerptLabel(correctLabel, 220)}</span> — pick another option.
          </p>
        )}
      </div>
    ) : null

  return (
    <BlockSurface
      compact={compact}
      className={clsx(wrong && 'rounded-2xl ring-2 ring-red-100/90 p-1 -m-1')}
      data-block-id={props.blockId}
    >
      <p className="text-body-sm font-semibold text-ink-primary leading-snug tracking-tight">{question}</p>
      <div className="flex flex-col gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={disabled || solved}
            onClick={() => pick(o.id)}
            className={clsx(
              'rounded-2xl border px-4 py-3 text-left text-body-sm font-medium transition-colors min-h-touch active:scale-[0.99]',
              picked === o.id && o.id === correctOptionId
                ? 'border-emerald-400 bg-emerald-50 text-emerald-950'
                : picked === o.id && wrong
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-slate-200/90 bg-white text-ink-primary hover:border-slate-300',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      {wrong ? wrongDetail : null}
      {solved && correctExplanation ? (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-caption text-emerald-950 leading-relaxed">
          {correctExplanation}
        </p>
      ) : null}
      {solved && !correctExplanation ? (
        <p className="text-caption font-medium text-emerald-800">Good next step.</p>
      ) : null}
    </BlockSurface>
  )
}
