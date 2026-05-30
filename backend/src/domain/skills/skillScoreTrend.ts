/**
 * Trend from **recent** vs **prior** weighted evidence windows (recency-aware).
 */
import type { SkillConfidence, SkillEvidence, SkillId, SkillTrend } from './skillTypes'
import { observedScoreFromEvidenceWeighted, parseEvidenceMs } from './skillScoreEvidenceAggregation'

/**
 * Compares the newest ~42% of evidence vs older rows for the same skill.
 * Returns `null` if there is not enough history to compare meaningfully.
 */
export function computeTrendFromEvidenceWindows(params: {
  ringRows: SkillEvidence[]
  skillId: SkillId
  nowMs: number
  evidenceCount: number
  confidence: SkillConfidence
}): SkillTrend | null {
  const rows = params.ringRows.filter((e) => e.skillIds.includes(params.skillId) && e.polarity !== 'neutral')
  const n = rows.length
  if (n < 6) return null

  const sorted = [...rows].sort((a, b) => parseEvidenceMs(a.at) - parseEvidenceMs(b.at))
  const recentN = Math.max(3, Math.min(Math.ceil(n * 0.42), 20))
  const recent = sorted.slice(-recentN)
  const prior = sorted.slice(0, Math.max(0, n - recentN))
  if (prior.length < 2) return null

  const recentScore = observedScoreFromEvidenceWeighted(recent, params.skillId, params.nowMs, {
    recencyHalfLifeDays: 11,
  })
  const priorScore = observedScoreFromEvidenceWeighted(prior, params.skillId, params.nowMs, {
    recencyHalfLifeDays: 32,
  })
  const diff = recentScore - priorScore

  const minN = params.confidence === 'high' ? 5 : params.confidence === 'medium' ? 6 : 8
  if (params.evidenceCount < minN) return 'unstable'

  const noiseBase = params.confidence === 'high' ? 2.28 : params.confidence === 'medium' ? 2.95 : 3.65
  const noise = noiseBase + 6.5 / Math.sqrt(n)

  if (Math.abs(diff) < noise) return 'flat'
  if (diff > noise) return 'up'
  if (diff < -noise) return 'down'
  return 'flat'
}
