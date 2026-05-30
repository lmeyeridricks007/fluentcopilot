/** Template ids for Exam Prep missions (prefix convention). */
const EXAM_MISSION_PREFIXES = ['d_exam_', 'w_exam_', 'sf_exam_'] as const

export function isExamPrepMissionTemplateId(templateId: string): boolean {
  return EXAM_MISSION_PREFIXES.some((p) => templateId.startsWith(p))
}

export function rubricRowsToCategoryScores(
  rows: ReadonlyArray<{ categoryKey: string; score: number }>
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    out[r.categoryKey] = r.score
  }
  return out
}

export function categoryAveragesToScores(
  rows: ReadonlyArray<{ categoryKey: string; averageScore: number }>
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    out[r.categoryKey] = r.averageScore
  }
  return out
}
