'use client'

import { clsx } from 'clsx'

/** Subtle “partner is typing” row for guided / chat practice. */
export function CoachTypingIndicator({ label = 'Partner is typing…' }: { label?: string }) {
  return (
    <div
      className="flex gap-2 items-end px-1 py-1"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="w-9 h-9 rounded-full shrink-0 bg-slate-200 text-slate-600 flex items-center justify-center text-caption font-bold">
        …
      </div>
      <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm inline-flex items-center gap-1.5 min-h-[3rem]">
        <span className="sr-only">{label}</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={clsx(
              'w-2 h-2 rounded-full bg-primary-400/90',
              'motion-safe:animate-fc-typing-dot'
            )}
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
