export type MasterySnapshotTrendArrow = 'up' | 'down' | 'steady'

export type MasterySnapshotRowVm = {
  id: string
  title: string
  bandLabel: string
  band: 'weak' | 'improving' | 'strong'
  trendLabel: string
  href: string
  /** Compact “why this status” for coaching feel */
  statusWhy?: string | null
  trendArrow?: MasterySnapshotTrendArrow
  /** Short weekly-style nudge (heuristic, not a stored metric) */
  momentumHint?: string | null
  ctaLabel: string
}
