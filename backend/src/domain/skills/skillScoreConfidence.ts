/**
 * Skill metric confidence from evidence volume, modalities, source quality, consistency, and time spread.
 */
import type { SkillConfidence, SkillEvidence, SkillId } from './skillTypes'
import { clamp, evidenceRowQuality, parseEvidenceMs, observedScoreFromEvidenceWeighted } from './skillScoreEvidenceAggregation'

function modalityCount(rows: SkillEvidence[]): number {
  const m = new Set<string>()
  for (const e of rows) {
    const t = (e.sessionType ?? '').trim()
    if (t) m.add(t)
  }
  return m.size
}

/**
 * Per-session implied observation; low cross-session variance → higher consistency.
 */
function consistency01(rows: SkillEvidence[], skillId: SkillId, nowMs: number): number {
  const bySession = new Map<string, SkillEvidence[]>()
  for (const e of rows) {
    if (!e.skillIds.includes(skillId) || e.polarity === 'neutral') continue
    const sid = e.sessionId || 'unknown'
    const arr = bySession.get(sid) ?? []
    arr.push(e)
    bySession.set(sid, arr)
  }
  if (bySession.size < 2) return 0.42
  const scores: number[] = []
  for (const [, evs] of bySession) {
    scores.push(observedScoreFromEvidenceWeighted(evs, skillId, nowMs, { recencyHalfLifeDays: 60 }))
  }
  if (scores.length < 2) return 0.42
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const varSum = scores.reduce((a, x) => a + (x - mean) ** 2, 0) / scores.length
  const sd = Math.sqrt(varSum)
  const cv = mean > 1 ? sd / mean : 1
  return clamp(1 - Math.min(1, cv / 0.14), 0, 1)
}

function recencySpread01(rows: SkillEvidence[], skillId: SkillId): number {
  const ts: number[] = []
  for (const e of rows) {
    if (!e.skillIds.includes(skillId)) continue
    const ms = parseEvidenceMs(e.at)
    if (ms > 0) ts.push(ms)
  }
  if (ts.length < 2) return 0.25
  const spanDays = (Math.max(...ts) - Math.min(...ts)) / 86400000
  return clamp(spanDays / 24, 0, 1)
}

function meanSourceQuality(rows: SkillEvidence[], skillId: SkillId): number {
  const rel = rows.filter((e) => e.skillIds.includes(skillId) && e.polarity !== 'neutral')
  if (!rel.length) return 0.45
  let s = 0
  for (const e of rel) s += evidenceRowQuality(e, skillId)
  return clamp(s / rel.length, 0, 1)
}

/**
 * Composite confidence bucket. Tuned so new learners stay `low` until several sessions across modalities.
 */
export function computeSkillMetricConfidence(params: {
  evidenceCount: number
  rowsForSkill: SkillEvidence[]
  skillId: SkillId
  nowMs: number
}): SkillConfidence {
  const { evidenceCount, rowsForSkill, skillId, nowMs } = params
  const mods = modalityCount(rowsForSkill)
  const qual = meanSourceQuality(rowsForSkill, skillId)
  const cons = consistency01(rowsForSkill, skillId, nowMs)
  const spread = recencySpread01(rowsForSkill, skillId)

  let score = 0
  score += Math.min(18, evidenceCount * 1.05)
  score += Math.min(14, mods * 4.5)
  score += qual * 12
  score += cons * 14
  score += spread * 10

  /** Sparse per-skill rows: cap confidence until several sessions land in the ring. */
  if (rowsForSkill.length < 4) score -= 10
  if (evidenceCount < 6) score -= 5

  if (score < 19) return 'low'
  if (score < 34) return 'medium'
  return 'high'
}
