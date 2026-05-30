'use client'

import clsx from 'clsx'

type Props = {
  label: string
  description?: string
  selected: boolean
  onSelect: () => void
}

export function OnboardingOptionCard({ label, description, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'w-full text-left rounded-xl border px-4 py-3.5 transition-colors min-h-touch',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
        selected
          ? 'border-primary-500 bg-primary-50 text-primary-900 shadow-sm'
          : 'border-slate-200 bg-surface-elevated hover:bg-surface-muted active:bg-surface-muted'
      )}
    >
      <span className="font-semibold text-body block text-slate-900">{label}</span>
      {description ? (
        <span className="text-body-sm text-slate-600 mt-1 block leading-snug">{description}</span>
      ) : null}
    </button>
  )
}
