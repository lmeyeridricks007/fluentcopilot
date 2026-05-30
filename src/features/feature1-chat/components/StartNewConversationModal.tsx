'use client'

import { X } from 'lucide-react'

/**
 * When a train thread is already active, starting another must be explicit.
 */
export function StartNewConversationModal({
  open,
  title = 'Start a new conversation?',
  onClose,
  onContinueCurrent,
  onPauseAndStartNew,
  onEndAndReviewFirst,
}: {
  open: boolean
  title?: string
  onClose: () => void
  onContinueCurrent: () => void
  onPauseAndStartNew: () => void
  onEndAndReviewFirst: () => void
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-conv-title"
    >
      <div className="w-full max-w-lg sm:rounded-2xl rounded-t-2xl bg-white border border-slate-200 shadow-xl overflow-hidden max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
          <h2 id="new-conv-title" className="text-body-sm font-bold text-ink-primary pr-2">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 min-h-touch min-w-touch rounded-xl flex items-center justify-center text-ink-secondary hover:bg-surface-muted"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="px-4 pt-3 text-caption text-ink-secondary leading-snug">
          You already have an active train-station chat. Choose what to do with it before starting another.
        </p>
        <div className="p-4 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => {
              onContinueCurrent()
              onClose()
            }}
            className="w-full min-h-touch rounded-xl border border-slate-200 bg-surface-elevated text-body-sm font-semibold text-ink-primary px-4 py-3 text-left hover:bg-surface-muted"
          >
            Continue current conversation
          </button>
          <button
            type="button"
            onClick={() => {
              onPauseAndStartNew()
              onClose()
            }}
            className="w-full min-h-touch rounded-xl border border-primary-200 bg-primary-50/80 text-body-sm font-semibold text-primary-950 px-4 py-3 text-left hover:bg-primary-50"
          >
            Pause current &amp; start new
            <span className="block text-caption font-normal text-primary-800/90 mt-0.5">
              Your current thread stays in Paused — you can resume it later from Talk.
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              onEndAndReviewFirst()
              onClose()
            }}
            className="w-full min-h-touch rounded-xl border border-slate-200 bg-white text-body-sm font-semibold text-ink-primary px-4 py-3 text-left hover:bg-slate-50"
          >
            End current &amp; review first
            <span className="block text-caption font-normal text-ink-secondary mt-0.5">
              Finish with a recap, then start a fresh chat from Talk.
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
