'use client'

import { X } from 'lucide-react'

export function EndConversationConfirmModal({
  open,
  onClose,
  onConfirm,
  confirmPending,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  confirmPending?: boolean
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-conv-title"
    >
      <div className="w-full max-w-lg sm:rounded-2xl rounded-t-2xl bg-white border border-slate-200 shadow-xl overflow-hidden motion-safe:animate-fc-feedback-hero">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
          <h2 id="end-conv-title" className="text-body-sm font-bold text-ink-primary pr-2">
            Finish this conversation?
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={confirmPending}
            className="shrink-0 min-h-touch min-w-touch rounded-xl flex items-center justify-center text-ink-secondary hover:bg-surface-muted disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="px-4 py-3 text-caption text-ink-secondary leading-snug">
          We&apos;ll wrap up with a short recap — what went well, tweaks to try, and a useful phrase to keep.
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
          <button
            type="button"
            disabled={confirmPending}
            onClick={onClose}
            className="min-h-touch flex-1 rounded-xl border border-slate-200 text-body-sm font-semibold text-ink-primary px-4 py-3 hover:bg-surface-muted disabled:opacity-40"
          >
            Not yet
          </button>
          <button
            type="button"
            disabled={confirmPending}
            onClick={onConfirm}
            className="min-h-touch flex-1 rounded-xl bg-primary-600 text-white text-body-sm font-bold px-4 py-3 shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {confirmPending ? 'Ending…' : 'End & review'}
          </button>
        </div>
      </div>
    </div>
  )
}
