'use client'

import type { LearningPathHeroModel } from '../types'

function momentumLines(hero: LearningPathHeroModel): { streak: string; week: string; xp: string } {
  const streak =
    hero.streak <= 0
      ? 'Start your rhythm — one lesson today counts.'
      : hero.streak === 1
        ? 'One day in a row. Tomorrow deepens the habit.'
        : `${hero.streak} days in a row — steady momentum.`

  const week =
    hero.weeklyMinutes <= 0
      ? 'This week’s minutes start with your next lesson.'
      : `${hero.weeklyMinutes} min this week — keep the investment going.`

  const xp =
    hero.xp <= 0
      ? 'XP grows as you finish lessons — first completion opens the tally.'
      : `${hero.xp.toLocaleString()} XP earned — every step adds up.`

  return { streak, week, xp }
}

/** Path orientation — framed as momentum, not a dashboard. */
export function PathSummaryStrip({ hero }: { hero: LearningPathHeroModel }) {
  const m = momentumLines(hero)

  return (
    <div className="rounded-2xl border border-primary-100/80 bg-gradient-to-br from-surface-elevated via-surface-elevated to-primary-50/25 px-4 py-3.5 shadow-sm ring-1 ring-slate-100/80">
      <div className="flex flex-wrap items-baseline justify-between gap-2 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="text-caption font-semibold text-primary-800 tabular-nums tracking-wide">
            {hero.currentStageBand} · {hero.currentStageTitle}
          </p>
          <p className="mt-1 text-body-sm text-ink-primary font-medium line-clamp-2 leading-snug">
            {hero.youCanNowLine}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">Path</p>
          <p className="text-title font-bold text-primary-900 tabular-nums leading-none mt-0.5">
            {hero.pathPercentComplete}%
          </p>
          <p className="text-[11px] text-ink-tertiary mt-0.5">through A2</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1.5 text-caption text-ink-secondary leading-snug">
        <p>{m.streak}</p>
        <p>{m.week}</p>
        <p className="text-ink-tertiary">{m.xp}</p>
      </div>
    </div>
  )
}
