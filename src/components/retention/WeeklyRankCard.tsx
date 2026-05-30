'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { computeWeeklyRank } from '@/lib/retention/leaderboard'
import type { RetentionProfile } from '@/lib/retention/types'

const DEFAULT_LEADERBOARD_HREF = '/app/leaderboard'

export function WeeklyRankCard({
  profile,
  onOpen,
}: {
  profile: RetentionProfile | null
  /** Override navigation (default: full weekly leaderboard screen). */
  onOpen?: () => void
}) {
  const router = useRouter()
  if (!profile) return null
  const hasPractice =
    profile.totalXp > 0 ||
    profile.completedLessonIds.length > 0 ||
    profile.leaderboard.weeklyXp > 0
  if (!hasPractice) return null

  const { rank, total, weekKey, yourXp } = computeWeeklyRank(profile)

  const openLeaderboard = () => {
    track(ANALYTICS_EVENTS.leaderboard_viewed, { weekKey, rank, yourXp, surface: 'home_card' })
    if (onOpen) onOpen()
    else router.push(DEFAULT_LEADERBOARD_HREF)
  }

  return (
    <Card variant="outlined" padding="md" className="w-full border-slate-200/80">
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-3 text-left min-h-touch"
        onClick={openLeaderboard}
      >
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-slate-600" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-ink-primary">This week (demo group)</p>
          <p className="text-caption text-ink-secondary mt-0.5 leading-snug">
            You’re <span className="font-medium text-ink-primary">#{rank}</span> of {total} ·{' '}
            <span className="tabular-nums">{yourXp}</span> XP. Full leaderboards will use your real cohort later.
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
      </button>
    </Card>
  )
}
