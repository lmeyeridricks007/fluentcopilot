/**
 * Product-facing pass likelihood — not an official exam prediction.
 */
import type { PassLikelihoodLabel, ReadinessStateLabel } from '@/lib/exam-readiness/types'

export function passLikelihoodFromSignals(input: {
  readinessScore: number | null
  attemptCount: number
  recentPassRate: number | null
}): PassLikelihoodLabel {
  if (input.readinessScore == null || input.attemptCount < 2) return 'not_enough_data'
  const { readinessScore: s, attemptCount: n, recentPassRate: pr } = input
  if (s >= 80 && n >= 4 && (pr ?? 0) >= 0.7) return 'likely_ready'
  if (s >= 72 && n >= 3 && (pr ?? 0) >= 0.55) return 'close_to_ready'
  if (s >= 55) return 'improving_band'
  return 'needs_more_work'
}

export function readinessStateFromScore(
  score: number | null,
  attemptCount: number
): ReadinessStateLabel {
  if (score == null || attemptCount < 2) return 'needs_data'
  if (score >= 82) return 'ready'
  if (score >= 68) return 'close'
  if (score >= 52) return 'improving'
  return 'needs_work'
}

export function passLikelihoodNl(label: PassLikelihoodLabel): { title: string; sub: string } {
  switch (label) {
    case 'likely_ready':
      return {
        title: 'Lijkt goed op koers',
        sub: 'Geen officiële voorspelling — op basis van je recente examenoefeningen oogt dit stabiel genoeg om verder te simuleren of te plannen.',
      }
    case 'close_to_ready':
      return {
        title: 'Bijna examengericht klaar',
        sub: 'Nog een paar gerichte sessies op je zwakste onderdelen helpen om zekerder te worden.',
      }
    case 'improving_band':
      return {
        title: 'Je maakt stappen',
        sub: 'Blijf oefenen op de onderdelen die nog wisselen; consistentie is belangrijker dan één topdag.',
      }
    case 'needs_more_work':
      return {
        title: 'Nog ruimte om te bouwen',
        sub: 'Focus op training en korte drills voordat je een volledige simulatie als “echte” test ziet.',
      }
    default:
      return {
        title: 'Nog te weinig metingen',
        sub: 'Doe nog een paar examenoefeningen in verschillende onderdelen — dan wordt dit beeld betrouwbaarder.',
      }
  }
}
