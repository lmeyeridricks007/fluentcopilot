'use client'

import { useRouter } from 'next/navigation'
import { Crosshair, Flag, RotateCcw } from 'lucide-react'
import { clsx } from 'clsx'
import type { LearningPathActionModel } from '../types'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

function Pill({
  icon,
  label,
  hint,
  onClick,
  badge,
  emphasis,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  onClick: () => void
  badge?: string
  emphasis?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 min-h-touch text-left transition-all duration-150',
        'active:scale-[0.98]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
        emphasis
          ? 'border-primary-300/70 bg-primary-50/60 shadow-sm'
          : 'border-slate-200/90 bg-surface-elevated hover:border-slate-300'
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-primary-700">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="text-body-sm font-semibold text-ink-primary">{label}</span>
          {badge ? (
            <span className="rounded-full bg-primary-700 px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="block text-[11px] text-ink-tertiary leading-tight truncate max-w-[10rem] sm:max-w-[14rem]">
          {hint}
        </span>
      </span>
    </button>
  )
}

/** Secondary habit loops — horizontal, does not compete with the path. */
export function PathSupportingRow({ actions }: { actions: LearningPathActionModel }) {
  const router = useRouter()

  return (
    <div className="space-y-2">
      <p className="text-caption font-medium text-ink-tertiary px-0.5">Keep momentum</p>
      <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Pill
          icon={<RotateCcw className="w-4 h-4" aria-hidden />}
          label="Daily review"
          hint={
            actions.dailyReviewDueCount > 0
              ? actions.dailyReviewEstMinutes > 0
                ? `~${actions.dailyReviewEstMinutes} min queued`
                : 'Cards ready — quick pass'
              : 'Queue clear — path time works too'
          }
          badge={actions.dailyReviewDueCount > 0 ? String(actions.dailyReviewDueCount) : undefined}
          emphasis={actions.dailyReviewDueCount > 0}
          onClick={() => {
            track(ANALYTICS_EVENTS.review_started, { surface: 'learn_path_support', mode: 'daily' })
            router.push('/app/review/daily')
          }}
        />
        <Pill
          icon={<Crosshair className="w-4 h-4" aria-hidden />}
          label="Fix mistakes"
          hint={actions.weakTagsCount > 0 ? 'Turn slips into reps' : 'No repair tags — clean run'}
          badge={actions.weakTagsCount > 0 ? String(actions.weakTagsCount) : undefined}
          emphasis={actions.weakTagsCount > 0}
          onClick={() => {
            track(ANALYTICS_EVENTS.fix_mistakes_started, { surface: 'learn_path_support' })
            router.push('/app/review/mistakes')
          }}
        />
        <Pill
          icon={<Flag className="w-4 h-4" aria-hidden />}
          label="Checkpoint"
          hint={actions.nextCheckpointLabel ?? 'Next stage tracks your pace.'}
          onClick={() => router.push('/app/learn?tab=review')}
        />
      </div>
    </div>
  )
}
