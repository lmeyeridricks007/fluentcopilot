import type { ApiSkillDefinition, ApiSkillId, ApiSkillMetric, TalkTrainingLoopCard } from '@/lib/api/apiTypes'

export function groupScore(metrics: Partial<Record<ApiSkillId, ApiSkillMetric>>, defs: ApiSkillDefinition[]): number | null {
  const ids = defs.map((d) => d.id)
  const scores = ids.map((id) => metrics[id]?.score).filter((x): x is number => typeof x === 'number')
  if (!scores.length) return null
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

export function pickExtremeSkill(
  defs: ApiSkillDefinition[],
  metrics: Partial<Record<ApiSkillId, ApiSkillMetric>>,
  mode: 'high' | 'low',
): { id: ApiSkillId; label: string; score: number } | null {
  let best: { id: ApiSkillId; label: string; score: number } | null = null
  for (const d of defs) {
    const m = metrics[d.id]
    if (!m) continue
    if (!best) {
      best = { id: d.id, label: d.label, score: m.score }
      continue
    }
    if (mode === 'high' && m.score > best.score) best = { id: d.id, label: d.label, score: m.score }
    if (mode === 'low' && m.score < best.score) best = { id: d.id, label: d.label, score: m.score }
  }
  return best
}

export function pickBestLoopForSkill(skillId: ApiSkillId, loops: TalkTrainingLoopCard[]): TalkTrainingLoopCard | null {
  return loops.find((l) => l.targetSkills.includes(skillId)) ?? null
}

export function groupSkillIdSet(defs: ApiSkillDefinition[]): Set<ApiSkillId> {
  return new Set(defs.map((d) => d.id))
}

function loopOverlapsGroup(loop: TalkTrainingLoopCard, groupIds: Set<ApiSkillId>): boolean {
  return loop.targetSkills.some((id) => groupIds.has(id as ApiSkillId))
}

/** One loop most relevant to this skill group (lowest skill, then primary slot, else first match). */
export function pickTopLoopForGroup(
  defs: ApiSkillDefinition[],
  metrics: Partial<Record<ApiSkillId, ApiSkillMetric>>,
  trainingLoops: TalkTrainingLoopCard[],
): TalkTrainingLoopCard | null {
  const groupIds = groupSkillIdSet(defs)
  const candidates = trainingLoops.filter((l) => loopOverlapsGroup(l, groupIds))
  if (!candidates.length) return null
  const lo = pickExtremeSkill(defs, metrics, 'low')
  if (lo) {
    const forLo = candidates.find((l) => l.targetSkills.includes(lo.id))
    if (forLo) return forLo
  }
  const slot0 = candidates.find((l) => (l.loopSlot ?? 99) === 0)
  if (slot0) return slot0
  return candidates[0]
}
