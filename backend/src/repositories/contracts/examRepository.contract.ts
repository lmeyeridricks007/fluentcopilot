import type sql from 'mssql'
import type {
  CreateExamSessionInput,
  CreateExamTaskRunInput,
  ExamHistoryFilter,
  ExamHistoryRow,
  ExamProfile,
  ExamReadinessSnapshot,
  ExamReport,
  ExamSession,
  ExamSessionPatch,
  ExamTaskRun,
  ExamTaskRunPatch,
} from '../../domain/exam/examTypes'

/**
 * Contract for Fluent Exam SQL persistence.
 * Implemented by `examSqlRepository` in `examSqlRepository.ts`.
 */
export type ExamRepository = {
  getExamProfiles(pool: sql.ConnectionPool): Promise<ExamProfile[]>
  getExamProfile(pool: sql.ConnectionPool, profileId: string): Promise<ExamProfile | null>
  createExamSession(pool: sql.ConnectionPool, input: CreateExamSessionInput): Promise<ExamSession>
  getExamSession(pool: sql.ConnectionPool, sessionId: string): Promise<ExamSession | null>
  getExamSessionWithTaskRuns(
    pool: sql.ConnectionPool,
    sessionId: string,
  ): Promise<{ session: ExamSession; taskRuns: ExamTaskRun[] } | null>
  updateExamSession(pool: sql.ConnectionPool, sessionId: string, patch: ExamSessionPatch): Promise<ExamSession | null>
  createExamTaskRuns(pool: sql.ConnectionPool, runs: CreateExamTaskRunInput[]): Promise<ExamTaskRun[]>
  updateExamTaskRun(pool: sql.ConnectionPool, taskRunId: string, patch: ExamTaskRunPatch): Promise<ExamTaskRun | null>
  saveExamReport(pool: sql.ConnectionPool, report: Omit<ExamReport, 'id' | 'createdAt'> & { id?: string }): Promise<ExamReport>
  getExamReport(pool: sql.ConnectionPool, sessionId: string): Promise<ExamReport | null>
  getExamHistory(pool: sql.ConnectionPool, filter: ExamHistoryFilter): Promise<ExamHistoryRow[]>
  saveReadinessSnapshot(
    pool: sql.ConnectionPool,
    input: Omit<ExamReadinessSnapshot, 'id' | 'generatedAt'> & { id?: string },
  ): Promise<ExamReadinessSnapshot>
  getLatestReadinessSnapshot(
    pool: sql.ConnectionPool,
    userId: string,
    profileId: string,
    level: ExamProfile['level'],
  ): Promise<ExamReadinessSnapshot | null>
}
