'use client'

import { clsx } from 'clsx'

export function SuggestionChips({
  suggestions,
  onPick,
  disabled,
}: {
  suggestions: string[]
  onPick: (text: string) => void
  disabled?: boolean
}) {
  if (suggestions.length === 0) return null
  return (
    <div className="px-1 pb-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary mb-1.5 px-0.5">
        Starters — tap to edit in the field
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-thin">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s)}
            className={clsx(
              'shrink-0 max-w-[88vw] text-left rounded-xl border px-3 py-2 min-h-touch text-caption font-medium leading-snug',
              'border-slate-200 bg-white text-ink-primary hover:border-primary-200 active:scale-[0.99]',
              disabled && 'opacity-50 pointer-events-none'
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
