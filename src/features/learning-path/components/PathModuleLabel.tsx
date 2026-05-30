'use client'

import { clsx } from 'clsx'

/** Lightweight cluster label between path nodes — reads as a stretch of the route. */
export function PathModuleLabel({
  title,
  kind,
  unitIndex,
  unitTotal,
}: {
  title: string
  kind: 'schema' | 'placeholder'
  /** 1-based index within the current stage (optional, for progression cue). */
  unitIndex?: number
  unitTotal?: number
}) {
  const cluster =
    kind === 'placeholder'
      ? 'Coming soon'
      : unitIndex != null && unitTotal != null && unitTotal > 1
        ? `Unit ${unitIndex} of ${unitTotal}`
        : 'Unit'

  return (
    <div
      className={clsx(
        'pl-[2.85rem] pr-2 pt-2 pb-0.5',
        kind === 'placeholder' && 'opacity-80'
      )}
    >
      <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wide line-clamp-1">
        {cluster} · {title}
      </p>
      {kind !== 'placeholder' ? (
        <p className="text-[10px] text-ink-tertiary/90 mt-0.5 leading-tight pl-0">
          Next stretch along the path
        </p>
      ) : null}
    </div>
  )
}
