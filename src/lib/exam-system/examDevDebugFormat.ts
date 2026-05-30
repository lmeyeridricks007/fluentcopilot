import type { ExamProfile, ExamSessionRecord } from './types'

export function formatBlueprintDebugSummary(profile: ExamProfile): string {
  const sim = profile.simulationBlueprint
  const train = profile.trainingBlueprint
  const simTasks = sim.sections.flatMap((s) => s.tasks).reduce((acc, t) => acc + t.count, 0)
  const trainTasks = train.sections.flatMap((s) => s.tasks).reduce((acc, t) => acc + t.count, 0)
  const lines = [
    `examId=${profile.examId} examCode=${profile.examCode} level=${profile.level}`,
    `simulation: sections=${sim.sections.length} blueprintTasks≈${simTasks} totalEstimateSeconds=${sim.totalEstimateSeconds ?? '—'}`,
    `training: sections=${train.sections.length} blueprintTasks≈${trainTasks}`,
    `minTasksForMeaningfulXp: sim full=${profile.ui.minTasksForMeaningfulXp.simulation.full} section=${profile.ui.minTasksForMeaningfulXp.simulation.section} training=${profile.ui.minTasksForMeaningfulXp.training}`,
    `passReadiness: readyAbove=${profile.ui.passReadiness.readyAbove} borderlineAbove=${profile.ui.passReadiness.borderlineAbove}`,
  ]
  return lines.join('\n')
}

export function formatLastAttemptDebug(session: ExamSessionRecord | undefined): string {
  if (!session?.attempts?.length) return 'No attempts recorded.'
  const a = session.attempts[session.attempts.length - 1]
  return JSON.stringify(
    {
      taskId: a.taskId,
      taskType: a.taskType,
      composite: a.composite,
      retriesUsed: a.retriesUsed,
      scores: a.scores,
    },
    null,
    2,
  )
}

export function formatTimersDebug(input: {
  phaseLabel?: string
  phaseRemainingSec?: number | null
  sectionWallRemainingSec?: number | null
  sessionRemainingSec?: number | null
  totalEstimateSec?: number | null
  fullExamWallRemainingSec?: number | null
  sumSessionTasksSec?: number
}): string {
  return JSON.stringify(input, null, 2)
}
