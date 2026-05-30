'use client'

import { clsx } from 'clsx'
import type { ConversationMode, FeedbackMode } from '../types'

export function NewConversationSetupSheet({
  open,
  onClose,
  mode,
  feedbackMode,
  onModeChange,
  onFeedbackModeChange,
  onStart,
  startPending = false,
  startError = null,
  learningHint = null,
}: {
  open: boolean
  onClose: () => void
  mode: ConversationMode
  feedbackMode: FeedbackMode
  onModeChange: (m: ConversationMode) => void
  onFeedbackModeChange: (f: FeedbackMode) => void
  onStart: () => void
  startPending?: boolean
  startError?: string | null
  /** Optional one-liner from cross-session learning profile (Talk / train setup). */
  learningHint?: string | null
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white border border-slate-200 shadow-xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[90vh] overflow-y-auto">
        <h2 className="text-title font-bold text-ink-primary">Train station chat</h2>
        <p className="text-body-sm text-ink-secondary mt-1 leading-snug">
          Message a helpful NS-style assistant. Pick how much coaching you want.
        </p>
        {learningHint?.trim() ? (
          <p className="mt-3 text-caption text-ink-secondary leading-snug rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2">
            {learningHint.trim()}
          </p>
        ) : null}

        <div className="mt-5 space-y-2">
          <p className="text-caption font-bold text-ink-tertiary uppercase tracking-wide">Mode</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'guided' as const, title: 'Guided', sub: 'Starters + tighter scene' },
                { id: 'free' as const, title: 'Free', sub: 'More natural flow' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onModeChange(opt.id)}
                className={clsx(
                  'rounded-xl border px-3 py-3 text-left min-h-touch transition-colors',
                  mode === opt.id
                    ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-200/60'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <p className="text-body-sm font-bold text-ink-primary">{opt.title}</p>
                <p className="text-caption text-ink-secondary mt-0.5">{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-caption font-bold text-ink-tertiary uppercase tracking-wide">Feedback</p>
          <div className="grid grid-cols-1 gap-2">
            {(
              [
                { id: 'after_each' as const, title: 'After each reply', sub: 'Short inline tips' },
                { id: 'at_end' as const, title: 'At the end', sub: 'Full recap when you finish' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onFeedbackModeChange(opt.id)}
                className={clsx(
                  'rounded-xl border px-3 py-3 text-left min-h-touch transition-colors',
                  feedbackMode === opt.id
                    ? 'border-primary-400 bg-primary-50 ring-1 ring-primary-200/60'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <p className="text-body-sm font-bold text-ink-primary">{opt.title}</p>
                <p className="text-caption text-ink-secondary mt-0.5">{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {startError ? (
          <p className="mt-4 text-caption text-red-800 bg-red-50 border border-red-200/80 rounded-xl px-3 py-2">
            {startError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onStart}
            disabled={startPending}
            className={clsx(
              'min-h-touch w-full rounded-xl bg-primary-600 text-white text-body font-bold py-3.5 active:scale-[0.99] transition-transform',
              startPending && 'opacity-70 pointer-events-none'
            )}
          >
            {startPending ? 'Starting…' : 'Start conversation'}
          </button>
          <button type="button" onClick={onClose} className="min-h-touch text-caption font-semibold text-ink-secondary py-2">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
