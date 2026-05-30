import type { AbilityCardVm } from '@/lib/mastery/masteryPresenterModel'

export type ConfidenceTrendSummaryVm = {
  headline: string
  body: string
}

/**
 * One scannable line derived from practical ability trends (not charts).
 */
export function buildConfidenceTrendSummary(abilities: AbilityCardVm[]): ConfidenceTrendSummaryVm {
  if (abilities.length === 0) {
    return {
      headline: 'Confidence builds with reps',
      body: 'Short scenarios and reviews add up — your ability map will reflect it soon.',
    }
  }

  const improving = abilities.filter((a) => a.trend === 'improving')
  const slipping = abilities.filter((a) => a.trend === 'slipping' || a.trend === 'needs_refresh')
  const weak = abilities.filter((a) => a.band === 'weak')

  if (slipping.length > 0) {
    const a = slipping[0]!
    return {
      headline: `${a.title} wants a refresh`,
      body: `${a.trendLabel.toLowerCase()} — a short scenario or track keeps momentum.`,
    }
  }

  if (improving.length > 0) {
    const a = improving[0]!
    return {
      headline: `${a.title} is getting stronger`,
      body: `${a.trendLabel} — keep mixing real-life practice with review.`,
    }
  }

  if (weak.length > 0) {
    const a = weak[0]!
    return {
      headline: `${a.title} is still forming`,
      body: 'A guided or semi-guided run builds calm, repeatable phrases.',
    }
  }

  const strong = abilities.find((a) => a.band === 'strong')
  if (strong) {
    return {
      headline: `${strong.title} feels solid`,
      body: 'Push adjacent situations or free mode where you’re already strong.',
    }
  }

  return {
    headline: 'Steady progress across abilities',
    body: 'Keep your daily mission and one scenario — small habits compound.',
  }
}
