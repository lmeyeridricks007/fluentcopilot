'use client'

import { Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { playAppSound } from '@/lib/interaction/appSounds'
import { useQuickCaptureOptional } from './QuickCaptureContext'
import type { QuickCaptureActionId } from './quickCaptureTypes'

type Props = {
  /** Dark surfaces (e.g. Speak Live report hero). */
  variant?: 'onDark' | 'onLight'
  className?: string
  /** Which capture type to open directly (optional). */
  initial?: QuickCaptureActionId
}

export function ReportQuickCapturePrompt({ variant = 'onLight', className, initial }: Props) {
  const qc = useQuickCaptureOptional()
  if (!qc) return null

  const dark = variant === 'onDark'

  return (
    <button
      type="button"
      onClick={() => {
        playAppSound('tap')
        qc.open(initial ? { initial } : undefined)
      }}
      className={clsx(
        'flex w-full min-h-touch items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
        dark
          ? 'border-white/15 bg-white/[0.06] hover:bg-white/[0.1]'
          : 'border-slate-200/90 bg-slate-50/80 hover:bg-slate-50',
        className,
      )}
    >
      <span
        className={clsx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          dark ? 'bg-white/10 text-white' : 'bg-primary-100 text-primary-800',
        )}
      >
        <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className={clsx('block text-body-sm font-semibold', dark ? 'text-white' : 'text-ink-primary')}>
          Quick capture
        </span>
        <span className={clsx('mt-0.5 block text-caption leading-snug', dark ? 'text-white/65' : 'text-ink-secondary')}>
          Save a word, phrase, or moment while it is still fresh.
        </span>
      </span>
    </button>
  )
}
