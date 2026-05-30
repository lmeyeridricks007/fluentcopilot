import { getRetentionUserId } from '@/lib/retention/retentionService'
import { applyMissionSignal } from '@/lib/missions/missionProgressTracker'
import { getClientMissionGeneratorContext } from '@/lib/missions/clientMissionContext'
import type { ExamPrepMissionDomain, ExamPrepMissionMode } from '@/lib/schemas/practice/missionRuntimeState.schema'

export function notifyExamPrepMissionProgress(input: {
  domain: ExamPrepMissionDomain
  mode: ExamPrepMissionMode
  normalizedPercent?: number
  categoryScores?: Record<string, number>
}): void {
  if (typeof window === 'undefined') return
  const userId = getRetentionUserId()
  applyMissionSignal(
    userId,
    {
      type: 'exam_prep_complete',
      domain: input.domain,
      mode: input.mode,
      normalizedPercent: input.normalizedPercent,
      categoryScores: input.categoryScores,
    },
    getClientMissionGeneratorContext({ userId })
  )
}
