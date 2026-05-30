/**
 * Converts granular {@link SkillEvidenceAtom} rows into merge {@link SkillEvidence}.
 *
 * Magnitudes are damped vs. direct insight-derived evidence to limit double-counting when
 * both paths run for the same session (insights remain the primary merge driver).
 */
import { randomUUID } from 'node:crypto'
import type { SkillEvidence, SkillPolarity } from './skillTypes'
import type { SkillEvidenceAtom } from './skillEvidenceAtomTypes'
import { clamp01 } from './skillEvidenceReportMappingCore'

/** Applied to atom-derived magnitudes (layered on top of insight mapper). */
export const SKILL_EVIDENCE_ATOM_LAYER_DAMPEN = 0.38

function polarityToSkillPolarity(p: SkillEvidenceAtom['positiveOrNegative']): SkillPolarity {
  return p
}

function atomMagnitude(a: SkillEvidenceAtom): number {
  const base = clamp01(a.severity / 3) * 0.55 + clamp01(a.confidence) * 0.45
  const deltaBoost =
    a.scoreDeltaCandidate != null && Number.isFinite(a.scoreDeltaCandidate)
      ? Math.min(0.12, Math.abs(a.scoreDeltaCandidate) * 0.018)
      : 0
  return clamp01((base * 0.92 + deltaBoost) * SKILL_EVIDENCE_ATOM_LAYER_DAMPEN + 0.04)
}

export function atomsToSkillEvidence(atoms: SkillEvidenceAtom[], sessionTypeWeight: number): SkillEvidence[] {
  const out: SkillEvidence[] = []
  for (const a of atoms) {
    if (a.positiveOrNegative === 'neutral') continue
    const polarity = polarityToSkillPolarity(a.positiveOrNegative)
    const magnitude = atomMagnitude(a)
    const w = sessionTypeWeight * (0.52 + 0.38 * clamp01(a.confidence))
    out.push({
      id: randomUUID(),
      sessionId: a.sessionId,
      at: a.createdAt,
      sessionType: a.sessionType,
      source: `report_atom:${a.evidenceType}`,
      polarity,
      magnitude,
      weight: Math.max(0.06, w),
      skillIds: [a.skillId],
      note: a.sourceSummary.slice(0, 420),
    })
  }
  return out
}
