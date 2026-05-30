import { buildSimulationReport, buildTrainingReport } from './reportBuilder'
import { getExamProfile } from './examProfileRegistry'
import { generateExamTasks } from './taskGenerator'
import { scoreTaskAttempt } from './scoringEngine'
import { examTaskWithFormFillRubricIfNeeded } from './writingExamFillInCompose'
import { shapeTrainingTasks } from './trainingTaskPlan'
import type {
  ExamLevel,
  ExamProfile,
  ExamRunMode,
  ExamScope,
  ExamSessionRecord,
  ExamTaskAttempt,
  ExamTaskType,
  ExamTrainingEntryMode,
  ExamTrainingSupport,
  ExamVoiceAssessmentSnapshot,
  ExamXpMeta,
  TrainingExamReport,
} from './types'

function isoNow(): string {
  return new Date().toISOString()
}

export function newExamSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `exam-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createExamSession(params: {
  userId: string
  profileId: string
  level: ExamLevel
  mode: ExamRunMode
  scope: ExamScope
  sectionId?: string
  trainingSupport?: ExamTrainingSupport
  timedTraining?: boolean
  weaknessRepair?: boolean
  trainingEntryMode?: ExamTrainingEntryMode
  focusTaskType?: ExamTaskType
}): ExamSessionRecord | null {
  const profile = getExamProfile(params.profileId)
  if (!profile) return null
  const id = newExamSessionId()
  const now = isoNow()
  let tasks = generateExamTasks({
    profile,
    level: params.level,
    mode: params.mode,
    scope: params.scope,
    sectionId: params.sectionId,
    sessionSeed: id,
  })
  const trainingEntryMode: ExamTrainingEntryMode | undefined =
    params.mode === 'training'
      ? (params.trainingEntryMode ?? (params.scope === 'section' ? 'section' : 'full_mix'))
      : undefined
  if (params.mode === 'training' && trainingEntryMode) {
    tasks = shapeTrainingTasks(tasks, trainingEntryMode, params.focusTaskType)
  }
  const xpMeta: ExamXpMeta = {
    scope: params.scope,
    runMode: params.mode,
    trainingSupport: params.trainingSupport,
    timedTraining: params.timedTraining,
    weaknessRepair: params.weaknessRepair,
    readinessLift: false,
    trainingEntryMode,
    focusTaskType: params.mode === 'training' ? params.focusTaskType : undefined,
  }
  return {
    id,
    userId: params.userId,
    profileId: params.profileId,
    level: params.level,
    mode: params.mode,
    scope: params.scope,
    sectionId: params.sectionId,
    trainingSupport: params.trainingSupport,
    status: 'in_progress',
    tasks,
    attempts: [],
    xpMeta,
    createdAt: now,
    updatedAt: now,
    startedAt: now,
  }
}

export function appendTaskAttempt(
  session: ExamSessionRecord,
  input: {
    taskId: string
    answerText: string
    retriesUsed: number
    prepUsedSeconds?: number
    answerUsedSeconds?: number
    /** Training: keep prior attempts for the same task (retry ladder). */
    appendAsRetry?: boolean
    /** A2 speaking: Azure pronunciation snapshot for the submitted clip. */
    voice?: ExamVoiceAssessmentSnapshot | null
  },
): ExamSessionRecord | null {
  const profile = getExamProfile(session.profileId)
  if (!profile) return null
  const task = session.tasks.find((t) => t.id === input.taskId)
  if (!task) return null
  const taskForScore =
    task.taskType === 'writing_task_exam' ? examTaskWithFormFillRubricIfNeeded(task, input.answerText) : task
  const { scores, composite } = scoreTaskAttempt({
    task: taskForScore,
    answerText: input.answerText,
    blueprint: profile.scoring,
    level: session.level,
    mode: session.mode,
    retriesUsed: input.retriesUsed,
    voice: input.voice ?? null,
  })
  const attempt: ExamTaskAttempt = {
    taskId: task.id,
    taskType: task.taskType,
    sectionId: task.sectionId,
    answerText: input.answerText,
    submittedAt: isoNow(),
    prepUsedSeconds: input.prepUsedSeconds,
    answerUsedSeconds: input.answerUsedSeconds,
    retriesUsed: input.retriesUsed,
    scores,
    composite,
    mode: session.mode,
    ...(input.voice ? { voice: input.voice } : {}),
  }
  const appendRetry = session.mode === 'training' && input.appendAsRetry
  const attempts = appendRetry
    ? [...session.attempts, attempt]
    : [...session.attempts.filter((a) => a.taskId !== task.id), attempt]
  return {
    ...session,
    attempts,
    updatedAt: isoNow(),
  }
}

/** Align writing tasks with latest answers (form-fill rubric overlay when applicable). */
export function upgradeExamWritingTasksFromAttempts(session: ExamSessionRecord): ExamSessionRecord {
  const latestAnswerByTask = new Map<string, string>()
  for (const a of session.attempts) {
    latestAnswerByTask.set(a.taskId, a.answerText)
  }
  const upgradedTasks = session.tasks.map((t) =>
    t.taskType === 'writing_task_exam'
      ? examTaskWithFormFillRubricIfNeeded(t, latestAnswerByTask.get(t.id))
      : t,
  )
  return { ...session, tasks: upgradedTasks }
}

/**
 * Re-run heuristic scoring on every stored attempt; strips prior LLM answer evaluations.
 * Does not attach a report — use `reprocessCompletedExamReport` or blend + `buildSimulationReport`.
 */
export function rescoreExamSessionAttempts(session: ExamSessionRecord): {
  next: ExamSessionRecord
  profile: ExamProfile
} | null {
  if (session.status !== 'completed') return null
  const profile = getExamProfile(session.profileId)
  if (!profile) return null

  const attempts: ExamTaskAttempt[] = session.attempts.map((a) => {
    const task = session.tasks.find((t) => t.id === a.taskId)
    if (!task) return a
    const taskForScore =
      task.taskType === 'writing_task_exam' ? examTaskWithFormFillRubricIfNeeded(task, a.answerText) : task
    const { scores, composite } = scoreTaskAttempt({
      task: taskForScore,
      answerText: a.answerText,
      blueprint: profile.scoring,
      level: session.level,
      mode: session.mode,
      retriesUsed: a.retriesUsed,
      voice: a.voice ?? null,
    })
    return { ...a, scores, composite }
  })

  const {
    llmAnswerEvaluations: _staleLlmEval,
    sampleAnswerWordGlosses: _staleGlosses,
    ...sessionWithoutLlmArtifacts
  } = session
  const withAttempts: ExamSessionRecord = {
    ...sessionWithoutLlmArtifacts,
    attempts,
    updatedAt: isoNow(),
  }
  const next = upgradeExamWritingTasksFromAttempts(withAttempts)
  return { next, profile }
}

/** Re-run heuristic scoring on every stored attempt and rebuild the saved report (simulation or training). */
export function reprocessCompletedExamReport(session: ExamSessionRecord): ExamSessionRecord | null {
  const r = rescoreExamSessionAttempts(session)
  if (!r) return null
  const { next, profile } = r
  const report =
    session.mode === 'simulation'
      ? buildSimulationReport(next, profile)
      : buildTrainingReport(next, profile, session.trainingSupport ?? 'light_guidance')

  return { ...next, report }
}

export function finalizeExamSession(session: ExamSessionRecord): ExamSessionRecord | null {
  const profile = getExamProfile(session.profileId)
  if (!profile) return null
  const now = isoNow()
  if (!session.attempts.length) {
    return { ...session, status: 'abandoned', completedAt: now, updatedAt: now }
  }
  const report =
    session.mode === 'simulation'
      ? buildSimulationReport(session, profile)
      : buildTrainingReport(session, profile, session.trainingSupport ?? 'light_guidance')
  const trainingReadinessLift =
    report.kind === 'training' &&
    (((report as TrainingExamReport).readinessDelta01 ?? 0) > 0.005 ||
      session.trainingSupport === 'almost_exam')
  const xpMeta: ExamXpMeta | undefined = session.xpMeta
    ? {
        ...session.xpMeta,
        readinessLift: Boolean(trainingReadinessLift),
      }
    : undefined
  return {
    ...session,
    status: 'completed',
    report,
    completedAt: now,
    updatedAt: now,
    xpMeta,
  }
}

export function minTasksForXp(session: ExamSessionRecord, profileId: string): number {
  const profile = getExamProfile(profileId)
  if (!profile) return 99
  if (session.mode === 'simulation') {
    return session.scope === 'full' ? profile.ui.minTasksForMeaningfulXp.simulation.full : profile.ui.minTasksForMeaningfulXp.simulation.section
  }
  return profile.ui.minTasksForMeaningfulXp.training
}
