import type { B1ReadinessLevel, ReadinessEvaluation } from '@/lib/post-a2/types'

export type AbilityBandCounts = {
  weak: number
  improving: number
  strong: number
  total: number
}

export type ReadinessEvaluatorInput = {
  bands: AbilityBandCounts
  /** Distinct weak tags from self-check / review signals (count of tag rows or weighted). */
  weakTagsCount: number
  /** Weak practical abilities (titles) — sharper readiness copy when present */
  weakAbilityTitles?: string[]
}

/**
 * Lightweight, explainable B1 readiness — uses mastery bands + weak-tag pressure only.
 * Not an exam; supportive routing for Options A / B / C.
 */
function weakAbilityHint(titles: string[] | undefined): string {
  if (!titles?.length) return ''
  const t = titles.slice(0, 2).join(' · ')
  return t ? ` Weakest right now: ${t}.` : ''
}

export function evaluateReadinessForB1(input: ReadinessEvaluatorInput): ReadinessEvaluation {
  const { bands, weakTagsCount, weakAbilityTitles } = input
  const weakAbility = bands.weak
  const strongAbility = bands.strong

  let level: B1ReadinessLevel = 'nearly_ready'

  const heavyWeakSignal =
    weakAbility >= 4 || weakTagsCount >= 5 || (weakAbility >= 2 && weakTagsCount >= 3)
  const solidSignal =
    weakAbility <= 1 && strongAbility >= 5 && weakTagsCount <= 2 && bands.total >= 6

  if (heavyWeakSignal) level = 'strengthen_first'
  else if (solidSignal) level = 'ready'

  if (level === 'strengthen_first') {
    return {
      level,
      headline: 'Building toward B1 — real-life reps first',
      body: `Uneven skills after A2 are normal. A few targeted practice and fix sessions usually make B1 feel calmer.${weakAbilityHint(weakAbilityTitles)} This is coaching from your map, not an exam.`,
      reasonLine: reasonLineStrengthen(weakAbility, weakTagsCount, weakAbilityTitles),
    }
  }

  if (level === 'ready') {
    return {
      level,
      headline: 'You’re in a strong place for what’s next',
      body: 'Your practical map looks solid. B1 will stretch you — you can still deepen real-life Dutch anytime.',
      reasonLine: reasonLineReady(strongAbility, weakAbility),
    }
  }

  return {
    level: 'nearly_ready',
    headline: 'Almost B1-ready — a little polish goes a long way',
    body: `Polishing a few situations now keeps motivation high when grammar gets heavier.${weakAbilityHint(weakAbilityTitles)}`,
    reasonLine: reasonLineNearly(weakAbility, strongAbility, weakTagsCount, weakAbilityTitles),
  }
}

function reasonLineStrengthen(
  weakAbility: number,
  weakTags: number,
  titles?: string[]
): string {
  if (titles?.length)
    return `Strengthen ${titles.length >= 2 ? 'these abilities' : 'this ability'} in Practice, then revisit B1 when it feels calmer.`
  if (weakAbility >= 4)
    return 'Several practical abilities still want reps — targeted work now pays off quickly.'
  if (weakTags >= 5) return 'Review signals show sticky spots — smooth them before the level jump.'
  return 'A mix of weak areas and review tags suggests a short tune-up before B1.'
}

function reasonLineReady(strong: number, weak: number): string {
  if (weak === 0) return `${strong} areas already feel strong — a good moment to begin B1 when you want.`
  return `Strength across ${strong} practical areas gives you a solid base for B1.`
}

function reasonLineNearly(
  weak: number,
  strong: number,
  tags: number,
  titles?: string[]
): string {
  if (titles?.length === 1) return `Almost ready — ${titles[0]} is still the main drag.`
  if (titles && titles.length >= 2) return `Almost ready — focus ${titles[0]} and ${titles[1]} next.`
  if (weak >= 2 && tags >= 2)
    return 'Daily life may feel solid, but a few skills and review cues still want attention.'
  if (strong >= 4) return 'You’re strong in several situations — real-life reps will make B1 feel natural.'
  return 'You’re progressing evenly — a confidence phase in real-life Dutch is a strong next move.'
}
