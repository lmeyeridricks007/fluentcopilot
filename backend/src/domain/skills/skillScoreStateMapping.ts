/**
 * Central mapping from numeric skill score (0–100) → persisted {@link SkillState} bands.
 */
import type { SkillState } from './skillTypes'

/** Inclusive upper bounds (exclusive of next band); aligns with product copy: Needs work → Strong. */
export const SKILL_SCORE_STATE_THRESHOLDS = {
  /** Scores strictly below this are `needs_work`. */
  needsWorkMax: 40,
  /** Scores in [needsWorkMax, buildingMax) are `building`. */
  buildingMax: 54,
  /** Scores in [buildingMax, improvingMax) are `improving`. */
  improvingMax: 70,
  /** Scores in [improvingMax, solidMax) are `solid`. */
  solidMax: 85,
  /** Scores at or above `solidMax` are `strong`. */
} as const

export function scoreToState(score: number): SkillState {
  const s = Math.max(0, Math.min(100, score))
  if (s < SKILL_SCORE_STATE_THRESHOLDS.needsWorkMax) return 'needs_work'
  if (s < SKILL_SCORE_STATE_THRESHOLDS.buildingMax) return 'building'
  if (s < SKILL_SCORE_STATE_THRESHOLDS.improvingMax) return 'improving'
  if (s < SKILL_SCORE_STATE_THRESHOLDS.solidMax) return 'solid'
  return 'strong'
}
