/**
 * Single source for per-skill entry URLs and session-length hints on the Exams landing.
 *
 * When listening, reading, or KNM ship timed exam simulations, set `simulationHref` and
 * `simulationMinutes` on that skill only — cards and CTAs pick it up automatically.
 */
import { EXAM_PREP_TYPE_IDS, type ExamPrepTypeId } from '@/features/exam-prep/examPrepCatalog'

export type ExamPrepActionMode = 'training' | 'simulation' | 'kmn_path'

export type ExamSkillLaunchMeta = {
  hubHref: string
  trainingHref: string
  simulationHref: string | null
  trainingMinutes: number
  simulationMinutes: number | null
}

export const EXAM_SKILL_LAUNCH: Record<ExamPrepTypeId, ExamSkillLaunchMeta> = {
  speaking: {
    hubHref: '/app/exam-prep/speaking',
    trainingHref: '/app/exam-prep/speaking/training',
    simulationHref: '/app/exam-prep/speaking/simulation',
    trainingMinutes: 6,
    simulationMinutes: 18,
  },
  writing: {
    hubHref: '/app/exam-prep/writing',
    trainingHref: '/app/exam-prep/writing/training',
    simulationHref: '/app/exam-prep/writing/simulation',
    trainingMinutes: 8,
    simulationMinutes: 25,
  },
  listening: {
    hubHref: '/app/exam-prep/listening',
    trainingHref: '/app/exam-prep/listening/training',
    simulationHref: null,
    trainingMinutes: 7,
    simulationMinutes: null,
  },
  reading: {
    hubHref: '/app/exam-prep/reading',
    trainingHref: '/app/exam-prep/reading/training',
    simulationHref: null,
    trainingMinutes: 7,
    simulationMinutes: null,
  },
  kmn: {
    hubHref: '/app/exam-prep/kmn',
    trainingHref: '/app/exam-prep/kmn',
    simulationHref: null,
    trainingMinutes: 10,
    simulationMinutes: null,
  },
}

export function examPrepTypeIdFromTargetHref(href: string): ExamPrepTypeId | null {
  for (const id of EXAM_PREP_TYPE_IDS) {
    if (href.includes(`/exam-prep/${id}`)) return id
  }
  return null
}

export function inferExamActionMode(href: string): ExamPrepActionMode {
  if (href.includes('/simulation')) return 'simulation'
  if (href.endsWith('/kmn') || href.includes('/exam-prep/kmn/')) return 'kmn_path'
  return 'training'
}

export function minutesForRecommendedHref(href: string, skillId: ExamPrepTypeId): number {
  const launch = EXAM_SKILL_LAUNCH[skillId]
  const mode = inferExamActionMode(href)
  if (mode === 'simulation' && launch.simulationMinutes != null) return launch.simulationMinutes
  return launch.trainingMinutes
}
