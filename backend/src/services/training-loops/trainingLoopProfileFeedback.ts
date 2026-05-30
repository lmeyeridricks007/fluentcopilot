import type { PersonalizedTrainingLoop } from '../../domain/trainingLoops/trainingLoopTypes'
import type { UserLearningProfile } from '../../domain/learningMemory/userLearningProfileDocument'
import { recomputeDerivedAndRecommendations } from '../../domain/learningMemory/learningMemoryRecommendationService'
import { applyStandaloneSkillEvidence } from '../../domain/skills/skillProfileMerge'
import type { SkillEvidence, SkillId } from '../../domain/skills/skillTypes'
import { ALL_SKILL_IDS } from '../../domain/skills/skillTypes'
import { newId } from '../../shared/ids'
import {
  completionEvidenceMagnitude,
  type TrainingLoopTypedCompletionPayload,
} from '../../domain/trainingLoops/trainingLoopCompletionResultModels'

function asSkillIds(raw: string[]): SkillId[] {
  const allowed = new Set<string>(ALL_SKILL_IDS)
  return raw.filter((id): id is SkillId => allowed.has(id))
}

function keySet(keys: string[]): Set<string> {
  return new Set(keys.map((k) => k.trim().toLowerCase()).filter(Boolean))
}

/** Gradually reduce salience of a matched weakness (never zero in one completion). */
function taperSeverity(score: number | undefined): number {
  const s = typeof score === 'number' && Number.isFinite(score) ? score : 0.5
  return Math.max(0.06, s * 0.93)
}

export type TrainingLoopProfileFeedbackInput = {
  typedCompletion?: TrainingLoopTypedCompletionPayload | null
}

export function applyTrainingLoopCompletionToLearningProfile(
  doc: UserLearningProfile,
  loop: PersonalizedTrainingLoop,
  nowIso: string,
  input?: TrainingLoopProfileFeedbackInput | null,
): UserLearningProfile {
  const next: UserLearningProfile = {
    ...doc,
    updatedAt: nowIso,
    version: (doc.version ?? 0) + 1,
  }
  const vKeys = keySet(loop.targetWeaknessKeys)

  next.weakVocabulary = next.weakVocabulary.map((v) => {
    if (!vKeys.has(v.normalizedKey.toLowerCase())) return v
    return {
      ...v,
      recoveryScore: Math.min(0.92, (v.recoveryScore ?? 0.2) + 0.06),
      mergeMissStreak: 0,
      lastSeenAt: nowIso,
      improving: true,
      severityScore: taperSeverity(v.severityScore),
    }
  })
  next.weakGrammarPatterns = next.weakGrammarPatterns.map((p) => {
    if (!vKeys.has(p.patternId.toLowerCase())) return p
    return {
      ...p,
      recoveryScore: Math.min(0.9, (p.recoveryScore ?? 0.2) + 0.055),
      mergeMissStreak: 0,
      lastSeenAt: nowIso,
      improving: true,
      severityScore: taperSeverity(p.severityScore),
    }
  })
  next.pronunciationIssues = next.pronunciationIssues.map((pr) => {
    if (!vKeys.has(pr.targetKey.toLowerCase())) return pr
    return {
      ...pr,
      recoveryScore: Math.min(0.9, (pr.recoveryScore ?? 0.25) + 0.06),
      mergeMissStreak: 0,
      lastSeenAt: nowIso,
      severityScore: taperSeverity(pr.severityScore),
    }
  })
  next.hesitationPatterns = next.hesitationPatterns.map((h) => {
    if (!vKeys.has(h.patternId.toLowerCase())) return h
    return {
      ...h,
      recoveryScore: Math.min(0.88, (h.recoveryScore ?? 0.25) + 0.055),
      mergeMissStreak: 0,
      lastSeenAt: nowIso,
      severityScore: taperSeverity(h.severityScore),
    }
  })

  const skillIds = asSkillIds(loop.targetSkills)
  if (skillIds.length) {
    const mag = completionEvidenceMagnitude(loop, input?.typedCompletion ?? null)
    const ev: SkillEvidence = {
      id: newId(),
      sessionId: `training_loop:${loop.id}`,
      at: nowIso,
      sessionType: 'training_loop',
      skillIds,
      polarity: 'positive',
      magnitude: mag,
      source: 'training_loop_completion',
      weight: 0.85,
      note: loop.loopType,
    }
    applyStandaloneSkillEvidence(next, [ev], nowIso, 0.78)
  }

  recomputeDerivedAndRecommendations(next)
  return next
}
