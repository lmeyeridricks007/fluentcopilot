/**
 * Evidence weighting: recency, per-row quality, and aggregation into a 0–100-style observation.
 */
import type { SkillEvidence, SkillId } from './skillTypes'

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export function parseEvidenceMs(at: string): number {
  const t = Date.parse(at)
  return Number.isFinite(t) ? t : 0
}

/** Slightly down-weight thin / secondary report-atom rows (already damped upstream). */
export function sourceQualityMultiplier(source: string): number {
  const s = source.toLowerCase()
  if (s.startsWith('report_atom:')) return 0.88
  if (s.includes('weak_vocab') || s.includes('weak_pattern')) return 1.02
  if (s.includes('pronunciation:') || s.includes('hesitation:')) return 1.0
  return 0.96
}

export function evidenceRowQuality(e: SkillEvidence, skillId: SkillId): number {
  if (!e.skillIds.includes(skillId)) return 0
  const base = clamp(e.magnitude, 0, 1) * clamp(e.weight, 0.05, 1.45)
  return clamp(base * sourceQualityMultiplier(e.source), 0.05, 1.35)
}

export function recencyWeight(at: string, nowMs: number, halfLifeDays: number): number {
  if (halfLifeDays <= 0) return 1
  const ageMs = Math.max(0, nowMs - parseEvidenceMs(at))
  const ageDays = ageMs / 86400000
  return Math.exp(-ageDays / halfLifeDays)
}

/**
 * Maps polarity-weighted evidence to a bounded “observed skill level” (same scale as legacy engine).
 */
export function observedScoreFromEvidenceWeighted(
  rows: SkillEvidence[],
  skillId: SkillId,
  nowMs: number,
  opts?: { recencyHalfLifeDays?: number },
): number {
  const halfLife = opts?.recencyHalfLifeDays ?? 21
  let pos = 0
  let neg = 0
  let wDenom = 0
  for (const e of rows) {
    if (!e.skillIds.includes(skillId)) continue
    if (e.polarity === 'neutral') continue
    const rw = recencyWeight(e.at, nowMs, halfLife)
    const q = evidenceRowQuality(e, skillId) * rw
    const v = e.magnitude * clamp(e.weight, 0.05, 1.4) * q
    wDenom += q
    if (e.polarity === 'positive') pos += v
    else if (e.polarity === 'negative') neg += v
  }
  if (wDenom < 0.08) return 56
  const scale = Math.max(0.55, Math.min(1.45, wDenom / Math.max(2, rows.length * 0.35)))
  const raw = 54 + Math.min(1.35, pos / scale) * 28 - Math.min(1.55, neg / scale) * 32
  return clamp(raw, 16, 95)
}

/** Mean quality for session-only rows (dampens session alpha when low). */
export function sessionEvidenceQualityMean(rows: SkillEvidence[], skillId: SkillId): number {
  const rel = rows.filter((e) => e.skillIds.includes(skillId) && e.polarity !== 'neutral')
  if (!rel.length) return 0.55
  let s = 0
  for (const e of rel) s += evidenceRowQuality(e, skillId)
  return clamp(s / rel.length, 0.22, 1.1)
}
