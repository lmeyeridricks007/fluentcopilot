'use client'

import Link from 'next/link'
import { ArrowLeft, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useRetentionProfile } from '@/features/retention/useRetentionProfile'
import { buildWeeklyLeaderboard } from '@/lib/retention/leaderboard'
import { isoWeekKey } from '@/lib/retention/xp'

export function WeeklyLeaderboardPage() {
  const { profile } = useRetentionProfile()
  if (!profile) {
    return (
      <div className="px-4 py-10 max-w-lg mx-auto text-body-sm text-ink-secondary">
        Loading…
      </div>
    )
  }

  const board = buildWeeklyLeaderboard(profile)
  const weekKey = profile.leaderboard.weekKey || isoWeekKey()

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/app/talk"
          className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted -ml-2"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h1 className="text-title font-bold text-ink-primary tracking-tight">This week</h1>
          <p className="text-caption text-ink-secondary mt-0.5">Demo group · week {weekKey}</p>
        </div>
      </div>

      <Card variant="flat" padding="md" className="border border-slate-200/90 bg-surface-elevated">
        <p className="text-body-sm text-ink-secondary leading-relaxed">
          Rankings use your weekly XP on this device plus a small sample cohort. Full leaderboards will use your real
          study group later.
        </p>
      </Card>

      <section aria-label="Weekly leaderboard">
        <h2 className="text-caption font-semibold text-ink-secondary uppercase tracking-wide mb-2">Leaderboard</h2>
        <ol className="space-y-2">
          {board.map((row, i) => (
            <li key={row.id}>
              <Card
                variant="outlined"
                padding="sm"
                className={
                  row.isYou
                    ? 'border-primary-200 bg-primary-50/40'
                    : 'border-slate-200/90 bg-surface-elevated'
                }
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-caption font-bold shrink-0 ${
                      i === 0
                        ? 'bg-amber-100 text-amber-900'
                        : i === 1
                          ? 'bg-slate-200 text-ink-primary'
                          : i === 2
                            ? 'bg-orange-100 text-orange-900'
                            : 'bg-surface-muted text-ink-secondary'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {i === 0 ? <Trophy className="w-4 h-4 text-amber-600 shrink-0" aria-hidden /> : null}
                    <span className={`text-body-sm font-medium truncate ${row.isYou ? 'text-primary-900' : 'text-ink-primary'}`}>
                      {row.label}
                      {row.isYou ? ' (you)' : ''}
                    </span>
                  </div>
                  <span className="text-body-sm font-semibold tabular-nums text-ink-primary shrink-0">
                    {row.weeklyXp} XP
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
