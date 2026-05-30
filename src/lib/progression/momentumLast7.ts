import type { ProgressionPersistedState } from './serverProgressionStore'

export type MomentumDayBucket = {
  /** `YYYY-MM-DD` in `timeZone`. */
  date: string
  xpEarned: number
  practiced: boolean
  /** Short label for charts (e.g. `Mon 21`). */
  labelShort: string
}

/**
 * Rolling seven calendar buckets ending on `now`, labeled in `timeZone`.
 * XP and practice flags come from persisted daily rollups.
 */
export function buildMomentumLast7Days(
  state: ProgressionPersistedState,
  now: Date,
  timeZone: string,
): MomentumDayBucket[] {
  const out: MomentumDayBucket[] = []
  for (let i = 6; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 86_400_000)
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(t)
    const row = state.dailyByDate[date]
    const xpEarned = row?.xpEarned ?? 0
    const practiced = xpEarned > 0 || (row?.completedUnits ?? 0) > 0
    const labelShort = new Intl.DateTimeFormat(undefined, {
      timeZone,
      weekday: 'short',
      day: 'numeric',
    }).format(t)
    out.push({ date, xpEarned, practiced, labelShort })
  }
  return out
}
