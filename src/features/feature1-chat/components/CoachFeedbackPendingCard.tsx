'use client'

/**
 * Shown after the assistant reply lands while per-turn coach enrichment is still in flight.
 */
export function CoachFeedbackPendingCard() {
  return (
    <div
      className="ml-10 mr-0 max-w-[min(100%,24rem)] rounded-xl border border-amber-200/55 bg-amber-50/40 px-3 py-2.5 motion-safe:animate-fc-feedback-hero"
      role="status"
      aria-live="polite"
      aria-label="Coach is checking your last message"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900/75">Coach</p>
      <p className="text-caption font-medium text-ink-primary mt-1 leading-snug">Coach is checking this…</p>
      <p className="text-[11px] text-ink-secondary mt-1 leading-snug">
        Quick tips and save suggestions load in a moment.
      </p>
      <div className="mt-2.5 flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1 w-1 rounded-full bg-amber-400/80 motion-safe:animate-fc-typing-dot"
            style={{ animationDelay: `${i * 140}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
