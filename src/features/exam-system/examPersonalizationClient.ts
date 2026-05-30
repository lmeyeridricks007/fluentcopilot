'use client'

import type { ExamSessionRecord, SimulationExamReport, TrainingExamReport } from '@/lib/exam-system/types'
import { buildExamMemoryWeaknessTags } from '@/lib/exam-system/examPersonalizationBridge'
import { recordAbilityExamSessionSignal } from '@/lib/mastery/recordAbilitySignals'
import { applyMissionSignal } from '@/lib/missions/missionProgressTracker'
import type { MissionGeneratorContext } from '@/lib/missions/types'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { recordLastPracticeWeakSignals } from '@/lib/weakness/lastPracticeSignalsStorage'

const DEFAULT_MISSION_CTX: MissionGeneratorContext = {
  tier: 'free',
  atScenarioCap: false,
  weaknessInsights: [],
}

/**
 * After a completed Fluent Exam session: local weakness memory, practical-ability EMA nudges,
 * and exam-prep mission counters (speaking domain).
 */
export function applyExamPersonalizationClientEffects(session: ExamSessionRecord): void {
  if (typeof window === 'undefined') return
  if (session.status !== 'completed' || !session.report) return

  const tags = buildExamMemoryWeaknessTags(session)
  if (tags.length) {
    recordLastPracticeWeakSignals({
      tags,
      scenarioId: 'fluent_exam_system',
      outcome: session.mode === 'simulation' ? 'needs_practice' : 'partial',
    })
  }

  recordAbilityExamSessionSignal({ session, userId: getRetentionUserId() })

  const uid = session.userId?.trim() || getRetentionUserId()
  const normalizedPercent =
    session.report.kind === 'simulation'
      ? Math.round((session.report as SimulationExamReport).overallScore01 * 100)
      : Math.round((session.report as TrainingExamReport).qualityScore01 * 100)

  applyMissionSignal(
    uid,
    {
      type: 'exam_prep_complete',
      domain: 'speaking',
      mode: session.mode === 'simulation' ? 'simulation' : 'training',
      normalizedPercent,
    },
    DEFAULT_MISSION_CTX,
  )
}
