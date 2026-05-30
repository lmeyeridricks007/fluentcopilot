import { PRACTICE_EXAM_CONTENT_VERSION } from '@/lib/exam-prep/practice-exams/types'
import type { ListeningReplayState } from '@/lib/exam-prep/listening/listeningReplayPolicy'
import type { SpeakingSimulationSessionPlan } from '@/lib/exam-prep/speaking/speakingSimulationSessionBuilder'
import type { SpeakingSimulationQuestionBundle } from '@/lib/exam-prep/speaking/types'
import type { SpeakingExamDraftSnapshot } from '@/lib/exam-prep/speaking/speakingSimulationFlush'
import type { WritingSimulationSessionPlan } from '@/lib/exam-prep/writing/writingSimulationSessionBuilder'
import type { WritingSimulationTaskBundle } from '@/lib/exam-prep/writing/types'
import type { WritingExamDraftSnapshot } from '@/lib/exam-prep/writing/writingSimulationFlush'
import type { ReadingEvaluationResult } from '@/lib/exam-prep/reading/types'

export type WritingTrainingTextDraftBodyV1 = {
  v: 1
  taskId: string
  bodyText: string
  fieldValues: Record<string, string>
}

export function parseWritingTrainingTextDraft(raw: unknown): WritingTrainingTextDraftBodyV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.v !== 1 || typeof o.taskId !== 'string') return null
  if (typeof o.bodyText !== 'string') return null
  if (o.fieldValues != null && typeof o.fieldValues !== 'object') return null
  return {
    v: 1,
    taskId: o.taskId,
    bodyText: o.bodyText,
    fieldValues: (o.fieldValues as Record<string, string>) ?? {},
  }
}

export type WritingSimulationAutosaveBodyV1 = {
  v: 1
  scope: 'free' | { practiceExamSetId: string }
  practiceContentVersion?: number
  plan: WritingSimulationSessionPlan
  taskIndex: number
  completedBundles: WritingSimulationTaskBundle[]
  currentDraft: WritingExamDraftSnapshot
  globalDeadlineMs: number | null
  taskStartedAtIso: string | null
}

export function parseWritingSimulationAutosave(raw: unknown): WritingSimulationAutosaveBodyV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.v !== 1) return null
  if (!o.plan || typeof o.plan !== 'object') return null
  const plan = o.plan as WritingSimulationSessionPlan
  if (typeof plan.sessionId !== 'string' || !Array.isArray(plan.tasks)) return null
  const ti = o.taskIndex
  if (typeof ti !== 'number' || ti < 0 || ti >= plan.taskCount) return null
  if (!Array.isArray(o.completedBundles)) return null
  const draft = o.currentDraft
  if (!draft || typeof draft !== 'object') return null
  let scope: WritingSimulationAutosaveBodyV1['scope'] = 'free'
  if (o.scope === 'free') scope = 'free'
  else if (o.scope && typeof o.scope === 'object' && typeof (o.scope as { practiceExamSetId?: string }).practiceExamSetId === 'string') {
    scope = { practiceExamSetId: (o.scope as { practiceExamSetId: string }).practiceExamSetId }
  }
  return {
    v: 1,
    scope,
    practiceContentVersion: typeof o.practiceContentVersion === 'number' ? o.practiceContentVersion : undefined,
    plan,
    taskIndex: ti,
    completedBundles: o.completedBundles as WritingSimulationTaskBundle[],
    currentDraft: draft as WritingExamDraftSnapshot,
    globalDeadlineMs: o.globalDeadlineMs == null ? null : Number(o.globalDeadlineMs),
    taskStartedAtIso: typeof o.taskStartedAtIso === 'string' ? o.taskStartedAtIso : null,
  }
}

export function canResumeWritingSimulation(
  snap: WritingSimulationAutosaveBodyV1,
  opts: { practiceExamSetId?: string | null }
): boolean {
  if (snap.taskIndex >= snap.plan.taskCount) return false
  if (!snap.plan.tasks[snap.taskIndex]) return false
  if (snap.globalDeadlineMs != null && Date.now() >= snap.globalDeadlineMs) return false
  if (opts.practiceExamSetId) {
    if (snap.scope === 'free') return false
    if (typeof snap.scope !== 'object' || snap.scope.practiceExamSetId !== opts.practiceExamSetId) return false
    if (snap.practiceContentVersion != null && snap.practiceContentVersion !== PRACTICE_EXAM_CONTENT_VERSION) return false
  } else if (snap.scope !== 'free') {
    return false
  }
  return true
}

export type SpeakingSimulationAutosaveBodyV1 = {
  v: 1
  scope: 'free' | { practiceExamSetId: string }
  practiceContentVersion?: number
  plan: SpeakingSimulationSessionPlan
  questionIndex: number
  completedBundles: SpeakingSimulationQuestionBundle[]
  currentDraft: SpeakingExamDraftSnapshot
  sessionDeadlineMs: number | null
  questionStartedAtIso: string | null
}

export function parseSpeakingSimulationAutosave(raw: unknown): SpeakingSimulationAutosaveBodyV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.v !== 1 || !o.plan || typeof o.plan !== 'object') return null
  const plan = o.plan as SpeakingSimulationSessionPlan
  if (typeof plan.sessionId !== 'string' || !Array.isArray(plan.questions)) return null
  const qi = o.questionIndex
  if (typeof qi !== 'number' || qi < 0 || qi >= plan.questionCount) return null
  if (!Array.isArray(o.completedBundles)) return null
  const draft = o.currentDraft
  if (!draft || typeof draft !== 'object') return null
  let scope: SpeakingSimulationAutosaveBodyV1['scope'] = 'free'
  if (o.scope === 'free') scope = 'free'
  else if (o.scope && typeof o.scope === 'object' && typeof (o.scope as { practiceExamSetId?: string }).practiceExamSetId === 'string') {
    scope = { practiceExamSetId: (o.scope as { practiceExamSetId: string }).practiceExamSetId }
  }
  return {
    v: 1,
    scope,
    practiceContentVersion: typeof o.practiceContentVersion === 'number' ? o.practiceContentVersion : undefined,
    plan,
    questionIndex: qi,
    completedBundles: o.completedBundles as SpeakingSimulationQuestionBundle[],
    currentDraft: draft as SpeakingExamDraftSnapshot,
    sessionDeadlineMs: o.sessionDeadlineMs == null ? null : Number(o.sessionDeadlineMs),
    questionStartedAtIso: typeof o.questionStartedAtIso === 'string' ? o.questionStartedAtIso : null,
  }
}

export function canResumeSpeakingSimulation(
  snap: SpeakingSimulationAutosaveBodyV1,
  opts: { practiceExamSetId?: string | null }
): boolean {
  if (snap.questionIndex >= snap.plan.questionCount) return false
  if (!snap.plan.questions[snap.questionIndex]) return false
  if (snap.sessionDeadlineMs != null && Date.now() >= snap.sessionDeadlineMs) return false
  if (opts.practiceExamSetId) {
    if (snap.scope === 'free') return false
    if (typeof snap.scope !== 'object' || snap.scope.practiceExamSetId !== opts.practiceExamSetId) return false
    if (snap.practiceContentVersion != null && snap.practiceContentVersion !== PRACTICE_EXAM_CONTENT_VERSION) return false
  } else if (snap.scope !== 'free') {
    return false
  }
  return true
}

export type ListeningPracticeExamAutosaveBodyV1 = {
  v: 1
  setId: string
  contentVersion: number
  taskIds: string[]
  taskIndex: number
  replayState: ListeningReplayState
  hasCompletedListen: boolean
  correctCount: number
  sessionStartedAtIso: string | null
  /** Wall-clock deadline for DUO timed exams; null if untimed. */
  sessionDeadlineMs: number | null
}

export function parseListeningPracticeExamAutosave(raw: unknown): ListeningPracticeExamAutosaveBodyV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.v !== 1 || typeof o.setId !== 'string' || typeof o.contentVersion !== 'number') return null
  if (!Array.isArray(o.taskIds) || !o.taskIds.every((x) => typeof x === 'string')) return null
  const ti = o.taskIndex
  if (typeof ti !== 'number' || ti < 0) return null
  if (!o.replayState || typeof o.replayState !== 'object') return null
  if (typeof o.hasCompletedListen !== 'boolean') return null
  if (typeof o.correctCount !== 'number') return null
  return {
    v: 1,
    setId: o.setId,
    contentVersion: o.contentVersion,
    taskIds: o.taskIds,
    taskIndex: ti,
    replayState: o.replayState as ListeningReplayState,
    hasCompletedListen: o.hasCompletedListen,
    correctCount: o.correctCount,
    sessionStartedAtIso: typeof o.sessionStartedAtIso === 'string' ? o.sessionStartedAtIso : null,
    sessionDeadlineMs: o.sessionDeadlineMs == null ? null : Number(o.sessionDeadlineMs),
  }
}

export function listeningPracticeExamSnapshotMatchesPlan(
  snap: ListeningPracticeExamAutosaveBodyV1,
  setId: string,
  taskIds: string[]
): boolean {
  if (snap.setId !== setId) return false
  if (snap.contentVersion !== PRACTICE_EXAM_CONTENT_VERSION) return false
  if (snap.taskIds.length !== taskIds.length) return false
  for (let i = 0; i < taskIds.length; i += 1) {
    if (snap.taskIds[i] !== taskIds[i]) return false
  }
  return true
}

export function canResumeListeningPracticeExam(
  snap: ListeningPracticeExamAutosaveBodyV1,
  setId: string,
  taskIds: string[]
): boolean {
  if (!listeningPracticeExamSnapshotMatchesPlan(snap, setId, taskIds)) return false
  if (snap.taskIndex >= taskIds.length) return false
  if (snap.sessionDeadlineMs != null && Date.now() >= snap.sessionDeadlineMs) return false
  return true
}

export type ReadingPracticeExamAutosaveBodyV1 = {
  v: 1
  setId: string
  contentVersion: number
  taskIds: string[]
  phase: 'task' | 'result' | 'session_complete'
  taskIndex: number
  answerUnlocked: boolean
  duoSelectedOptionId: string | null
  /** Serialized Map as [index, optionId][] */
  duoCommitted: [number, string][]
  correctCount: number
  sessionStartedAtIso: string | null
  evalResult: ReadingEvaluationResult | null
  sessionDeadlineMs: number | null
}

export function parseReadingPracticeExamAutosave(raw: unknown): ReadingPracticeExamAutosaveBodyV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.v !== 1 || typeof o.setId !== 'string' || typeof o.contentVersion !== 'number') return null
  if (!Array.isArray(o.taskIds) || !o.taskIds.every((x) => typeof x === 'string')) return null
  const ti = o.taskIndex
  if (typeof ti !== 'number' || ti < 0) return null
  if (o.phase !== 'task' && o.phase !== 'result' && o.phase !== 'session_complete') return null
  if (typeof o.answerUnlocked !== 'boolean') return null
  if (o.duoSelectedOptionId != null && typeof o.duoSelectedOptionId !== 'string') return null
  if (!Array.isArray(o.duoCommitted)) return null
  if (typeof o.correctCount !== 'number') return null
  return {
    v: 1,
    setId: o.setId,
    contentVersion: o.contentVersion,
    taskIds: o.taskIds,
    phase: o.phase,
    taskIndex: ti,
    answerUnlocked: o.answerUnlocked,
    duoSelectedOptionId: (o.duoSelectedOptionId as string | null) ?? null,
    duoCommitted: o.duoCommitted as [number, string][],
    correctCount: o.correctCount,
    sessionStartedAtIso: typeof o.sessionStartedAtIso === 'string' ? o.sessionStartedAtIso : null,
    evalResult: (o.evalResult as ReadingEvaluationResult | null) ?? null,
    sessionDeadlineMs:
      o.sessionDeadlineMs == null || Number.isNaN(Number(o.sessionDeadlineMs))
        ? null
        : Number(o.sessionDeadlineMs),
  }
}

export function readingPracticeExamSnapshotMatchesPlan(
  snap: ReadingPracticeExamAutosaveBodyV1,
  setId: string,
  taskIds: string[]
): boolean {
  if (snap.setId !== setId) return false
  if (snap.contentVersion !== PRACTICE_EXAM_CONTENT_VERSION) return false
  if (snap.taskIds.length !== taskIds.length) return false
  for (let i = 0; i < taskIds.length; i += 1) {
    if (snap.taskIds[i] !== taskIds[i]) return false
  }
  return true
}

export function canResumeReadingPracticeExam(
  snap: ReadingPracticeExamAutosaveBodyV1,
  setId: string,
  taskIds: string[]
): boolean {
  if (!readingPracticeExamSnapshotMatchesPlan(snap, setId, taskIds)) return false
  if (snap.taskIndex >= taskIds.length) return false
  if (snap.sessionDeadlineMs != null && Date.now() >= snap.sessionDeadlineMs) return false
  if (snap.phase !== 'task') return false
  return true
}

export type FreerPracticeTextDraftBodyV1 = {
  v: 1
  stepKey: string
  tab: 'typed' | 'spoken'
  draft: string
  spokenTranscript: string
}

export function parseFreerPracticeTextDraft(raw: unknown): FreerPracticeTextDraftBodyV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.v !== 1 || typeof o.stepKey !== 'string') return null
  if (o.tab !== 'typed' && o.tab !== 'spoken') return null
  if (typeof o.draft !== 'string' || typeof o.spokenTranscript !== 'string') return null
  return { v: 1, stepKey: o.stepKey, tab: o.tab, draft: o.draft, spokenTranscript: o.spokenTranscript }
}
