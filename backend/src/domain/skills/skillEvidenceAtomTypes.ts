/**
 * Per-skill evidence atoms — granular layer on top of session insights + {@link SkillEvidence}.
 * Used by report extractors; converted to {@link SkillEvidence} for the score engine.
 */
import type { SkillId } from './skillTypes'

export type SkillEvidenceSessionType = 'speak_live' | 'text_conversation' | 'read_aloud' | 'listening'

export type SkillEvidenceAtomPolarity = 'positive' | 'negative' | 'neutral'

export type SkillEvidenceAtom = {
  userId: string
  sessionId: string
  sessionType: SkillEvidenceSessionType
  skillId: SkillId
  evidenceType: string
  /** Optional suggested numeric nudge to a skill score (informational; adapters may blend into magnitude). */
  scoreDeltaCandidate: number | null
  /** Model / signal confidence 0–1. */
  confidence: number
  /** Rough severity 0–3 (aligned with session insight severity scale). */
  severity: number
  positiveOrNegative: SkillEvidenceAtomPolarity
  sourceSummary: string
  createdAt: string
}
