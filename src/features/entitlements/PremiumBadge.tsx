'use client'

import { Crown } from 'lucide-react'

type Props = {
  className?: string
  label?: string
}

/** Small inline marker for Premium-only UI. */
export function PremiumBadge({ className = '', label = 'Premium' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md bg-amber-50 text-amber-900/90 border border-amber-200/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      <Crown className="w-3 h-3 shrink-0" aria-hidden />
      {label}
    </span>
  )
}
