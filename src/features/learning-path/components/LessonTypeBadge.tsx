import { clsx } from 'clsx'
import {
  Ear,
  Flag,
  GitBranch,
  Headphones,
  MessageCircle,
  PenLine,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react'
import type { LearningPathLessonBadge } from '../types'

const CONFIG: Record<
  LearningPathLessonBadge,
  { label: string; icon: typeof Ear; className: string }
> = {
  listening: {
    label: 'Listening',
    icon: Ear,
    className: 'bg-violet-50 text-violet-800 border-violet-200/80',
  },
  listening_reading: {
    label: 'Listen & read',
    icon: Headphones,
    className: 'bg-indigo-50 text-indigo-900 border-indigo-200/80',
  },
  grammar_patterns: {
    label: 'Grammar & patterns',
    icon: GitBranch,
    className: 'bg-violet-50 text-violet-900 border-violet-200/80',
  },
  speaking: {
    label: 'Speaking',
    icon: MessageCircle,
    className: 'bg-emerald-50 text-emerald-900 border-emerald-200/80',
  },
  writing: {
    label: 'Writing',
    icon: PenLine,
    className: 'bg-amber-50 text-amber-900 border-amber-200/80',
  },
  real_life_task: {
    label: 'Real-life task',
    icon: ShoppingBag,
    className: 'bg-orange-50 text-orange-900 border-orange-200/80',
  },
  review: {
    label: 'Review',
    icon: RotateCcw,
    className: 'bg-slate-100 text-slate-800 border-slate-200',
  },
  checkpoint: {
    label: 'Checkpoint',
    icon: Flag,
    className: 'bg-slate-50 text-slate-900 border-slate-300/90',
  },
}

export function LessonTypeBadge({
  kind,
  compact,
}: {
  kind: LearningPathLessonBadge
  compact?: boolean
}) {
  const c = CONFIG[kind] ?? CONFIG.listening
  const Icon = c.icon
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-semibold shrink-0',
        c.className,
        compact && 'px-1.5'
      )}
      {...(compact ? { 'aria-label': c.label, title: c.label } : {})}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {!compact ? c.label : null}
    </span>
  )
}
