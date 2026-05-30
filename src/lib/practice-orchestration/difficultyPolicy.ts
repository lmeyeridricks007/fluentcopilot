import type { A2DifficultyBand } from '@/lib/practice-orchestration/types'

export interface DifficultyConstraints {
  maxSentencesPerTurn: number
  maxCharsSoft: number
  maxIdeasPerTurn: number
  allowSubordinateClauses: boolean
  explicitSupportLevel: 'high' | 'medium' | 'low'
  followUpQuestionsMax: number
}

const TABLE: Record<A2DifficultyBand, DifficultyConstraints> = {
  a2_lower: {
    maxSentencesPerTurn: 2,
    maxCharsSoft: 200,
    maxIdeasPerTurn: 1,
    allowSubordinateClauses: false,
    explicitSupportLevel: 'high',
    followUpQuestionsMax: 1,
  },
  a2_mid: {
    maxSentencesPerTurn: 2,
    maxCharsSoft: 240,
    maxIdeasPerTurn: 2,
    allowSubordinateClauses: false,
    explicitSupportLevel: 'medium',
    followUpQuestionsMax: 1,
  },
  a2_upper: {
    maxSentencesPerTurn: 3,
    maxCharsSoft: 280,
    maxIdeasPerTurn: 2,
    allowSubordinateClauses: true,
    explicitSupportLevel: 'low',
    followUpQuestionsMax: 2,
  },
}

export function getDifficultyConstraints(band: A2DifficultyBand): DifficultyConstraints {
  return TABLE[band]
}

/** Prompt fragment for system message */
export function difficultyToPromptFragment(band: A2DifficultyBand): string {
  const c = TABLE[band]
  const clause = c.allowSubordinateClauses
    ? 'You may use one simple bijzin if needed, but keep it short.'
    : 'Avoid long subordinate clauses (omdat/dat/als chains). Prefer two short sentences.'
  return [
    `Difficulty band: ${band.replace('a2_', 'A2 ')}.`,
    `Reply with at most ${c.maxSentencesPerTurn} short sentences and at most ${c.maxIdeasPerTurn} main idea(s).`,
    `Do not ask more than ${c.followUpQuestionsMax} question(s) in one turn.`,
    clause,
  ].join(' ')
}
