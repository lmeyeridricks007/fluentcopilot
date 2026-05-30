'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { nativePress } from '@/lib/design/cardTiers'

export function GuidedHelpBottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[55] flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-black/35" aria-label="Sluiten" onClick={onClose} />
      <div className="relative max-h-[min(78vh,560px)] flex flex-col rounded-t-2xl bg-surface-elevated shadow-[0_-12px_40px_rgba(15,23,42,0.15)] border-t border-slate-200/90 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-slate-200/70 shrink-0">
          <h2 className="text-body font-bold text-ink-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className={clsx('min-h-touch min-w-touch rounded-xl flex items-center justify-center text-ink-secondary', nativePress)}
            aria-label="Sluiten"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-3 py-3">{children}</div>
      </div>
    </div>
  )
}
