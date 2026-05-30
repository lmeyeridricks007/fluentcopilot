import { clsx } from 'clsx'
import type { SkillTrackLevelLabel } from '@/lib/schemas/practice/skillTrack.schema'

const LABELS: Record<SkillTrackLevelLabel, string> = {
  beginner: 'Beginner',
  building: 'Building',
  strong: 'Strong',
  confident: 'Confident',
}

export function SkillTrackLevelBadge({
  label,
  index,
  compact,
}: {
  label: SkillTrackLevelLabel
  index: number
  compact?: boolean
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border font-medium',
        compact ? 'text-caption px-2 py-0.5' : 'text-body-sm px-3 py-1',
        label === 'beginner' && 'bg-slate-50 border-slate-200 text-ink-secondary',
        label === 'building' && 'bg-amber-50/80 border-amber-200 text-amber-900',
        label === 'strong' && 'bg-primary-50 border-primary-200 text-primary-900',
        label === 'confident' && 'bg-emerald-50 border-emerald-200 text-emerald-900'
      )}
    >
      L{index + 1} · {LABELS[label]}
    </span>
  )
}
