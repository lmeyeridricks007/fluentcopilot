import { useRouter } from 'next/navigation'
import { AlertCircle, BookOpen, Crosshair, RotateCcw } from 'lucide-react'
import { clsx } from 'clsx'
import type { LearningPathActionModel } from '../types'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

function ActionTile({
  title,
  subtitle,
  icon,
  onClick,
  emphasis,
  badge,
  disabled,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  onClick: () => void
  emphasis?: boolean
  badge?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex flex-col items-stretch gap-2 rounded-2xl border p-3.5 text-left min-h-touch transition-all duration-200 active:scale-[0.99]',
        disabled && 'opacity-50 pointer-events-none',
        emphasis
          ? 'border-primary-300 bg-primary-50/80 shadow-sm'
          : 'border-slate-200 bg-surface-elevated hover:border-primary-200/60 hover:bg-surface-muted/40'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 shrink-0">
          {icon}
        </div>
        {badge ? (
          <span className="rounded-full bg-primary-600 px-2 py-0.5 text-caption font-bold text-white tabular-nums">
            {badge}
          </span>
        ) : null}
      </div>
      <div>
        <p className="font-semibold text-ink-primary text-body-sm">{title}</p>
        <p className="text-caption text-ink-secondary mt-0.5 line-clamp-2">{subtitle}</p>
      </div>
    </button>
  )
}

export function LearningActionCards({
  actions,
  onContinueLesson,
  continueDisabled,
}: {
  actions: LearningPathActionModel
  onContinueLesson: () => void
  continueDisabled?: boolean
}) {
  const router = useRouter()

  return (
    <div className="space-y-2">
      <p className="text-caption font-bold text-ink-secondary uppercase tracking-wide px-0.5">Quick actions</p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <ActionTile
          title="Daily review"
          subtitle={
            actions.dailyReviewDueCount > 0
              ? actions.dailyReviewEstMinutes > 0
                ? `Keep your Dutch fresh · ~${actions.dailyReviewEstMinutes} min`
                : 'Cards due now'
              : 'Nothing due — nice!'
          }
          icon={<RotateCcw className="w-5 h-5" aria-hidden />}
          onClick={() => {
            track(ANALYTICS_EVENTS.review_started, { surface: 'learning_path_quick_action', mode: 'daily' })
            router.push('/app/review/daily')
          }}
          emphasis={actions.dailyReviewDueCount > 0}
          badge={actions.dailyReviewDueCount > 0 ? String(actions.dailyReviewDueCount) : undefined}
        />
        <ActionTile
          title="Fix mistakes"
          subtitle={
            actions.weakTagsCount > 0
              ? 'Short recovery session from recent errors'
              : 'No tagged mistakes yet'
          }
          icon={<Crosshair className="w-5 h-5" aria-hidden />}
          onClick={() => {
            track(ANALYTICS_EVENTS.fix_mistakes_started, { surface: 'learning_path_quick_action' })
            router.push('/app/review/mistakes')
          }}
          badge={actions.weakTagsCount > 0 ? String(actions.weakTagsCount) : undefined}
        />
        <ActionTile
          title="Current lesson"
          subtitle={actions.continueLesson?.title ?? 'Pick a module to start'}
          icon={<BookOpen className="w-5 h-5" aria-hidden />}
          onClick={onContinueLesson}
          emphasis={Boolean(actions.continueLesson)}
          disabled={continueDisabled && Boolean(actions.continueLesson)}
        />
        <ActionTile
          title="Checkpoint"
          subtitle={actions.nextCheckpointLabel ?? 'Keep going — next stage unlocks with progress.'}
          icon={<AlertCircle className="w-5 h-5" aria-hidden />}
          onClick={() => router.push('/app/learn?tab=review')}
        />
      </div>
    </div>
  )
}
