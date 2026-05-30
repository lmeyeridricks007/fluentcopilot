import type { AbilityCardVm } from '@/lib/mastery/masteryPresenterModel'
import type { MasterySnapshotRowVm, MasterySnapshotTrendArrow } from '@/lib/dashboard/dashboardTypes'
import type { AbilityConfidenceTrendUi } from '@/lib/schemas/practice/abilityMasteryState.schema'

function trendArrow(t: AbilityConfidenceTrendUi): MasterySnapshotTrendArrow {
  if (t === 'improving') return 'up'
  if (t === 'slipping' || t === 'needs_refresh') return 'down'
  return 'steady'
}

function momentumHintFor(a: AbilityCardVm): string | null {
  if (a.band === 'weak') return 'Priority rep — small wins move the map.'
  if (a.trend === 'improving') return 'Keep the rhythm — you’re gaining here.'
  if (a.trend === 'slipping') return 'Light tune-up — bring it back before it drifts.'
  if (a.trend === 'needs_refresh') return 'Quick refresh keeps this automatic.'
  return null
}

function ctaForSnapshot(a: AbilityCardVm): string {
  if (a.band === 'weak') return 'Practice this now'
  if (a.band === 'improving') return a.trend === 'slipping' ? 'Fix this in 3 min' : 'Strengthen here'
  return 'Keep pressure on'
}

export function buildMasterySnapshotRows(flat: AbilityCardVm[]): MasterySnapshotRowVm[] {
  if (flat.length === 0) return []
  const weak = flat.filter((a) => a.band === 'weak')
  const improving = flat.filter((a) => a.band === 'improving')
  const strong = flat.filter((a) => a.band === 'strong')

  const picked: AbilityCardVm[] = []
  for (const a of weak.slice(0, 2)) picked.push(a)
  for (const a of improving) {
    if (picked.length >= 3) break
    if (!picked.includes(a)) picked.push(a)
  }
  for (const a of strong) {
    if (picked.length >= 3) break
    if (!picked.includes(a)) picked.push(a)
  }
  for (const a of flat) {
    if (picked.length >= 3) break
    if (!picked.includes(a)) picked.push(a)
  }

  return picked.slice(0, 3).map((a) => ({
    id: a.id,
    title: a.title,
    bandLabel: a.bandLabel,
    band: a.band,
    trendLabel: a.trendLabel,
    href: `/app/progress/abilities/${encodeURIComponent(a.id)}`,
    statusWhy: a.weaknessNote ?? a.nextPractice.detail,
    trendArrow: trendArrow(a.trend),
    momentumHint: momentumHintFor(a),
    ctaLabel: ctaForSnapshot(a),
  }))
}
