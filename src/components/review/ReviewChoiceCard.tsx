'use client'

import { clsx } from 'clsx'

export function ReviewChoiceCard({
  options,
  disabled,
  selected,
  revealed,
  correctAnswer,
  onSelect,
}: {
  options: string[]
  disabled?: boolean
  selected: string | null
  revealed: boolean
  correctAnswer: string
  onSelect: (opt: string) => void
}) {
  return (
    <ul className="space-y-2">
      {options.map((opt) => {
        const isSel = selected === opt
        const isCorrect = opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
        const show = revealed
        return (
          <li key={opt}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(opt)}
              className={clsx(
                'w-full min-h-touch rounded-xl border-2 px-4 py-3 text-left text-body font-medium transition-all active:scale-[0.99]',
                !show && 'border-slate-200 bg-surface-elevated hover:border-primary-200 hover:bg-primary-50/40',
                show &&
                  isCorrect &&
                  'border-emerald-500 bg-emerald-50 text-emerald-900 animate-review-pop',
                show && !isCorrect && isSel && 'border-rose-400 bg-rose-50 text-rose-900 animate-review-shake',
                show && !isCorrect && !isSel && 'border-slate-100 bg-slate-50 text-ink-tertiary opacity-70'
              )}
            >
              {opt}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
