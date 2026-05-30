export function ConversationProgress({
  userTurnsDone,
  totalHint,
}: {
  userTurnsDone: number
  totalHint: number
}) {
  const pct = Math.min(100, Math.round((userTurnsDone / Math.max(totalHint, 1)) * 100))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-caption text-ink-secondary">
        <span>Your turns</span>
        <span>
          {userTurnsDone} / ~{totalHint}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full bg-slate-200 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary-500 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
