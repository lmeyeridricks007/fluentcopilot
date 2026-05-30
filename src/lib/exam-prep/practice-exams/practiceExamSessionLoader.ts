/**
 * Resolve registry rows → runtime session plans used by exam-prep flows.
 */
import { buildListeningDuoPracticeExamPlan, buildListeningPracticeExamPlanFromIds } from '@/lib/exam-prep/listening/listeningTaskBuilder'
import { buildReadingDuoPracticeExamPlan, buildReadingPracticeExamPlanFromIds } from '@/lib/exam-prep/reading/readingTaskBuilder'
import {
  buildSpeakingDuoPracticeExamPlan,
  buildSpeakingSimulationPlanFromQuestionIds,
} from '@/lib/exam-prep/speaking/speakingSimulationSessionBuilder'
import { buildWritingSimulationPlanFromItemIds } from '@/lib/exam-prep/writing/writingSimulationSessionBuilder'
import { getPracticeExamSet } from '@/lib/exam-prep/practice-exams/practiceExamRegistry'
import type { PracticeExamSetDef } from '@/lib/exam-prep/practice-exams/types'

export function loadPracticeExamSpeakingPlan(setId: string) {
  const def = getPracticeExamSet(setId)
  if (!def || def.module !== 'speaking') throw new Error(`Unknown speaking practice exam: ${setId}`)
  if (def.speakingQuestionIds?.length === 4) {
    return buildSpeakingSimulationPlanFromQuestionIds(def.speakingQuestionIds, def.titleNl, def.subtitleNl)
  }
  return buildSpeakingDuoPracticeExamPlan({ setId, titleNl: def.titleNl, subtitleNl: def.subtitleNl })
}

export function loadPracticeExamWritingPlan(setId: string) {
  const def = getPracticeExamSet(setId)
  if (!def || def.module !== 'writing') throw new Error(`Unknown writing practice exam: ${setId}`)
  return buildWritingSimulationPlanFromItemIds(def.writingTaskIds, def.titleNl, def.subtitleNl)
}

export function loadPracticeExamListeningPlan(setId: string) {
  const def = getPracticeExamSet(setId)
  if (!def || def.module !== 'listening') throw new Error(`Unknown listening practice exam: ${setId}`)
  if (def.listeningTaskIds?.length) {
    return buildListeningPracticeExamPlanFromIds(def.listeningTaskIds)
  }
  return buildListeningDuoPracticeExamPlan(setId)
}

export function loadPracticeExamReadingPlan(setId: string) {
  const def = getPracticeExamSet(setId)
  if (!def || def.module !== 'reading') throw new Error(`Unknown reading practice exam: ${setId}`)
  if (def.readingTaskIds?.length) {
    return buildReadingPracticeExamPlanFromIds(def.readingTaskIds)
  }
  return buildReadingDuoPracticeExamPlan(setId)
}

export function assertPracticeExamSet(setId: string): PracticeExamSetDef {
  const def = getPracticeExamSet(setId)
  if (!def) throw new Error(`Unknown practice exam set: ${setId}`)
  return def
}
