'use client'

import { clsx } from 'clsx'
import { playAppSound } from '@/lib/interaction/appSounds'

export type PracticeHubMode = 'do' | 'improve' | 'explore'

const MODES_DEFAULT: { id: PracticeHubMode; label: string }[] = [
  { id: 'do', label: 'Do' },
  { id: 'improve', label: 'Improve' },
  { id: 'explore', label: 'Explore' },
]

const MODES_TALK: { id: PracticeHubMode; label: string }[] = [
  { id: 'do', label: 'Now' },
  { id: 'improve', label: 'Sharpen' },
  { id: 'explore', label: 'Scenes' },
]

export function PracticeModeSwitcher({
  value,
  onChange,
  className,
  variant = 'default',
}: {
  value: PracticeHubMode
  onChange: (mode: PracticeHubMode) => void
  className?: string
  variant?: 'default' | 'talk'
}) {
  const MODES = variant === 'talk' ? MODES_TALK : MODES_DEFAULT
  const talkChrome =
    variant === 'talk' &&
    'rounded-2xl border border-slate-200/70 bg-surface-elevated p-1 shadow-card ring-1 ring-slate-900/[0.03]'

  return (
    <div
      role="tablist"
      aria-label={variant === 'talk' ? 'Talk mode' : 'Practice mode'}
      className={clsx(
        'flex w-full max-w-md p-0.5',
        variant === 'talk' ? talkChrome : 'rounded-full border border-slate-200/90 bg-surface-muted/80',
        className,
      )}
    >
      {MODES.map(({ id, label }) => {
        const selected = value === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => {
              playAppSound('nav_tab')
              onChange(id)
            }}
            className={clsx(
              'relative flex-1 min-h-touch px-1.5 text-center text-[13px] transition-colors duration-200 motion-safe:transition-[color,transform,box-shadow] motion-safe:duration-200 sm:px-2 sm:text-[14px]',
              variant === 'talk' ? 'rounded-xl py-2' : 'rounded-full sm:px-2',
              selected && variant === 'talk' && 'motion-safe:scale-[1.01]',
              selected && variant !== 'talk' && 'motion-safe:scale-[1.02]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed]',
              variant === 'talk' && selected && 'font-bold text-white',
              variant === 'talk' && !selected && 'font-semibold text-slate-500 hover:text-slate-800',
              variant !== 'talk' && selected && 'font-semibold text-ink-primary',
              variant !== 'talk' && !selected && 'font-semibold text-ink-secondary hover:text-ink-primary',
            )}
          >
            {selected ? (
              <span
                className={clsx(
                  'absolute inset-0 transition-all duration-200 ease-out',
                  variant === 'talk'
                    ? 'rounded-xl bg-brand-gradient shadow-hero'
                    : 'rounded-full border border-slate-200/60 bg-surface-elevated shadow-sm motion-safe:shadow-md',
                )}
                aria-hidden
              />
            ) : null}
            <span className="relative z-[1]">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
