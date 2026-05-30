import { CheckCircle2, Circle, Lock, PlayCircle, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { LessonTypeBadge } from './LessonTypeBadge'
import type { LessonRowModel } from '../types'

export function LessonRow({
  row,
  onOpen,
}: {
  row: LessonRowModel
  onOpen: () => void
}) {
  const statusIcon =
    row.status === 'completed' ? (
      <CheckCircle2 className="w-5 h-5 text-success shrink-0" aria-hidden />
    ) : row.status === 'in_progress' ? (
      <PlayCircle className="w-5 h-5 text-primary-600 shrink-0" aria-hidden />
    ) : (
      <Circle className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
    )

  return (
    <button
      type="button"
      disabled={row.isLocked}
      onClick={onOpen}
      title={row.isLocked ? 'Complete prior steps to unlock.' : undefined}
      className={clsx(
        'w-full flex items-start gap-3 px-3 py-3 sm:px-4 text-left rounded-xl border transition-all duration-200 min-h-touch',
        row.isNext && !row.isLocked
          ? 'border-primary-300 bg-primary-50/50 shadow-sm'
          : 'border-transparent bg-surface-muted/40 hover:bg-surface-muted',
        row.isLocked && 'opacity-55 pointer-events-none'
      )}
    >
      <div className="pt-0.5">{statusIcon}</div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2 gap-y-1">
          <LessonTypeBadge kind={row.badge} compact />
          {row.isNext && !row.isLocked ? (
            <span className="inline-flex items-center gap-0.5 text-caption font-bold text-primary-700 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" aria-hidden />
              Next
            </span>
          ) : null}
        </div>
        <p className="font-medium text-ink-primary text-body-sm leading-snug line-clamp-2">{row.title}</p>
        {row.goalLine ? (
          <p className="text-caption text-ink-tertiary line-clamp-1">{row.goalLine}</p>
        ) : null}
        <p className="text-caption text-ink-secondary tabular-nums">{row.durationMinutes} min</p>
      </div>
      {row.isLocked ? <Lock className="w-4 h-4 text-ink-tertiary shrink-0 mt-1" aria-hidden /> : null}
    </button>
  )
}
