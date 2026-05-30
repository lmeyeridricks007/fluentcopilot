import type { RetentionProfile } from '@/lib/retention/types'
import { LEADERBOARD_COHORT_KEY } from '@/lib/retention/constants'
import { isoWeekKey } from '@/lib/retention/xp'

export type CohortEntry = { id: string; label: string; weeklyXp: number; isYou?: boolean }

function readCohort(): CohortEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LEADERBOARD_COHORT_KEY)
    if (!raw) return defaultCohort()
    const p = JSON.parse(raw) as CohortEntry[]
    return Array.isArray(p) ? p : defaultCohort()
  } catch {
    return defaultCohort()
  }
}

/** Small static cohort for demo — replace with server cohort */
function defaultCohort(): CohortEntry[] {
  return [
    { id: 'p1', label: 'Learners near you', weeklyXp: 120 },
    { id: 'p2', label: 'Maya', weeklyXp: 95 },
    { id: 'p3', label: 'Jonas', weeklyXp: 88 },
    { id: 'p4', label: 'Sanne', weeklyXp: 72 },
  ]
}

/** Full sorted board for the current week (demo cohort + you). */
export function buildWeeklyLeaderboard(profile: RetentionProfile): CohortEntry[] {
  const yourXp = profile.leaderboard.weeklyXp
  const cohort = readCohort().map((c) => ({ ...c, isYou: false }))
  const combined = [...cohort, { id: 'you', label: 'You', weeklyXp: yourXp, isYou: true }]
  combined.sort((a, b) => b.weeklyXp - a.weeklyXp)
  return combined
}

export function computeWeeklyRank(profile: RetentionProfile): {
  weekKey: string
  rank: number
  total: number
  nearby: CohortEntry[]
  yourXp: number
} {
  const weekKey = profile.leaderboard.weekKey || isoWeekKey()
  const yourXp = profile.leaderboard.weeklyXp
  const combined = buildWeeklyLeaderboard(profile)
  const rank = combined.findIndex((c) => c.isYou) + 1
  const youIndex = rank - 1
  const nearby = combined.slice(Math.max(0, youIndex - 1), youIndex + 2)
  return {
    weekKey,
    rank: rank || combined.length,
    total: combined.length,
    nearby,
    yourXp,
  }
}
