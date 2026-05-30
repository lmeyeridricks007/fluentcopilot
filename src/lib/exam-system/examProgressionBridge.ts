import type { SessionCompleteBody } from '@/lib/progression/progressionSessionComplete'
import type { ExamSessionRecord, SimulationExamReport, TrainingExamReport } from './types'
import { buildExamMemoryWeaknessTags, dedupeLowerTags } from './examPersonalizationBridge'
import { minTasksForXp } from './sessionLifecycle'

function durationSeconds(session: ExamSessionRecord): number {
  const start = session.startedAt ? Date.parse(session.startedAt) : Date.parse(session.createdAt)
  const end = session.completedAt ? Date.parse(session.completedAt) : Date.now()
  return Math.max(0, Math.floor((end - start) / 1000))
}

function weaknessesFromReport(session: ExamSessionRecord): string[] {
  const r = session.report
  if (!r) return []
  if (r.kind === 'simulation') {
    const sim = r as SimulationExamReport
    const ws: string[] = []
    if (sim.mainBlocker) ws.push(`exam_dim:${sim.mainBlocker}`)
    if (sim.readinessBand === 'borderline') ws.push('exam_readiness_borderline')
    if (sim.readinessBand === 'not_ready') ws.push('exam_readiness_focus')
    return ws
  }
  const tr = r as TrainingExamReport
  return tr.blockingDimensions.map((d) => `exam_dim:${d}`)
}

function improvementsFromReport(session: ExamSessionRecord): string[] {
  const r = session.report
  if (r?.kind === 'training') {
    return r.improvedDimensions.map((d) => `exam_improved:${d}`)
  }
  if (r?.kind === 'simulation' && r.readinessBand === 'ready') {
    return ['exam_readiness_ready']
  }
  return []
}

export function toProgressionSessionComplete(
  session: ExamSessionRecord,
  profileIdForMin: string,
): SessionCompleteBody | null {
  if (session.status !== 'completed') return null
  const minT = minTasksForXp(session, profileIdForMin)
  const tasksDone = new Set(session.attempts.map((a) => a.taskId)).size
  const meaningfulCompletion = session.status === 'completed' && tasksDone >= minT
  const type = session.mode === 'simulation' ? 'exam_simulation' : 'exam_training'
  return {
    sessionId: session.id,
    userId: session.userId,
    type,
    durationSeconds: durationSeconds(session),
    completed: session.status === 'completed',
    turns: tasksDone,
    improvements: improvementsFromReport(session),
    weaknessesTargeted: dedupeLowerTags([...weaknessesFromReport(session), ...buildExamMemoryWeaknessTags(session)]),
    createdAt: session.completedAt ?? session.updatedAt,
    meaningfulCompletion,
    examXpMeta: session.xpMeta,
    examTasksCompleted: tasksDone,
    examMinTasks: minT,
    xpBandSeed: session.id,
    examProfileId: session.profileId,
    examLevel: session.level,
  }
}
