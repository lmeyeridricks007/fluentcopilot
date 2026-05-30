import type { ListeningLevel } from '@/lib/listening-mode/schema'

/**
 * Level-aware *content* shaping (copy complexity, implied context, pacing expectations).
 * Speech *rates* stay in {@link listeningLevelRules} / `effectiveSpeechRate`.
 */
export type ListeningLevelContentBand = {
  tier: 'foundational' | 'standard' | 'stretch'
  /** Encourage fewer implied referents in prompts. */
  impliedContext: 'low' | 'medium' | 'high'
  /** How aggressively we shorten coach copy. */
  coachVerbosity: 'compact' | 'normal' | 'rich'
  /** Multi-clause / stacked detail expectation in coach notes. */
  detailDepth: 1 | 2 | 3
  /** Product copy: short follow-ups & service-style ellipses. */
  serviceNaturalness: 'plain' | 'natural' | 'compressed'
}

export function listeningLevelContentBand(level: ListeningLevel): ListeningLevelContentBand {
  if (level === 'A1') {
    return {
      tier: 'foundational',
      impliedContext: 'low',
      coachVerbosity: 'compact',
      detailDepth: 1,
      serviceNaturalness: 'plain',
    }
  }
  if (level === 'B1') {
    return {
      tier: 'stretch',
      impliedContext: 'high',
      coachVerbosity: 'rich',
      detailDepth: 3,
      serviceNaturalness: 'compressed',
    }
  }
  return {
    tier: 'standard',
    impliedContext: 'medium',
    coachVerbosity: 'normal',
    detailDepth: 2,
    serviceNaturalness: 'natural',
  }
}

export function levelScenarioSubtitle(level: ListeningLevel): string {
  if (level === 'A1') return 'Short lines · clear words · one idea at a time'
  if (level === 'B1') return 'More implied context · faster exchanges · stacked details'
  return 'Natural service Dutch · short follow-ups'
}

/** Trim coach strings for A1 without breaking meaning badly. */
export function adaptCoachCopyForLevel(text: string, level: ListeningLevel, maxChars = 420): string {
  const band = listeningLevelContentBand(level)
  let t = text.trim()
  if (band.coachVerbosity === 'compact') {
    t = t.replace(/\s+/g, ' ')
    if (t.length > maxChars) {
      const cut = t.slice(0, maxChars)
      const last = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'))
      t = last > 40 ? cut.slice(0, last + 1) : `${cut.trim()}…`
    }
  }
  return t
}

export function impliedContextHintEn(level: ListeningLevel): string | null {
  const band = listeningLevelContentBand(level)
  if (band.impliedContext === 'low') return 'Names and objects are stated directly — fewer unstated “they” jumps.'
  if (band.impliedContext === 'high') return 'Speakers may compress subjects; listen for who is doing what without every noun repeated.'
  return 'A few polite ellipses are normal — stay with the main request.'
}
