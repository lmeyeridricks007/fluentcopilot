/**
 * Exam session lifecycle helpers (domain hooks orchestrate React state).
 */
import type { ExamSession, ExamSessionStatus, ExamTaskSlot, ExamTypeId } from '@/lib/exam-session/examSessionState'

export function createExamSessionShell(input: {
  id: string
  examType: ExamTypeId
  totalTimeLimitSec: number
  tasks: ExamTaskSlot[]
}): ExamSession {
  return {
    id: input.id,
    examType: input.examType,
    mode: 'simulation',
    totalTimeLimitSec: input.totalTimeLimitSec,
    startedAtMs: null,
    endedAtMs: null,
    currentTaskIndex: 0,
    tasks: input.tasks,
    status: 'not_started',
  }
}

export function markSessionStarted(session: ExamSession, startedAtMs: number): ExamSession {
  return { ...session, startedAtMs, status: 'in_progress' as ExamSessionStatus }
}

export function markSessionCompleted(session: ExamSession, endedAtMs: number): ExamSession {
  return { ...session, endedAtMs, status: 'completed' as ExamSessionStatus }
}
