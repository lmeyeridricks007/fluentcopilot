'use client'

import { clsx } from 'clsx'
import { playAppSound } from '@/lib/interaction/appSounds'

export type SpeakLiveQuickVariationOption = { id: string; label: string }

function Pill({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={() => {
        playAppSound('tap')
        onClick()
      }}
      className={clsx(
        'min-h-touch rounded-2xl border px-3.5 py-2 text-body-sm font-semibold transition-colors',
        selected
          ? 'border-primary-400 bg-white text-primary-950 shadow-[0_10px_24px_-18px_rgba(59,130,246,0.5)]'
          : 'border-slate-200 bg-white text-ink-secondary hover:border-primary-200 hover:text-ink-primary'
      )}
    >
      {label}
    </button>
  )
}

/**
 * Always-visible “Random vs fixed task” chooser. Random = smart mix (no `variation` in launch URL).
 * Picking a task pins `variation` only unless the parent also sets subtype / other overrides.
 */
export function SpeakLiveQuickVariationStrip({
  title = 'Task focus',
  description = 'Leave Random for a mixed session. Or pick one task for this run while other details can still vary.',
  randomSelected,
  onPickRandom,
  options,
  selectedVariationId,
  onToggleVariation,
  disabled,
}: {
  title?: string
  description?: string
  randomSelected: boolean
  onPickRandom: () => void
  options: readonly SpeakLiveQuickVariationOption[]
  selectedVariationId?: string
  onToggleVariation: (id: string) => void
  disabled?: boolean
}) {
  return (
    <div
      className={clsx(
        'rounded-[1.4rem] border border-slate-200/80 bg-white/80 p-3.5',
        disabled && 'pointer-events-none opacity-60'
      )}
    >
      <p className="text-caption font-semibold text-ink-primary">{title}</p>
      <p className="mt-0.5 text-caption text-ink-secondary leading-snug">{description}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <Pill label="Random" selected={randomSelected} onClick={onPickRandom} />
        {options.map((o) => (
          <Pill
            key={o.id}
            label={o.label}
            selected={!randomSelected && selectedVariationId === o.id}
            onClick={() => onToggleVariation(o.id)}
          />
        ))}
      </div>
    </div>
  )
}
