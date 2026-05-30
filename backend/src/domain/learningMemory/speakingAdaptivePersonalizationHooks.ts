import type { SpeakLiveSpeakingTrendSignalsV1 } from './speakLiveLearningEvaluationArtifacts.schema'
import type { UserLearningProfile } from './userLearningProfileDocument'
import { effectiveWeaknessItemScore } from './learningMemoryMergeScoring'

export type SpeakingAdaptivePersonalizationHooksV1 = {
  version: 1
  generatedAt: string
  userId: string | null
  /** Drill / flashcard targeting (normalized keys + stable ids). */
  drillTargets: {
    vocabularyKeys: string[]
    pronunciationTargetKeys: string[]
    grammarPatternIds: string[]
  }
  /** Scenario + modality nudges for adaptive loops. */
  scenarioAndModalityHints: {
    recentScenarioSlugs: string[]
    modalityWeights: { speakLive: number; readAloud: number; listening: number }
  }
  /** Anchors for TTS / listening / read-aloud item generation. */
  generationAnchors: {
    weakWordHints: string[]
    grammarPatternLabels: string[]
    pacingAttention: boolean
    confidenceTrajectory: 'up' | 'down' | 'flat' | 'unknown'
  }
  /** Exam coach + daily digest: compact deltas + last voice scores. */
  examAndDailySignals: {
    pronunciationDeltaLastVsPriorMean: number | null
    pacingDeltaLastVsPriorMean: number | null
    confidenceDeltaLastVsPriorMean: number | null
    grammarDeltaLastVsPriorMean: number | null
    lastOverallVoiceScoresTail: number[]
  }
  /** Full bounded trend block for downstream engines. */
  speakingTrendSignalsV1: SpeakLiveSpeakingTrendSignalsV1 | null
}

function trajectoryFromDelta(delta: number | null | undefined): 'up' | 'down' | 'flat' | 'unknown' {
  if (delta == null || !Number.isFinite(delta)) return 'unknown'
  if (Math.abs(delta) < 0.75) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

/**
 * Stable DTO for drills, adaptive scenarios, generation, exam coaching, and daily recommendations.
 * Callers should treat this as read-only projection of `UserLearningProfile`.
 */
export function buildSpeakingAdaptivePersonalizationHooksV1(
  doc: UserLearningProfile,
  generatedAt?: string,
): SpeakingAdaptivePersonalizationHooksV1 {
  const t = doc.speakingTrendSignalsV1 ?? null
  const vocab = [...doc.weakVocabulary]
    .sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a))
    .slice(0, 12)
    .map((v) => v.normalizedKey)
  const pron = [...doc.pronunciationIssues]
    .sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a))
    .slice(0, 10)
    .map((p) => p.targetKey)
  const gram = [...doc.weakGrammarPatterns]
    .sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a))
    .slice(0, 10)
    .map((p) => p.patternId)

  const pacingAttention =
    (t?.pacingDeltaLastVsPriorMean != null && t.pacingDeltaLastVsPriorMean < -0.5) ||
    doc.hesitationPatterns.some((h) => effectiveWeaknessItemScore(h) >= 1.6)

  const confTraj = trajectoryFromDelta(t?.confidenceDeltaLastVsPriorMean)

  const modalityWeights = {
    speakLive: confTraj === 'down' || pacingAttention ? 1.15 : 1,
    readAloud: doc.pronunciationIssues.length >= 3 || (t?.pronunciationDeltaLastVsPriorMean ?? 0) < 0 ? 1.12 : 1,
    listening: doc.weakVocabulary.length >= 4 ? 1.08 : 1,
  }

  return {
    version: 1,
    generatedAt: generatedAt ?? doc.updatedAt,
    userId: doc.userId,
    drillTargets: {
      vocabularyKeys: [...new Set([...vocab, ...(t?.recentWeakWordKeys ?? [])])].slice(0, 24),
      pronunciationTargetKeys: pron,
      grammarPatternIds: gram,
    },
    scenarioAndModalityHints: {
      recentScenarioSlugs: [...doc.recentScenarioSlugs].slice(-8),
      modalityWeights,
    },
    generationAnchors: {
      weakWordHints: [...new Set([...(t?.recentWeakWordKeys ?? []), ...vocab])].slice(0, 20),
      grammarPatternLabels: doc.weakGrammarPatterns.slice(0, 8).map((p) => p.label),
      pacingAttention,
      confidenceTrajectory: confTraj,
    },
    examAndDailySignals: {
      pronunciationDeltaLastVsPriorMean: t?.pronunciationDeltaLastVsPriorMean ?? null,
      pacingDeltaLastVsPriorMean: t?.pacingDeltaLastVsPriorMean ?? null,
      confidenceDeltaLastVsPriorMean: t?.confidenceDeltaLastVsPriorMean ?? null,
      grammarDeltaLastVsPriorMean: t?.grammarDeltaLastVsPriorMean ?? null,
      lastOverallVoiceScoresTail: (t?.overallVoiceScoreSeries ?? []).slice(-8),
    },
    speakingTrendSignalsV1: t,
  }
}
