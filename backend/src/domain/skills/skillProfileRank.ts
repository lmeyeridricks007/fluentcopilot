import type { SkillId, SkillMetric } from './skillTypes'

function quality(m: SkillMetric): number {
  if (m.confidence === 'low') return 0.55
  if (m.confidence === 'medium') return 0.78
  return 1
}

export function rankStrongestWeakestAndFocus(metrics: Partial<Record<SkillId, SkillMetric>>): {
  strongestSkills: SkillId[]
  weakestSkills: SkillId[]
  currentFocusSkills: SkillId[]
} {
  const rows = Object.values(metrics).filter(Boolean) as SkillMetric[]
  const pool = rows.filter((m) => m.evidenceCount >= 1)
  const weakest = [...pool]
    .sort((a, b) => a.score * quality(a) - b.score * quality(b))
    .map((m) => m.skillId)
    .filter((id, i, a) => a.indexOf(id) === i)
    .slice(0, 6)

  const strongest = [...pool]
    .sort((a, b) => b.score * quality(b) - a.score * quality(a))
    .map((m) => m.skillId)
    .filter((id, i, a) => a.indexOf(id) === i)
    .slice(0, 6)

  const focus = weakest
    .filter((id) => {
      const m = metrics[id]
      if (!m) return false
      if (m.state === 'strong' || m.state === 'solid') return false
      return true
    })
    .slice(0, 3)

  return {
    strongestSkills: strongest,
    weakestSkills: weakest,
    currentFocusSkills: focus.length ? focus : weakest.slice(0, 3),
  }
}
