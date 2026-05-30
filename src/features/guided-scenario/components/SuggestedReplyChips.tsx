import { clsx } from 'clsx'
import type { GuidedSuggestedReply } from '@/lib/schemas/practice/guidedScenarioDefinition.schema'

export function SuggestedReplyChips({
  replies,
  maxVisible,
  selectedId,
  onPickReply,
  disabled,
}: {
  replies: GuidedSuggestedReply[]
  maxVisible: number
  selectedId: string | null
  onPickReply: (reply: GuidedSuggestedReply) => void
  disabled?: boolean
}) {
  const visible = replies.slice(0, maxVisible)
  const hiddenCount = replies.length - visible.length

  return (
    <div className="space-y-2">
      <p className="text-caption font-medium text-ink-secondary">Starting ideas — tap to load, then edit or send</p>
      <div className="flex flex-col gap-2">
        {visible.map((r) => (
          <button
            key={r.id}
            type="button"
            disabled={disabled}
            onClick={() => onPickReply(r)}
            className={clsx(
              'text-left rounded-xl border px-3 py-2.5 min-h-touch text-body-sm leading-snug transition-colors',
              selectedId === r.id
                ? 'border-primary-400 bg-primary-50 text-ink-primary'
                : 'border-slate-200 bg-surface-elevated text-ink-primary hover:border-primary-200',
              disabled && 'opacity-50 pointer-events-none'
            )}
          >
            <span className="font-medium">{r.nl}</span>
            {r.en ? <span className="block text-caption text-ink-secondary mt-0.5">{r.en}</span> : null}
          </button>
        ))}
      </div>
      {hiddenCount > 0 ? (
        <p className="text-caption text-ink-tertiary">
          +{hiddenCount} more — type your own version below.
        </p>
      ) : null}
    </div>
  )
}
