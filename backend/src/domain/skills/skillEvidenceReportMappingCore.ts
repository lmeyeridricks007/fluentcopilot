/**
 * Heuristics for mapping report fields → {@link SkillId} lists (one atom per id at call sites).
 */
import type { SkillId } from './skillTypes'

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

export function confidenceFromScoredDimension(c: 'low' | 'medium' | 'high'): number {
  if (c === 'high') return 0.82
  if (c === 'medium') return 0.58
  return 0.36
}

/** Higher = worse performance on a 0–100 “quality” scale. */
export function severityFromQualityScore100(score: number | null): number {
  if (score == null || !Number.isFinite(score)) return 1.2
  if (score >= 78) return 0.35
  if (score >= 65) return 1.1
  if (score >= 52) return 2.0
  return 2.7
}

export function polarityFromQualityScore100(score: number | null): 'positive' | 'negative' | 'neutral' {
  if (score == null || !Number.isFinite(score)) return 'neutral'
  if (score >= 76) return 'positive'
  if (score <= 60) return 'negative'
  return 'neutral'
}

export function scoreDeltaFromQuality(score: number | null): number | null {
  if (score == null || !Number.isFinite(score)) return null
  const centered = (score - 70) / 10
  return Math.round(centered * 10) / 10
}

/**
 * Map rubric / dimension ids (Speak Live + scenario packs) to FluentCopilot skills.
 */
export function skillIdsForScoredDimension(dim: { id: string; label: string }): SkillId[] {
  const raw = `${dim.id} ${dim.label}`.toLowerCase()
  if (/pronun|uitspraak/.test(raw)) return ['pronunciation', 'fluency']
  if (/rhythm|ritme|tempo/.test(raw)) return ['pacing', 'fluency']
  if (/fluency|flow|pace|pauze|pause/.test(raw)) return ['fluency', 'pacing']
  if (/grammar|werkwoord|tijd|vorm/.test(raw)) return ['grammar', 'sentence_structure']
  if (/word|woord|wording|keuze|natural|natuurlijk|phrasing/.test(raw)) return ['word_choice', 'natural_dutch', 'vocabulary']
  if (/scenario|goal|taak|fit/.test(raw)) return ['keeping_flow', 'asking_questions']
  if (/story|narratief|vertell/.test(raw)) return ['storytelling', 'sequencing', 'fluency']
  if (/sequence|volgorde|tijdlijn/.test(raw)) return ['sequencing', 'storytelling']
  if (/structuur|opbouw|uitleg|explain/.test(raw)) return ['explaining', 'response_structure', 'sequencing']
  if (/detail|concrete/.test(raw)) return ['storytelling', 'vocabulary']
  if (/opinion|mening|stance|standpunt/.test(raw)) return ['opinions', 'reasoning']
  if (/reason|argument|onderbouwing|nuance/.test(raw)) return ['reasoning', 'nuance']
  if (/react|bevestig|stemming/.test(raw)) return ['reacting', 'keeping_flow']
  if (/question|vrag|follow|doorvrag/.test(raw)) return ['follow_up_questions', 'asking_questions', 'keeping_flow']
  if (/clarif|repair|begrip|herhal/.test(raw)) return ['repair_clarification', 'asking_questions']
  if (/contrast|vergelijk|enerzijds/.test(raw)) return ['contrast_comparison', 'reasoning']
  if (/disagree|tegen|boundary|grens/.test(raw)) return ['softer_disagreement', 'nuance']
  return ['fluency', 'natural_dutch']
}

export function skillIdsForReadAloudDimensionKey(key: string): SkillId[] {
  switch (key) {
    case 'pronunciation':
      return ['pronunciation']
    case 'fluency':
      return ['fluency', 'pacing']
    case 'pacing':
      return ['pacing', 'fluency']
    case 'clarity':
      return ['fluency', 'natural_dutch']
    case 'readingAccuracy':
      return ['sentence_structure', 'vocabulary']
    case 'expression':
      return ['natural_dutch', 'fluency']
    case 'levelFit':
      return ['vocabulary', 'natural_dutch']
    default:
      return ['fluency']
  }
}
