'use client'

import { Button } from '@/components/ui/Button'
import { StreakBadge } from '@/components/review/StreakBadge'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { SessionCompleteMeta } from '@/lib/retention/retentionService'
import { pickPrimaryMilestone } from '@/lib/retention/milestoneDisplay'
import { useEffect, useMemo } from 'react'

export function ReviewCompletionScreen({
  correct,
  wrong,
  sessionMeta,
  onAgain,
  onBack,
  completionContext = 'default',
}: {
  correct: number
  wrong: number
  sessionMeta?: SessionCompleteMeta | null
  onAgain?: () => void
  onBack?: () => void
  completionContext?: 'default' | 'mistake_fix'
}) {
  const primaryMilestone = useMemo(
    () => pickPrimaryMilestone(sessionMeta?.milestones),
    [sessionMeta?.milestones]
  )

  useEffect(() => {
    if (primaryMilestone) {
      track(ANALYTICS_EVENTS.milestone_viewed, {
        count: 1,
        ids: [primaryMilestone.id],
        surface: 'review_complete',
      })
    }
  }, [primaryMilestone?.id])

  const total = correct + wrong
  const pct = total ? Math.round((correct / total) * 100) : 0
  const streak = sessionMeta?.streak ?? 0
  const xpGained = sessionMeta?.xpGained ?? 0

  return (
    <div className="px-4 py-10 max-w-lg mx-auto text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto text-primary-700 text-3xl font-bold animate-review-pop">
        {pct}%
      </div>
      <div className="space-y-2">
        <h2 className="text-title-sm font-bold text-ink-primary">Session complete</h2>
        <p className="text-body-sm text-ink-secondary">
          {correct} right · {wrong} to revisit · short sessions win.
        </p>
      </div>
      {xpGained > 0 ? (
        <p className="text-body font-semibold text-primary-700 tabular-nums">+{xpGained} XP</p>
      ) : null}
      {primaryMilestone ? (
        <div className="rounded-xl border border-slate-200 bg-surface-muted/50 px-4 py-3 text-left">
          <p className="text-caption font-semibold text-ink-secondary">{primaryMilestone.title}</p>
          <p className="text-body-sm text-ink-primary mt-1">{primaryMilestone.body}</p>
        </div>
      ) : null}
      {streak > 0 ? <StreakBadge streak={streak} className="mx-auto" /> : null}
      <div className="flex flex-col gap-2 pt-2">
        {onAgain ? (
          <Button type="button" fullWidth onClick={onAgain}>
            {completionContext === 'mistake_fix' ? 'Fix another round' : 'Review more'}
          </Button>
        ) : null}
        {onBack ? (
          <Button type="button" variant="secondary" fullWidth onClick={onBack}>
            Done
          </Button>
        ) : null}
      </div>
    </div>
  )
}
