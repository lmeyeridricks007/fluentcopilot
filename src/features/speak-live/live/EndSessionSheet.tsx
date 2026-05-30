'use client'

import { clsx } from 'clsx'
import { PhoneOff, MessageCircle, Bookmark } from 'lucide-react'

export type EndSessionChoice = 'end_evaluate' | 'continue' | 'save_exit'

export function EndSessionSheet({
  open,
  busy,
  onClose,
  onChoose,
}: {
  open: boolean
  busy: boolean
  onClose: () => void
  onChoose: (c: EndSessionChoice) => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col justify-end bg-slate-900/40 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="end-sheet-title"
    >
      <button type="button" className="flex-1 min-h-0 w-full cursor-default" aria-label="Dismiss sheet" onClick={() => (busy ? null : onClose())} />
      <div className="rounded-t-3xl border border-slate-200 bg-surface-elevated px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-elevated max-w-lg mx-auto w-full">
        <h2 id="end-sheet-title" className="text-body-sm font-semibold text-ink-primary text-center">
          Wrap up here?
        </h2>
        <p className="text-caption text-ink-secondary text-center mt-1 mb-4">
          Finishing ends the call and opens your feedback. Pause is just a pause — it does not wrap things up.
        </p>
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose('end_evaluate')}
              className="min-h-touch w-full rounded-lg bg-gradient-to-r from-rose-500 to-rose-700 text-white text-body-sm font-bold px-4 py-3 inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <PhoneOff className="w-5 h-5 shrink-0" aria-hidden />
              Finish &amp; open feedback
            </button>
            <p className="text-[11px] text-rose-800 mt-2 leading-snug px-0.5">
              Saves your session on the server and takes you to your full voice report.
            </p>
          </div>

          <div>
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose('continue')}
              className="min-h-touch w-full rounded-xl border border-slate-200 bg-white text-body-sm font-semibold text-ink-primary px-4 py-3 inline-flex items-center justify-center gap-2 disabled:opacity-50 shadow-card"
            >
              <MessageCircle className="w-5 h-5 shrink-0" aria-hidden />
              Keep going
            </button>
            <p className="text-[11px] text-ink-secondary mt-2 leading-snug px-0.5">Close this sheet and stay in the call.</p>
          </div>

          <div>
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose('save_exit')}
              className="min-h-touch w-full rounded-xl border border-amber-200 bg-amber-50 text-body-sm font-semibold text-amber-950 px-4 py-3 inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Bookmark className="w-5 h-5 shrink-0" aria-hidden />
              Save for later
            </button>
            <p className="text-[11px] text-amber-900 mt-2 leading-snug px-0.5">
              We save your spot so you can pick this up again. Feedback waits until you finish for real.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className={clsx('mt-4 w-full text-center text-caption text-ink-tertiary py-2', busy && 'opacity-40')}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
