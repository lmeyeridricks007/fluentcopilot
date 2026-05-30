import type { ResumableFlow } from './resumeTypes'

/** Product order: mandatory onboarding → exam simulations → lessons. */
export const RESUME_PRIORITY_RANK = {
  onboarding: 100,
  exam_simulation: 80,
  lesson: 60,
} as const

export function compareResumableFlows(a: ResumableFlow, b: ResumableFlow): number {
  if (a.priorityRank !== b.priorityRank) return b.priorityRank - a.priorityRank
  const ta = a.lastUpdatedAt ? Date.parse(a.lastUpdatedAt) : 0
  const tb = b.lastUpdatedAt ? Date.parse(b.lastUpdatedAt) : 0
  if (tb !== ta) return tb - ta
  return a.kind.localeCompare(b.kind)
}

export function sortResumableFlows(flows: ResumableFlow[]): ResumableFlow[] {
  return [...flows].sort(compareResumableFlows)
}
