import {
  parseWritingSimulationAutosave,
  canResumeWritingSimulation,
  parseSpeakingSimulationAutosave,
  canResumeSpeakingSimulation,
  parseListeningPracticeExamAutosave,
  canResumeListeningPracticeExam,
  parseReadingPracticeExamAutosave,
  canResumeReadingPracticeExam,
} from '@/lib/autosave/examAutosave'
import { readAutosaveEnvelope } from '@/lib/autosave/autosaveStorage'
import { writingSimulationDraftKey, speakingSimulationDraftKey } from '@/lib/autosave/autosaveKeys'
import {
  loadPracticeExamListeningPlan,
  loadPracticeExamReadingPlan,
} from '@/lib/exam-prep/practice-exams/practiceExamSessionLoader'
import { getPracticeExamSet } from '@/lib/exam-prep/practice-exams/practiceExamRegistry'
import { getUserDrafts } from '@/lib/storage/draftStorage'
import { RESUME_PRIORITY_RANK, compareResumableFlows } from './resumePriority'
import type { ResumableFlow } from './resumeTypes'

function listeningTaskIdsForSet(setId: string): string[] | null {
  try {
    const plan = loadPracticeExamListeningPlan(setId)
    return plan.tasks.map((t) => t.id)
  } catch {
    return null
  }
}

function readingTaskIdsForSet(setId: string): string[] | null {
  try {
    const plan = loadPracticeExamReadingPlan(setId)
    return plan.tasks.map((t) => t.id)
  } catch {
    return null
  }
}

/**
 * Strongest exam-prep resume among writing/speaking simulations and listening/reading practice exams.
 * Uses existing autosave bodies + canResume* guards (deadlines, content version, phase).
 */
export function findResumableExamSimulation(userId: string): ResumableFlow | null {
  if (!userId || typeof window === 'undefined') return null

  const doc = getUserDrafts(userId)
  const drafts = doc.writingDrafts ?? {}
  const candidates: ResumableFlow[] = []

  for (const logicalKey of Object.keys(drafts)) {
    const env = readAutosaveEnvelope(userId, logicalKey)
    const lastUpdatedAt = env?.savedAt ?? drafts[logicalKey]?.updatedAt ?? null

    if (logicalKey === writingSimulationDraftKey('free')) {
      const body = parseWritingSimulationAutosave(env?.body)
      if (body && canResumeWritingSimulation(body, {})) {
        candidates.push({
          kind: 'writing_simulation',
          priorityRank: RESUME_PRIORITY_RANK.exam_simulation,
          title: 'Resume writing simulation',
          summary: `${body.plan.titleNl} — part ${body.taskIndex + 1} of ${body.plan.taskCount}`,
          lastUpdatedAt,
          continueHref: '/app/exam-prep/writing/simulation',
          allowRestart: true,
          restartPayload: {
            type: 'autosave',
            logicalKey,
            domain: 'simulation',
            entityId: 'writing-simulation-free',
          },
        })
      }
      continue
    }

    const wPe = logicalKey.match(/^autosave\/v1\/writing-simulation\/pe\/(.+)$/)
    if (wPe) {
      const setId = wPe[1]!
      const body = parseWritingSimulationAutosave(env?.body)
      if (body && canResumeWritingSimulation(body, { practiceExamSetId: setId })) {
        const def = getPracticeExamSet(setId)
        candidates.push({
          kind: 'writing_simulation',
          priorityRank: RESUME_PRIORITY_RANK.exam_simulation,
          title: 'Resume writing practice exam',
          summary: `${def?.titleNl ?? 'Writing exam'} — part ${body.taskIndex + 1} of ${body.plan.taskCount}`,
          lastUpdatedAt,
          continueHref: `/app/exam-prep/writing/practice-exams/${encodeURIComponent(setId)}`,
          allowRestart: true,
          restartPayload: {
            type: 'autosave',
            logicalKey,
            domain: 'simulation',
            entityId: setId,
          },
        })
      }
      continue
    }

    if (logicalKey === speakingSimulationDraftKey('free')) {
      const body = parseSpeakingSimulationAutosave(env?.body)
      if (body && canResumeSpeakingSimulation(body, {})) {
        candidates.push({
          kind: 'speaking_simulation',
          priorityRank: RESUME_PRIORITY_RANK.exam_simulation,
          title: 'Resume speaking simulation',
          summary: `${body.plan.titleNl} — question ${body.questionIndex + 1} of ${body.plan.questionCount}`,
          lastUpdatedAt,
          continueHref: '/app/exam-prep/speaking/simulation',
          allowRestart: true,
          restartPayload: {
            type: 'autosave',
            logicalKey,
            domain: 'simulation',
            entityId: 'speaking-simulation-free',
          },
        })
      }
      continue
    }

    const sPe = logicalKey.match(/^autosave\/v1\/speaking-simulation\/pe\/(.+)$/)
    if (sPe) {
      const setId = sPe[1]!
      const body = parseSpeakingSimulationAutosave(env?.body)
      if (body && canResumeSpeakingSimulation(body, { practiceExamSetId: setId })) {
        const def = getPracticeExamSet(setId)
        candidates.push({
          kind: 'speaking_simulation',
          priorityRank: RESUME_PRIORITY_RANK.exam_simulation,
          title: 'Resume speaking practice exam',
          summary: `${def?.titleNl ?? 'Speaking exam'} — question ${body.questionIndex + 1} of ${body.plan.questionCount}`,
          lastUpdatedAt,
          continueHref: `/app/exam-prep/speaking/practice-exams/${encodeURIComponent(setId)}`,
          allowRestart: true,
          restartPayload: {
            type: 'autosave',
            logicalKey,
            domain: 'simulation',
            entityId: setId,
          },
        })
      }
      continue
    }

    const lPe = logicalKey.match(/^autosave\/v1\/listening-practice-exam\/(.+)$/)
    if (lPe) {
      const setId = lPe[1]!
      const body = parseListeningPracticeExamAutosave(env?.body)
      const taskIds = listeningTaskIdsForSet(setId)
      if (body && taskIds && canResumeListeningPracticeExam(body, setId, taskIds)) {
        const def = getPracticeExamSet(setId)
        candidates.push({
          kind: 'listening_practice_exam',
          priorityRank: RESUME_PRIORITY_RANK.exam_simulation,
          title: 'Resume listening practice exam',
          summary: `${def?.titleNl ?? 'Listening exam'} — item ${body.taskIndex + 1} of ${taskIds.length}`,
          lastUpdatedAt,
          continueHref: `/app/exam-prep/listening/practice-exams/${encodeURIComponent(setId)}`,
          allowRestart: true,
          restartPayload: {
            type: 'autosave',
            logicalKey,
            domain: 'exam',
            entityId: setId,
          },
        })
      }
      continue
    }

    const rPe = logicalKey.match(/^autosave\/v1\/reading-practice-exam\/(.+)$/)
    if (rPe) {
      const setId = rPe[1]!
      const body = parseReadingPracticeExamAutosave(env?.body)
      const taskIds = readingTaskIdsForSet(setId)
      if (body && taskIds && canResumeReadingPracticeExam(body, setId, taskIds)) {
        const def = getPracticeExamSet(setId)
        candidates.push({
          kind: 'reading_practice_exam',
          priorityRank: RESUME_PRIORITY_RANK.exam_simulation,
          title: 'Resume reading practice exam',
          summary: `${def?.titleNl ?? 'Reading exam'} — item ${body.taskIndex + 1} of ${taskIds.length}`,
          lastUpdatedAt,
          continueHref: `/app/exam-prep/reading/practice-exams/${encodeURIComponent(setId)}`,
          allowRestart: true,
          restartPayload: {
            type: 'autosave',
            logicalKey,
            domain: 'exam',
            entityId: setId,
          },
        })
      }
    }
  }

  if (candidates.length === 0) return null
  candidates.sort(compareResumableFlows)
  return candidates[0]!
}
