/**
 * UI-oriented helpers for exam readiness (tones, short labels).
 */
import type { PassLikelihoodLabel, ReadinessStateLabel, ReadinessTrend } from '@/lib/exam-readiness/types'

export function readinessTrendNl(trend: ReadinessTrend): string {
  switch (trend) {
    case 'improving':
      return 'Trend: je gaat vooruit'
    case 'stable':
      return 'Trend: redelijk stabiel'
    case 'slipping':
      return 'Trend: iets wisselvalliger'
    default:
      return ''
  }
}

export function readinessStateAccent(state: ReadinessStateLabel): {
  border: string
  badgeBg: string
  badgeText: string
} {
  switch (state) {
    case 'ready':
      return {
        border: 'border-emerald-200/90',
        badgeBg: 'bg-emerald-50',
        badgeText: 'text-emerald-900',
      }
    case 'close':
      return {
        border: 'border-violet-200/90',
        badgeBg: 'bg-violet-50',
        badgeText: 'text-violet-900',
      }
    case 'improving':
      return {
        border: 'border-amber-200/90',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-900',
      }
    case 'needs_work':
      return {
        border: 'border-orange-200/90',
        badgeBg: 'bg-orange-50',
        badgeText: 'text-orange-900',
      }
    default:
      return {
        border: 'border-slate-200',
        badgeBg: 'bg-slate-50',
        badgeText: 'text-slate-700',
      }
  }
}

export function passLikelihoodShortNl(label: PassLikelihoodLabel): string {
  switch (label) {
    case 'likely_ready':
      return 'Kansbeeld: op koers'
    case 'close_to_ready':
      return 'Kansbeeld: bijna'
    case 'improving_band':
      return 'Kansbeeld: groei'
    case 'needs_more_work':
      return 'Kansbeeld: nog bouwen'
    default:
      return 'Kansbeeld: nog meten'
  }
}
