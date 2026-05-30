'use client'

export function TypingIndicator({ label = 'NS assistant is typing' }: { label?: string }) {
  return (
    <div
      className="flex items-end gap-2 pl-1"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="w-8 h-8 rounded-full shrink-0 bg-slate-200/90 flex items-center justify-center text-caption">
        🚆
      </div>
      <div className="rounded-2xl rounded-bl-md bg-surface-muted border border-slate-200/80 px-3.5 py-2.5 max-w-[78%]">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-slate-400 motion-safe:animate-bounce"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
