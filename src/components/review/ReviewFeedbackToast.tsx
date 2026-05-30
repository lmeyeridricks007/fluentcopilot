'use client'

import { clsx } from 'clsx'
import { CheckCircle2, Sparkles, XCircle } from 'lucide-react'

export function ReviewFeedbackToast({
  visible,
  correct,
  message,
  className,
}: {
  visible: boolean
  correct: boolean
  message?: string
  className?: string
}) {
  if (!visible) return null
  return (
    <div
      className={clsx(
        'flex items-center gap-2 rounded-xl px-4 py-3 text-body-sm font-medium shadow-md animate-review-pop',
        correct ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200',
        className
      )}
      role="status"
    >
      {correct ? (
        <Sparkles className="w-5 h-5 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <XCircle className="w-5 h-5 shrink-0 text-rose-600" aria-hidden />
      )}
      <span>{message ?? (correct ? 'Nice!' : 'Almost — try again soon.')}</span>
      {correct ? <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-600 opacity-80" aria-hidden /> : null}
    </div>
  )
}
