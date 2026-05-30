'use client'

import { clsx } from 'clsx'

/**
 * Framing for a single-pack interactive session: progress, optional XP hint, exercise surface.
 */
export function ExercisePackSessionShell(props: {
  packTitle: string
  packSubtitle?: string
  /** When `compact`, hides the duplicate title block — use when the parent page already shows the pack title. */
  sessionChrome?: 'default' | 'compact'
  phaseLabel: string
  stepIndex: number
  stepTotal: number
  completedCount: number
  /** Short line under progress — e.g. XP / streak hint */
  xpHint?: string
  /** Optional second line — e.g. practice-depth preview (not a payout promise). */
  xpPreviewLine?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  const {
    packTitle,
    packSubtitle,
    sessionChrome = 'default',
    phaseLabel,
    stepIndex,
    stepTotal,
    completedCount,
    xpHint,
    xpPreviewLine,
    children,
    footer,
    className,
  } = props
  const pct = stepTotal > 0 ? Math.round((completedCount / stepTotal) * 100) : 0

  return (
    <div className={clsx('space-y-3', className)}>
      <div className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm space-y-2 ring-1 ring-slate-900/[0.02]">
        {sessionChrome === 'compact' ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">This session</p>
            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
              {phaseLabel}
            </span>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Pack</p>
              <h2 className="text-body font-bold text-ink-primary tracking-tight truncate">{packTitle}</h2>
              {packSubtitle ? <p className="text-caption text-ink-secondary line-clamp-2">{packSubtitle}</p> : null}
            </div>
            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
              {phaseLabel}
            </span>
          </div>
        )}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-[11px] font-medium text-slate-600">
            <span className="tabular-nums text-ink-primary">
              Beat {Math.min(stepIndex + 1, Math.max(stepTotal, 1))} of {stepTotal}
              <span className="text-slate-400"> · </span>
              {pct}% done
            </span>
          </div>
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-primary-500/90 transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
          </div>
          {xpHint ? <p className="text-[11px] leading-snug text-slate-600">{xpHint}</p> : null}
          {xpPreviewLine ? <p className="text-[10px] leading-snug text-slate-500">{xpPreviewLine}</p> : null}
        </div>
      </div>

      {children}

      {footer}
    </div>
  )
}
