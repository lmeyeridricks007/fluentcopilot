'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronRight,
  Circle,
  Flag,
  Lock,
  PlayCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { clsx } from 'clsx'
import { LessonTypeBadge } from './LessonTypeBadge'
import type { LessonRowModel } from '../types'
import {
  clearPathNodeCelebration,
  peekPathNodeCelebrationLessonId,
} from '@/lib/learning-path/pathNodeCelebration'

export type PathNodeVisualKind =
  | 'next'
  | 'active_progress'
  | 'completed'
  | 'locked'
  | 'review'
  | 'standard'

function resolveVisualKind(row: LessonRowModel): PathNodeVisualKind {
  if (row.isLocked) return 'locked'
  if (row.isNext) return 'next'
  if (row.badge === 'review' && row.status !== 'completed') return 'review'
  if (row.status === 'completed') return 'completed'
  if (row.status === 'in_progress') return 'active_progress'
  return 'standard'
}

function RailDot({
  kind,
  milestone,
}: {
  kind: PathNodeVisualKind
  milestone: boolean
}) {
  const dim = milestone
    ? 'h-10 w-10 min-h-[2.5rem] min-w-[2.5rem] border-[2.5px]'
    : 'h-8 w-8 border-2'
  const base = clsx(
    'flex shrink-0 items-center justify-center rounded-full transition-all duration-200 z-[1] bg-surface-elevated',
    dim
  )

  switch (kind) {
    case 'next':
      return (
        <div
          className={clsx(
            base,
            'border-primary-600 bg-primary-50 shadow-md ring-2 ring-primary-300/70',
            milestone ? 'scale-105' : 'scale-110'
          )}
          aria-hidden
        >
          <Sparkles
            className={clsx(milestone ? 'w-5 h-5' : 'w-4 h-4', 'text-primary-700')}
            aria-hidden
          />
        </div>
      )
    case 'completed':
      return (
        <div
          className={clsx(
            base,
            'border-success/55 bg-success/[0.12] text-success shadow-sm'
          )}
          aria-hidden
        >
          <Check className={milestone ? 'w-5 h-5' : 'w-4 h-4'} strokeWidth={2.5} />
        </div>
      )
    case 'active_progress':
      return (
        <div
          className={clsx(base, 'border-primary-500 bg-primary-50 ring-1 ring-primary-200/80')}
          aria-hidden
        >
          <PlayCircle
            className={clsx(milestone ? 'w-5 h-5' : 'w-4 h-4', 'text-primary-800')}
            aria-hidden
          />
        </div>
      )
    case 'review':
      return (
        <div
          className={clsx(
            base,
            'border-violet-300/90 bg-violet-50 ring-1 ring-violet-200/60'
          )}
          aria-hidden
        >
          <RotateCcw
            className={clsx(milestone ? 'w-5 h-5' : 'w-4 h-4', 'text-violet-700')}
            aria-hidden
          />
        </div>
      )
    case 'locked':
      return (
        <div
          className={clsx(base, 'border-slate-200 bg-slate-50/90 text-ink-tertiary')}
          aria-hidden
        >
          <Lock className={milestone ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        </div>
      )
    default:
      if (milestone) {
        return (
          <div className={clsx(base, 'border-slate-300 bg-slate-50/90')} aria-hidden>
            <Flag className="w-4 h-4 text-slate-700" />
          </div>
        )
      }
      return (
        <div className={clsx(base, 'border-slate-200 bg-surface-elevated')} aria-hidden>
          <Circle className="w-3 h-3 text-slate-400 fill-slate-200/80" />
        </div>
      )
  }
}

export function PathLessonNode({
  row,
  onOpen,
  scrollOnMount,
}: {
  row: LessonRowModel
  onOpen: () => void
  /** Scroll this node into view when it’s the “next” lesson. */
  scrollOnMount?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const visual = resolveVisualKind(row)
  const milestone = row.badge === 'checkpoint'
  const [celebrate, setCelebrate] = useState(false)
  const prevStatus = useRef<LessonRowModel['status'] | null>(null)

  useEffect(() => {
    if (!ref.current || !scrollOnMount) return
    ref.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [scrollOnMount])

  useEffect(() => {
    const matchReturn = peekPathNodeCelebrationLessonId() === row.lessonId
    if (matchReturn) clearPathNodeCelebration()

    const prior = prevStatus.current
    const transitioned =
      prior !== null && prior !== 'completed' && row.status === 'completed'

    prevStatus.current = row.status

    if (matchReturn || transitioned) {
      setCelebrate(true)
      const id = window.setTimeout(() => setCelebrate(false), 720)
      return () => window.clearTimeout(id)
    }
  }, [row.lessonId, row.status])

  const railPad = milestone ? 'pt-4' : 'pt-3'

  return (
    <div
      ref={ref}
      className={clsx('relative flex gap-3 scroll-mt-28', milestone && 'my-1.5')}
    >
      <div className={clsx('flex shrink-0 justify-center', milestone ? 'w-11' : 'w-8')}>
        <div className={railPad}>
          <RailDot kind={visual} milestone={milestone} />
        </div>
      </div>
      <button
        type="button"
        disabled={row.isLocked}
        onClick={onOpen}
        title={row.isLocked ? 'Complete prior steps to unlock' : undefined}
        className={clsx(
          'group flex-1 min-w-0 text-left rounded-2xl border min-h-touch transition-[transform,box-shadow,border-color,background-color] duration-200',
          'active:scale-[0.99] motion-reduce:transition-none',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
          milestone ? 'px-4 py-4' : 'px-3.5 py-3',
          celebrate && 'motion-safe:animate-path-node-complete',
          visual === 'next' &&
            !row.isLocked &&
            clsx(
              'motion-safe:animate-path-next-invite',
              milestone
                ? 'border-primary-500 bg-gradient-to-br from-primary-50 via-surface-elevated to-primary-50/35 shadow-lg ring-2 ring-primary-200/80 border-2'
                : 'border-primary-500/85 bg-gradient-to-br from-primary-50 to-surface-elevated shadow-lg ring-2 ring-primary-200/70 border-2'
            ),
          visual === 'completed' &&
            !row.isLocked &&
            !milestone &&
            'border-success/30 bg-gradient-to-br from-success/[0.06] to-surface-elevated shadow-sm',
          visual === 'completed' && !row.isLocked && milestone && 'border-success/35 bg-gradient-to-b from-success/[0.08] to-surface-elevated shadow-sm',
          visual === 'active_progress' &&
            !row.isLocked &&
            'border-primary-300/80 bg-primary-50/50 hover:border-primary-400 hover:shadow-sm',
          visual === 'review' &&
            !row.isLocked &&
            'border-violet-200/90 bg-violet-50/35 hover:border-violet-300 hover:shadow-sm',
          visual === 'standard' &&
            !row.isLocked &&
            !milestone &&
            'border-slate-200/90 bg-surface-elevated hover:border-slate-300 hover:shadow-sm',
          visual === 'standard' && !row.isLocked && milestone && 'border-slate-300/80 bg-gradient-to-b from-slate-50/95 to-surface-elevated hover:border-slate-400/70 hover:shadow',
          row.isLocked && 'border-slate-100 bg-surface-muted/35 opacity-[0.72] pointer-events-none saturate-50'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 gap-y-1">
          {milestone ? (
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Milestone
            </span>
          ) : null}
          {visual === 'next' && !row.isLocked ? (
            <span className="inline-flex items-center rounded-full bg-primary-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
              Next
            </span>
          ) : null}
          <LessonTypeBadge kind={row.badge} compact />
        </div>
        <p
          className={clsx(
            'mt-1.5 font-semibold text-ink-primary leading-snug line-clamp-2',
            milestone ? 'text-body-lg' : 'text-body',
            visual === 'next' && !row.isLocked && 'text-primary-950'
          )}
        >
          {row.title}
        </p>
        {row.goalLine && visual !== 'locked' ? (
          <p className="mt-0.5 text-caption text-ink-tertiary line-clamp-2">{row.goalLine}</p>
        ) : null}
        <p className="mt-1 text-caption text-ink-secondary tabular-nums">
          {row.durationMinutes} min
          {row.status === 'in_progress' ? ' · In progress' : ''}
        </p>
        {visual === 'next' && !row.isLocked ? (
          <p className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-primary-700/[0.07] px-2.5 py-2 text-body-sm font-semibold text-primary-900 ring-1 ring-primary-200/50">
            <span>Continue this step</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-primary-700 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
          </p>
        ) : null}
      </button>
    </div>
  )
}
