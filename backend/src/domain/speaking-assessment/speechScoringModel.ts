/**
 * FluentCopilot premium speech scoring model.
 *
 * Six separate dimensions, each with a declared evidence source, level-aware
 * normalization, mode-specific weighting, and a reliability indicator.
 *
 * This module is the single source of truth for scoring constants, band
 * definitions, CEFR policies, and weighted-composite logic. Other layers
 * (orchestrator, mapper, FE) consume the types and helpers exported here.
 */

import type { SpeakLiveCefrLevel } from '../speakLive/speakLiveSupportStrategy'

// ─── Scoring dimensions ─────────────────────────────────────────────────

export type ScoringDimensionId =
  | 'pronunciation'
  | 'fluency'
  | 'rhythm'
  | 'wording'
  | 'grammar'
  | 'scenarioFit'

export const ALL_DIMENSIONS: readonly ScoringDimensionId[] = [
  'pronunciation',
  'fluency',
  'rhythm',
  'wording',
  'grammar',
  'scenarioFit',
] as const

export type EvidenceSourceType = 'azure_audio' | 'timing_analysis' | 'llm_transcript' | 'scenario_matcher' | 'unavailable'

export const DIMENSION_SOURCE: Record<ScoringDimensionId, EvidenceSourceType[]> = {
  pronunciation: ['azure_audio'],
  fluency: ['azure_audio', 'timing_analysis'],
  rhythm: ['timing_analysis', 'azure_audio'],
  wording: ['llm_transcript'],
  grammar: ['llm_transcript'],
  scenarioFit: ['scenario_matcher', 'llm_transcript'],
}

/** Dimensions that REQUIRE audio evidence — must not be scored from transcript alone. */
export const AUDIO_REQUIRED_DIMENSIONS: ReadonlySet<ScoringDimensionId> = new Set([
  'pronunciation', 'fluency', 'rhythm',
])

// ─── Score bands (0–100) ────────────────────────────────────────────────

export type ScoreBandId = 'notYetWorkable' | 'earlyStep' | 'building' | 'strongEnough' | 'closeToLocal'

export type ScoreBand = {
  id: ScoreBandId
  min: number
  max: number
  label: string
  shortLabel: string
}

export const SCORE_BANDS: readonly ScoreBand[] = [
  { id: 'notYetWorkable', min: 0, max: 39, label: 'Not yet workable', shortLabel: 'Needs work' },
  { id: 'earlyStep', min: 40, max: 59, label: 'Early step', shortLabel: 'Early step' },
  { id: 'building', min: 60, max: 74, label: 'Building', shortLabel: 'Building' },
  { id: 'strongEnough', min: 75, max: 89, label: 'Strong enough', shortLabel: 'Strong' },
  { id: 'closeToLocal', min: 90, max: 100, label: 'Close to local', shortLabel: 'Near-native' },
] as const

export function bandForScore(score: number): ScoreBand {
  const s = Math.round(Math.max(0, Math.min(100, score)))
  for (const b of SCORE_BANDS) {
    if (s >= b.min && s <= b.max) return b
  }
  return SCORE_BANDS[0]
}

// ─── Reliability ────────────────────────────────────────────────────────

export type ReliabilityLevel = 'high' | 'medium' | 'low'

export type ReliabilityIndicator = {
  level: ReliabilityLevel
  reason: string
}

export function computeReliability(input: {
  hasAudio: boolean
  wordCount: number
  azureRecognitionConfidence?: number | null
  turnCount?: number
  clipDurationMs?: number | null
}): ReliabilityIndicator {
  if (!input.hasAudio) {
    return { level: 'low', reason: 'No audio captured — scores reflect transcript only.' }
  }
  const issues: string[] = []
  if (input.wordCount < 3) issues.push('Very short utterance')
  if (input.clipDurationMs != null && input.clipDurationMs < 800) issues.push('Clip under 1 second')
  if (input.azureRecognitionConfidence != null && input.azureRecognitionConfidence < 0.6) {
    issues.push('Low recognition confidence')
  }
  if (issues.length >= 2) return { level: 'low', reason: issues.join('; ') + '.' }
  if (issues.length === 1) return { level: 'medium', reason: issues[0] + '.' }
  return { level: 'high', reason: 'Clear audio with sufficient speech data.' }
}

export function computeSessionReliability(input: {
  turnCount: number
  audioTurnCount: number
  avgWordCount: number
}): ReliabilityIndicator {
  if (input.turnCount === 0) return { level: 'low', reason: 'No turns completed.' }
  if (input.turnCount === 1) return { level: 'low', reason: 'Single turn — limited data for session patterns.' }
  if (input.audioTurnCount === 0) return { level: 'low', reason: 'No audio captured in any turn.' }
  if (input.audioTurnCount < input.turnCount * 0.5) {
    return { level: 'medium', reason: `Audio on ${input.audioTurnCount} of ${input.turnCount} turns — voice scores are partial.` }
  }
  if (input.avgWordCount < 4) return { level: 'medium', reason: 'Short replies — metrics have limited signal.' }
  return { level: 'high', reason: 'Sufficient turns and audio for reliable session scoring.' }
}

// ─── Per-dimension score container ──────────────────────────────────────

export type ScoreDimension = {
  id: ScoringDimensionId
  score: number | null
  band: ScoreBand | null
  reliability: ReliabilityIndicator
  source: EvidenceSourceType
  evidenceSummary: string
  feedbackItems: DimensionFeedbackItem[]
}

export type DimensionFeedbackItem = {
  issue: string
  fix: string
  whyItMatters: string
  word?: string
  phrase?: string
  transcriptSnippet?: string
  timestampMs?: number | null
}

// ─── Level-aware scoring policy ─────────────────────────────────────────

export type ScoringPolicy = {
  level: SpeakLiveCefrLevel
  /** Higher = more penalty for hesitations at this level. */
  hesitationStrictness: number
  /** Higher = stricter grading on non-native wording. */
  wordingStrictness: number
  /** Higher = more complex sentences expected. */
  sentenceComplexityExpected: number
  /** Higher = stricter grammar checking. */
  grammarStrictness: number
  /** Baseline bonus: A1/A2 get a "you're trying" floor to avoid discouraging new learners. */
  encouragementFloor: number
  /** Weight of scenario completion in overall score. */
  scenarioWeight: number
  pronunciationBandShift: number
  fluencyBandShift: number
  rhythmBandShift: number
}

export const SCORING_POLICY_BY_LEVEL: Record<SpeakLiveCefrLevel, ScoringPolicy> = {
  A1: {
    level: 'A1',
    hesitationStrictness: 0.3,
    wordingStrictness: 0.2,
    sentenceComplexityExpected: 0.2,
    grammarStrictness: 0.3,
    encouragementFloor: 2,
    scenarioWeight: 0.2,
    pronunciationBandShift: 2,
    fluencyBandShift: 3,
    rhythmBandShift: 4,
  },
  A2: {
    level: 'A2',
    hesitationStrictness: 0.4,
    wordingStrictness: 0.35,
    sentenceComplexityExpected: 0.35,
    grammarStrictness: 0.4,
    encouragementFloor: 0,
    scenarioWeight: 0.18,
    pronunciationBandShift: 0,
    fluencyBandShift: 1,
    rhythmBandShift: 2,
  },
  B1: {
    level: 'B1',
    hesitationStrictness: 0.6,
    wordingStrictness: 0.55,
    sentenceComplexityExpected: 0.55,
    grammarStrictness: 0.6,
    encouragementFloor: 2,
    scenarioWeight: 0.15,
    pronunciationBandShift: 0,
    fluencyBandShift: 0,
    rhythmBandShift: 0,
  },
  B2: {
    level: 'B2',
    hesitationStrictness: 0.75,
    wordingStrictness: 0.7,
    sentenceComplexityExpected: 0.7,
    grammarStrictness: 0.75,
    encouragementFloor: 0,
    scenarioWeight: 0.12,
    pronunciationBandShift: -3,
    fluencyBandShift: -3,
    rhythmBandShift: -5,
  },
  C1: {
    level: 'C1',
    hesitationStrictness: 0.85,
    wordingStrictness: 0.85,
    sentenceComplexityExpected: 0.85,
    grammarStrictness: 0.85,
    encouragementFloor: 0,
    scenarioWeight: 0.1,
    pronunciationBandShift: -5,
    fluencyBandShift: -5,
    rhythmBandShift: -8,
  },
  C2: {
    level: 'C2',
    hesitationStrictness: 0.95,
    wordingStrictness: 0.95,
    sentenceComplexityExpected: 0.95,
    grammarStrictness: 0.95,
    encouragementFloor: 0,
    scenarioWeight: 0.08,
    pronunciationBandShift: -8,
    fluencyBandShift: -8,
    rhythmBandShift: -10,
  },
}

// ─── Mode weighting ─────────────────────────────────────────────────────

export type ScoringMode = 'live_speak' | 'read_aloud' | 'exam_speaking' | 'chat_voice'

export type DimensionWeights = Record<ScoringDimensionId, number>

export const WEIGHTS_BY_MODE: Record<ScoringMode, DimensionWeights> = {
  live_speak: {
    pronunciation: 0.25,
    fluency: 0.15,
    rhythm: 0.15,
    wording: 0.15,
    grammar: 0.15,
    scenarioFit: 0.15,
  },
  read_aloud: {
    pronunciation: 0.35,
    fluency: 0.25,
    rhythm: 0.20,
    wording: 0.05,
    grammar: 0.05,
    scenarioFit: 0.10,
  },
  exam_speaking: {
    pronunciation: 0.20,
    fluency: 0.20,
    rhythm: 0.15,
    wording: 0.10,
    grammar: 0.20,
    scenarioFit: 0.15,
  },
  chat_voice: {
    pronunciation: 0.20,
    fluency: 0.15,
    rhythm: 0.10,
    wording: 0.20,
    grammar: 0.20,
    scenarioFit: 0.15,
  },
}

// ─── Weighted composite ─────────────────────────────────────────────────

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export type WeightedComposite = {
  overall: number
  band: ScoreBand
  breakdown: { dimension: ScoringDimensionId; score: number | null; weight: number; contribution: number | null }[]
}

export function computeWeightedComposite(
  dimensions: Map<ScoringDimensionId, number | null>,
  mode: ScoringMode,
  _policy: ScoringPolicy,
): WeightedComposite {
  const weights = WEIGHTS_BY_MODE[mode]
  let totalWeight = 0
  let weightedSum = 0
  const breakdown: WeightedComposite['breakdown'] = []

  for (const dim of ALL_DIMENSIONS) {
    const raw = dimensions.get(dim) ?? null
    const w = weights[dim]
    if (raw != null) {
      const adjusted = clamp100(raw)
      totalWeight += w
      weightedSum += adjusted * w
      breakdown.push({ dimension: dim, score: raw, weight: w, contribution: adjusted * w })
    } else {
      breakdown.push({ dimension: dim, score: null, weight: w, contribution: null })
    }
  }

  const overall = totalWeight > 0 ? clamp100(weightedSum / totalWeight) : 0
  return { overall, band: bandForScore(overall), breakdown }
}

// ─── Level-aware dimension scoring ──────────────────────────────────────

export function applyLevelAdjustment(
  dimensionId: ScoringDimensionId,
  rawScore: number,
  policy: ScoringPolicy,
): number {
  let shift = 0
  switch (dimensionId) {
    case 'pronunciation':
      shift = policy.pronunciationBandShift
      break
    case 'fluency':
      shift = policy.fluencyBandShift
      break
    case 'rhythm':
      shift = policy.rhythmBandShift
      break
    default:
      shift = 0
  }
  return clamp100(rawScore + shift)
}

// ─── Priority dimension selection ───────────────────────────────────────

/**
 * Pick the 2–3 most important dimensions to highlight on the summary card.
 * Prefers the lowest-scoring dimensions (where the learner needs help)
 * but always includes scenarioFit if it's notably low.
 */
export function selectPriorityDimensions(
  dimensions: ScoreDimension[],
  maxCount: number = 3,
): ScoreDimension[] {
  const scored = dimensions.filter((d) => d.score != null)
  if (scored.length <= maxCount) return scored

  const sorted = [...scored].sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
  const picks: ScoreDimension[] = sorted.slice(0, maxCount)

  const scenarioFit = scored.find((d) => d.id === 'scenarioFit')
  if (scenarioFit && scenarioFit.score != null && scenarioFit.score < 60 && !picks.includes(scenarioFit)) {
    picks[picks.length - 1] = scenarioFit
  }

  return picks
}

// ─── Turn-level evaluation container ────────────────────────────────────

export type SpeechTurnEvaluation = {
  turnId: string
  turnIndex: number
  transcript: string
  transcriptNormalized: string
  audioUrl: string | null
  level: SpeakLiveCefrLevel
  mode: ScoringMode
  dimensions: ScoreDimension[]
  composite: WeightedComposite
  reliability: ReliabilityIndicator
  priorityDimensions: ScoreDimension[]
  headlineSummary: string
  evidenceItems: DimensionFeedbackItem[]
  recommendedDrills: RecommendedDrill[]
}

export type RecommendedDrill = {
  dimension: ScoringDimensionId
  type: 'isolated_word' | 'phrase_shadow' | 'chunk_practice' | 'grammar_drill' | 'scenario_retry' | 'slow_replay' | 'echo_loop'
  title: string
  detail: string
  targetText?: string
  referenceAudioUrl?: string | null
  priority: 'high' | 'medium' | 'low'
}

// ─── Session-level evaluation container ─────────────────────────────────

export type SpeechSessionEvaluation = {
  sessionId: string
  scenarioId: string
  scenarioTitle: string
  level: SpeakLiveCefrLevel
  mode: ScoringMode
  turnsCompleted: number
  sessionDurationSeconds: number
  dimensions: ScoreDimension[]
  composite: WeightedComposite
  reliability: ReliabilityIndicator
  strongestDimension: ScoreDimension | null
  weakestDimension: ScoreDimension | null
  priorityImprovement: string
  patternNotes: string[]
  recommendedDrills: RecommendedDrill[]
  turnEvaluations: SpeechTurnEvaluation[]
}

// ─── Headline builder ───────────────────────────────────────────────────

export function buildHeadlineSummary(
  composite: WeightedComposite,
  level: SpeakLiveCefrLevel,
  hasAudio: boolean,
): string {
  const band = composite.band.id
  const lbl = level

  if (!hasAudio) {
    if (band === 'strongEnough' || band === 'closeToLocal') {
      return `Strong wording for ${lbl} — capture audio next time for voice-level feedback.`
    }
    return `On track for ${lbl} from transcript — capture audio for full scoring.`
  }

  switch (band) {
    case 'closeToLocal':
      return `Close to local Dutch at ${lbl} — impressive delivery and wording.`
    case 'strongEnough':
      return `Strong enough for ${lbl} — a few polishing points to sound even more natural.`
    case 'building':
      return `Building at ${lbl} — understandable, with clear areas to tighten.`
    case 'earlyStep':
      return `Early step at ${lbl} — focus on one dimension at a time.`
    case 'notYetWorkable':
      return `Getting started at ${lbl} — practice the reference audio and try shorter phrases.`
  }
}
