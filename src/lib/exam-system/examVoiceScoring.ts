import type { PronunciationAssessmentApiResponse } from '@/lib/speech/audioPronunciationTypes'
import type { ExamLevel, ExamScoringDimension, ExamVoiceAssessmentSnapshot } from './types'

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

/** Map Azure pronunciation API output to stored 0–1 snapshot (null if no usable assessment). */
export function examVoiceSnapshotFromPronunciationResponse(
  res: PronunciationAssessmentApiResponse,
): ExamVoiceAssessmentSnapshot | null {
  const a = res.assessment
  if (!a) return null
  const to01 = (x: number) => clamp01(x / 100)
  const pronunciation01 = to01(a.pronunciationScore)
  const fluency01 = to01(a.fluencyScore)
  const accuracy01 = to01(a.accuracyScore)
  const completeness01 = to01(a.completenessScore)
  const prosody01 = a.prosodyScore == null ? null : to01(a.prosodyScore)
  const overall01 = to01(a.overallScore)
  const clarity01 = clamp01((pronunciation01 + fluency01 + accuracy01) / 3)
  const provider = res.provider?.id === 'azure' ? 'azure' : 'off'
  if (provider !== 'azure') return null
  return {
    pronunciation01,
    fluency01,
    accuracy01,
    completeness01,
    prosody01,
    overall01,
    clarity01,
    provider,
  }
}

/**
 * Per-level voice blend weights — how much of each dimension comes from Azure audio metrics vs the
 * heuristic text baseline. The same audio snapshot is interpreted against the exam's per-level
 * goals so:
 *   - A1 (basic survival speech) — friendlier audio weight, heavier text grace on grammar.
 *   - A2 (Inburgering baseline) — balanced; delivery + clarity dominate, grammar light touch.
 *   - B1 (independent user) — stricter; pronunciation/intelligibility weighted higher and prosody
 *     factored into natural wording when available.
 */
type VoiceBlendWeights = {
  /** w_audio for pronunciation_delivery (rest is heuristic). */
  delivery: number
  /** w_audio for understandability. */
  understandability: number
  /** w_audio for natural_wording. */
  naturalWording: number
  /** w_audio for grammar_control (small — text still matters most here). */
  grammar: number
}

const LEVEL_BLEND: Record<ExamLevel, VoiceBlendWeights> = {
  A1: { delivery: 0.7, understandability: 0.5, naturalWording: 0.42, grammar: 0.15 },
  A2: { delivery: 0.8, understandability: 0.58, naturalWording: 0.52, grammar: 0.22 },
  B1: { delivery: 0.85, understandability: 0.65, naturalWording: 0.6, grammar: 0.28 },
}

/**
 * Blend heuristic text scores with Azure audio metrics for any speaking-exam level.
 * Weighting is per-level (see {@link LEVEL_BLEND}) so the same Azure snapshot scores A1, A2, and
 * B1 attempts against the rubric appropriate for that learner.
 */
export function applyVoiceBlendToHeuristicScores(params: {
  scores: Partial<Record<ExamScoringDimension, number>>
  dims: ExamScoringDimension[]
  level: ExamLevel
  voice: ExamVoiceAssessmentSnapshot
}): Partial<Record<ExamScoringDimension, number>> {
  const { scores, dims, level, voice } = params
  if (voice.provider !== 'azure') return scores
  const w = LEVEL_BLEND[level]
  const out: Partial<Record<ExamScoringDimension, number>> = { ...scores }

  if (dims.includes('pronunciation_delivery')) {
    const h = out.pronunciation_delivery ?? 0.55
    out.pronunciation_delivery = clamp01((1 - w.delivery) * h + w.delivery * voice.overall01)
  }
  if (dims.includes('understandability')) {
    const h = out.understandability ?? 0.55
    const v = clamp01(0.55 * voice.accuracy01 + 0.45 * voice.clarity01)
    out.understandability = clamp01((1 - w.understandability) * h + w.understandability * v)
  }
  if (dims.includes('natural_wording')) {
    const h = out.natural_wording ?? 0.52
    const v =
      voice.prosody01 == null ? voice.fluency01 : clamp01(0.55 * voice.fluency01 + 0.45 * voice.prosody01)
    out.natural_wording = clamp01((1 - w.naturalWording) * h + w.naturalWording * v)
  }
  if (dims.includes('grammar_control')) {
    const h = out.grammar_control ?? 0.52
    out.grammar_control = clamp01((1 - w.grammar) * h + w.grammar * voice.completeness01)
  }
  return out
}
