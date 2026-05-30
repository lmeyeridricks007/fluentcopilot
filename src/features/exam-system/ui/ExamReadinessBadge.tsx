import { clsx } from 'clsx'
import type { ReadinessBand } from '@/lib/exam-system/types'

const bandStyles: Record<ReadinessBand, string> = {
  ready: 'bg-emerald-950/90 text-emerald-50 ring-1 ring-emerald-700/40',
  borderline: 'bg-amber-950/90 text-amber-50 ring-1 ring-amber-700/40',
  not_ready: 'bg-slate-800 text-slate-100 ring-1 ring-slate-600/50',
}

export function ExamReadinessBadge(props: {
  band: ReadinessBand | string
  className?: string
  /** Readable on dark hero backgrounds. */
  appearance?: 'default' | 'onDark'
}) {
  const b = props.band as ReadinessBand
  const style =
    props.appearance === 'onDark'
      ? 'bg-white/18 text-white ring-1 ring-white/25'
      : (bandStyles[b] ?? 'bg-slate-700 text-white ring-1 ring-slate-600/40')
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em]',
        style,
        props.className,
      )}
    >
      {props.band.replace(/_/g, ' ')}
    </span>
  )
}
