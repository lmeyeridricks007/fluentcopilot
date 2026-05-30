'use client'

import { useEffect, useRef } from 'react'
import { Sparkles, Flame } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { ExamPrepRetentionSummary } from '@/lib/exam-rewards/types'

/**
 * Single calm surface for exam-prep XP / streak / milestone — avoid stacking multiple toasts.
 */
export function ExamPrepRewardBanner({
  reward,
  className = '',
}: {
  reward: ExamPrepRetentionSummary | null
  className?: string
}) {
  const shownRef = useRef(false)

  useEffect(() => {
    if (!reward || shownRef.current) return
    shownRef.current = true
    track(ANALYTICS_EVENTS.exam_reward_shown, {
      total_xp: reward.totalXp,
      exam_habit_streak: reward.examHabitStreak,
      main_streak_extended: reward.mainStreakExtended,
    })
  }, [reward])

  if (!reward) return null

  return (
    <Card
      variant="outlined"
      padding="md"
      className={`border-primary-200/80 bg-primary-50/35 ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100/90 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary-700" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-body font-semibold text-ink-primary">{reward.primaryLine}</p>
          {reward.secondaryLine ? (
            <p className="text-body-sm text-ink-secondary leading-snug">{reward.secondaryLine}</p>
          ) : null}
          {reward.badgeLine && reward.badgeLine !== reward.primaryLine ? (
            <p className="text-caption font-medium text-primary-900/90">{reward.badgeLine}</p>
          ) : null}
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-caption text-ink-secondary">
            <span className="font-semibold text-ink-primary">+{reward.totalXp} XP total</span>
            {reward.mainStreakExtended ? (
              <span className="inline-flex items-center gap-1 font-medium text-ink-primary">
                <Flame className="w-3.5 h-3.5 text-warning" aria-hidden />
                Streak continued
              </span>
            ) : null}
            {reward.examHabitStreak >= 2 ? (
              <span>Exam-prep habit: {reward.examHabitStreak} days</span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  )
}
