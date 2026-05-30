/**
 * Skill Score Engine — converts evidence (session + ring buffer) into stable 0–100 metrics,
 * states, trends, and confidence. Session updates are damped by evidence quality; trend
 * prefers recent-vs-prior windows when enough history exists.
 */
import type { SkillConfidence, SkillEvidence, SkillId, SkillMetric, SkillTrend } from './skillTypes'
import { ALL_SKILL_IDS, skillGroupForId } from './skillTypes'
import { scoreToState } from './skillScoreStateMapping'
import { computeSkillMetricConfidence } from './skillScoreConfidence'
import {
  clamp,
  observedScoreFromEvidenceWeighted,
  sessionEvidenceQualityMean,
} from './skillScoreEvidenceAggregation'
import { computeTrendFromEvidenceWindows } from './skillScoreTrend'

export { scoreToState } from './skillScoreStateMapping'
export { trendToUserFacingLabel, type SkillTrendUserLabel } from './skillTrendLabels'
export { SKILL_SCORE_STATE_THRESHOLDS } from './skillScoreStateMapping'
export { computeSkillMetricConfidence } from './skillScoreConfidence'
export {
  evidenceRowQuality,
  observedScoreFromEvidenceWeighted,
  parseEvidenceMs,
  recencyWeight,
  sourceQualityMultiplier,
} from './skillScoreEvidenceAggregation'

function mergeSourceMix(prev: string[], add: string[], max = 10): string[] {
  const out = [...prev]
  for (const s of add) {
    const t = s.trim()
    if (!t || out.includes(t)) continue
    out.push(t)
    if (out.length >= max) break
  }
  return out.slice(-max)
}

function sessionAlpha(sessionWeight: number, touches: number): number {
  const base = 0.048 + 0.026 * Math.log2(touches + 1)
  return clamp(base * (0.86 + sessionWeight * 0.13), 0.03, 0.2)
}

function legacyObservedScoreFromSession(rows: SkillEvidence[], skillId: SkillId): number {
  let pos = 0
  let neg = 0
  for (const e of rows) {
    if (!e.skillIds.includes(skillId)) continue
    const v = e.magnitude * clamp(e.weight, 0.05, 1.4)
    if (e.polarity === 'positive') pos += v
    else if (e.polarity === 'negative') neg += v
  }
  const raw = 54 + Math.min(1.35, pos) * 28 - Math.min(1.55, neg) * 32
  return clamp(raw, 16, 95)
}

function computeTrendLegacy(params: {
  score: number
  baselineScore: number
  evidenceCount: number
  confidence: SkillConfidence
}): SkillTrend {
  const diff = params.score - params.baselineScore
  const minN = params.confidence === 'high' ? 5 : params.confidence === 'medium' ? 6 : 8
  if (params.evidenceCount < minN) return 'unstable'
  const noise = params.confidence === 'low' ? 3.4 : params.confidence === 'medium' ? 2.6 : 2.1
  if (Math.abs(diff) < noise) return 'flat'
  if (diff > noise) return 'up'
  if (diff < -noise) return 'down'
  return 'flat'
}

export type ApplySessionEvidenceParams = {
  prev: Partial<Record<SkillId, SkillMetric>>
  sessionEvidence: SkillEvidence[]
  /** Evidence already persisted for this user (tail); combined with `sessionEvidence` for ranking signals. */
  recentEvidenceRing?: SkillEvidence[] | undefined
  sessionTypeWeight: number
  nowIso: string
}

export function applySessionEvidenceToMetrics(params: ApplySessionEvidenceParams): Partial<Record<SkillId, SkillMetric>> {
  const nowMs = Date.parse(params.nowIso)
  const nowSafe = Number.isFinite(nowMs) ? nowMs : Date.now()

  const ring =
    params.recentEvidenceRing && params.recentEvidenceRing.length
      ? [...params.recentEvidenceRing, ...params.sessionEvidence]
      : [...params.sessionEvidence]

  const touched = new Set<SkillId>()
  for (const e of params.sessionEvidence) {
    for (const s of e.skillIds) touched.add(s)
  }

  const next: Partial<Record<SkillId, SkillMetric>> = { ...params.prev }

  for (const skillId of ALL_SKILL_IDS) {
    if (!touched.has(skillId) && !params.prev[skillId]) continue

    const sessionRows = params.sessionEvidence.filter((e) => e.skillIds.includes(skillId))
    const ringRows = ring.filter((e) => e.skillIds.includes(skillId))

    if (!sessionRows.length && !params.prev[skillId]) continue

    const prevM = params.prev[skillId]
    const observedSession =
      sessionRows.length > 0 ? legacyObservedScoreFromSession(sessionRows, skillId) : (prevM?.score ?? 56)

    const touches = sessionRows.length || 0
    const alphaBase = sessionAlpha(params.sessionTypeWeight, Math.max(1, touches))
    const qualityMean = sessionRows.length ? sessionEvidenceQualityMean(sessionRows, skillId) : 0.62
    const alpha = clamp(alphaBase * (0.4 + 0.6 * qualityMean) * (0.82 + 0.18 * clamp(params.sessionTypeWeight, 0, 1.2)), 0.026, 0.165)

    const prevScore = prevM?.score ?? 56
    const prevBaseline = prevM?.baselineScore ?? prevScore
    const newScore = sessionRows.length ? prevScore * (1 - alpha) + observedSession * alpha : prevScore
    const beta = alpha * 0.36
    const newBaseline = sessionRows.length ? prevBaseline * (1 - beta) + observedSession * beta : prevBaseline

    const evidenceCount = (prevM?.evidenceCount ?? 0) + touches
    const sources = mergeSourceMix(prevM?.sourceMix ?? [], ringRows.map((r) => r.source))

    const confidence = computeSkillMetricConfidence({
      evidenceCount,
      rowsForSkill: ringRows,
      skillId,
      nowMs: nowSafe,
    })

    const windowTrend = computeTrendFromEvidenceWindows({
      ringRows,
      skillId,
      nowMs: nowSafe,
      evidenceCount,
      confidence,
    })
    const trend: SkillTrend =
      windowTrend ??
      computeTrendLegacy({
        score: newScore,
        baselineScore: newBaseline,
        evidenceCount,
        confidence,
      })

    const state = scoreToState(newScore)

    next[skillId] = {
      skillId,
      group: skillGroupForId(skillId),
      score: Math.round(clamp(newScore, 0, 100)),
      baselineScore: clamp(newBaseline, 0, 100),
      state,
      trend,
      confidence,
      evidenceCount,
      lastUpdatedAt: sessionRows.length ? params.nowIso : prevM?.lastUpdatedAt ?? params.nowIso,
      sourceMix: sources,
      ...(sessionRows.length
        ? {
            priorScore: Math.round(clamp(prevScore, 0, 100)),
            lastSessionObservedScore: Math.round(clamp(observedSession, 0, 100)),
          }
        : {}),
    }
  }

  return next
}

export function overallSkillScoreFromMetrics(metrics: Partial<Record<SkillId, SkillMetric>>): number | null {
  const vals = ALL_SKILL_IDS.map((id) => metrics[id]?.score).filter((x): x is number => typeof x === 'number')
  if (vals.length < 6) return null
  const sorted = [...vals].sort((a, b) => a - b)
  const trim = Math.floor(sorted.length * 0.08)
  const slice = sorted.slice(trim, sorted.length - trim)
  if (!slice.length) return null
  return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length)
}

/** Diagnostic: long-horizon observation from the evidence ring (recency-weighted). */
export function observedScoreFromRingForSkill(
  ringRows: SkillEvidence[],
  skillId: SkillId,
  nowIso: string,
): number {
  const nowMs = Date.parse(nowIso)
  return observedScoreFromEvidenceWeighted(ringRows, skillId, Number.isFinite(nowMs) ? nowMs : Date.now(), {
    recencyHalfLifeDays: 28,
  })
}
