import type sql from 'mssql'
import { newId } from '../shared/ids'
import { examDateToIso, examDateToIsoOrNull, parseExamJson } from '../domain/exam/examJson'
import type { ExamRepository } from './contracts/examRepository.contract'
import type {
  CreateExamSessionInput,
  CreateExamTaskRunInput,
  ExamHistoryFilter,
  ExamHistoryRow,
  ExamLevel,
  ExamMode,
  ExamProfile,
  ExamReadinessSnapshot,
  ExamReport,
  ExamSession,
  ExamSessionMeta,
  ExamSessionPatch,
  ExamSessionScope,
  ExamSessionStatus,
  ExamSimulationBlueprint,
  ExamSupportMode,
  ExamTaskRun,
  ExamTaskRunPatch,
  ExamTaskRunPromptMeta,
  ExamTaskType,
  ExamTrainingBlueprint,
} from '../domain/exam/examTypes'

const parseJson = parseExamJson
const toIso = examDateToIso
const toIsoOrNull = examDateToIsoOrNull

export type ExamProfileRow = {
  Id: string
  ExamCode: string
  Level: string
  Title: string
  Description: string | null
  SimulationBlueprintJson: string
  TrainingBlueprintJson: string
  ScoringBlueprintJson: string
  UiConfigJson: string
  PassThresholdsJson: string
  ReadinessConfigJson: string
  SchemaVersion: number
  CreatedAt: Date
  UpdatedAt: Date
}

function rowToExamProfile(r: ExamProfileRow): ExamProfile {
  return {
    id: r.Id,
    examCode: r.ExamCode,
    level: r.Level as ExamLevel,
    title: r.Title,
    description: r.Description,
    simulationBlueprint: parseJson<ExamSimulationBlueprint>(r.SimulationBlueprintJson, { schemaVersion: 1, sections: [] }),
    trainingBlueprint: parseJson<ExamTrainingBlueprint>(r.TrainingBlueprintJson, { schemaVersion: 1, sections: [] }),
    scoringBlueprint: parseJson(r.ScoringBlueprintJson, {
      schemaVersion: 1,
      coreWeights: {},
      strictnessSimulation: 1,
      leniencyTraining: 1,
      overlaysByTask: {},
    }),
    uiConfig: parseJson(r.UiConfigJson, { schemaVersion: 1 }),
    passThresholds: parseJson(r.PassThresholdsJson, { readyAbove: 0.7, borderlineAbove: 0.55 }),
    readinessConfig: parseJson(r.ReadinessConfigJson, { windowDays: 30 }),
    schemaVersion: r.SchemaVersion,
    createdAt: toIso(r.CreatedAt),
    updatedAt: toIso(r.UpdatedAt),
  }
}

export type ExamSessionRow = {
  Id: string
  UserId: string
  ProfileId: string
  Level: string
  Mode: string
  SupportMode: string | null
  SectionId: string | null
  Scope: string
  Status: string
  StartedAt: Date
  CompletedAt: Date | null
  TotalXP: number | null
  ReadinessEstimate: number | null
  Confidence: string | null
  MetaJson: string
  CreatedAt: Date
  UpdatedAt: Date
}

function rowToExamSession(r: ExamSessionRow): ExamSession {
  return {
    id: r.Id,
    userId: r.UserId,
    profileId: r.ProfileId,
    level: r.Level as ExamLevel,
    mode: r.Mode as ExamMode,
    supportMode: (r.SupportMode as ExamSupportMode | null) ?? null,
    sectionId: r.SectionId,
    scope: (r.Scope as ExamSessionScope) || 'full',
    status: r.Status as ExamSessionStatus,
    startedAt: toIso(r.StartedAt),
    completedAt: toIsoOrNull(r.CompletedAt),
    totalXP: r.TotalXP,
    readinessEstimate: r.ReadinessEstimate,
    confidence: r.Confidence,
    meta: parseJson<ExamSessionMeta>(r.MetaJson, {}),
    createdAt: toIso(r.CreatedAt),
    updatedAt: toIso(r.UpdatedAt),
  }
}

export type ExamTaskRunRow = {
  Id: string
  SessionId: string
  TaskBlueprintId: string
  TaskType: string
  SortOrder: number
  Prompt: string
  PromptMetaJson: string
  PrepStartedAt: Date | null
  AnswerStartedAt: Date | null
  AnswerEndedAt: Date | null
  AudioUrl: string | null
  TextAnswer: string | null
  ScoreBreakdownJson: string | null
  FeedbackSummary: string | null
  CreatedAt: Date
  UpdatedAt: Date
}

function rowToExamTaskRun(r: ExamTaskRunRow): ExamTaskRun {
  return {
    id: r.Id,
    sessionId: r.SessionId,
    taskBlueprintId: r.TaskBlueprintId,
    taskType: r.TaskType as ExamTaskType,
    sortOrder: r.SortOrder,
    prompt: r.Prompt,
    promptMeta: parseJson<ExamTaskRunPromptMeta>(r.PromptMetaJson, {}),
    prepStartedAt: toIsoOrNull(r.PrepStartedAt),
    answerStartedAt: toIsoOrNull(r.AnswerStartedAt),
    answerEndedAt: toIsoOrNull(r.AnswerEndedAt),
    audioUrl: r.AudioUrl,
    textAnswer: r.TextAnswer,
    scoreBreakdown: r.ScoreBreakdownJson ? parseJson<Record<string, number>>(r.ScoreBreakdownJson, {}) : null,
    feedbackSummary: r.FeedbackSummary,
    createdAt: toIso(r.CreatedAt),
    updatedAt: toIso(r.UpdatedAt),
  }
}

export type ExamReportRow = {
  Id: string
  SessionId: string
  Mode: string
  Level: string
  OverallOutcome: string
  ReadinessState: string
  Confidence: string
  SectionBreakdownJson: string
  TaskTypeBreakdownJson: string
  BlockersJson: string
  RecommendationsJson: string
  XpAwarded: number
  CreatedAt: Date
}

function rowToExamReport(r: ExamReportRow): ExamReport {
  return {
    id: r.Id,
    sessionId: r.SessionId,
    mode: r.Mode as ExamMode,
    level: r.Level as ExamLevel,
    overallOutcome: r.OverallOutcome,
    readinessState: r.ReadinessState,
    confidence: r.Confidence,
    sectionBreakdown: parseJson(r.SectionBreakdownJson, []),
    taskTypeBreakdown: parseJson(r.TaskTypeBreakdownJson, []),
    blockers: parseJson(r.BlockersJson, []),
    recommendations: parseJson(r.RecommendationsJson, []),
    xpAwarded: r.XpAwarded,
    createdAt: toIso(r.CreatedAt),
  }
}

export type ExamReadinessRow = {
  Id: string
  UserId: string
  ProfileId: string
  Level: string
  ReadinessState: string
  Confidence: string
  BlockersJson: string
  StrengthsJson: string
  GeneratedAt: Date
}

function rowToReadiness(r: ExamReadinessRow): ExamReadinessSnapshot {
  return {
    id: r.Id,
    userId: r.UserId,
    profileId: r.ProfileId,
    level: r.Level as ExamLevel,
    readinessState: r.ReadinessState,
    confidence: r.Confidence,
    blockers: parseJson(r.BlockersJson, []),
    strengths: parseJson(r.StrengthsJson, []),
    generatedAt: toIso(r.GeneratedAt),
  }
}

export async function getExamProfiles(pool: sql.ConnectionPool): Promise<ExamProfile[]> {
  const r = await pool.request().query<ExamProfileRow>(`
    SELECT *
    FROM dbo.ExamProfiles
    ORDER BY ExamCode ASC, Level ASC
  `)
  return r.recordset.map(rowToExamProfile)
}

export async function getExamProfile(pool: sql.ConnectionPool, profileId: string): Promise<ExamProfile | null> {
  const r = await pool
    .request()
    .input('id', profileId)
    .query<ExamProfileRow>(`
      SELECT TOP (1) *
      FROM dbo.ExamProfiles
      WHERE Id = @id
    `)
  const row = r.recordset[0]
  return row ? rowToExamProfile(row) : null
}

export async function createExamSession(pool: sql.ConnectionPool, input: CreateExamSessionInput): Promise<ExamSession> {
  const id = newId()
  const now = new Date()
  const startedAt = input.startedAt ? new Date(input.startedAt) : now
  const status = input.status ?? 'draft'
  const scope = input.scope ?? 'full'
  const metaJson = JSON.stringify(input.meta ?? {})
  await pool
    .request()
    .input('id', id)
    .input('userId', input.userId)
    .input('profileId', input.profileId)
    .input('level', input.level)
    .input('mode', input.mode)
    .input('supportMode', input.supportMode ?? null)
    .input('sectionId', input.sectionId ?? null)
    .input('scope', scope)
    .input('status', status)
    .input('startedAt', startedAt)
    .input('metaJson', metaJson)
    .query(`
      INSERT INTO dbo.ExamSessions (
        Id, UserId, ProfileId, Level, Mode, SupportMode, SectionId, Scope, Status,
        StartedAt, CompletedAt, TotalXP, ReadinessEstimate, Confidence, MetaJson, CreatedAt, UpdatedAt
      )
      VALUES (
        @id, @userId, @profileId, @level, @mode, @supportMode, @sectionId, @scope, @status,
        @startedAt, NULL, NULL, NULL, NULL, @metaJson, SYSUTCDATETIME(), SYSUTCDATETIME()
      )
    `)
  const created = await getExamSession(pool, id)
  if (!created) throw new Error('createExamSession: failed to read row')
  return created
}

export async function getExamSession(pool: sql.ConnectionPool, sessionId: string): Promise<ExamSession | null> {
  const r = await pool
    .request()
    .input('id', sessionId)
    .query<ExamSessionRow>(`
      SELECT TOP (1) *
      FROM dbo.ExamSessions
      WHERE Id = @id
    `)
  const row = r.recordset[0]
  return row ? rowToExamSession(row) : null
}

export async function getExamSessionWithTaskRuns(
  pool: sql.ConnectionPool,
  sessionId: string,
): Promise<{ session: ExamSession; taskRuns: ExamTaskRun[] } | null> {
  const session = await getExamSession(pool, sessionId)
  if (!session) return null
  const tr = await pool
    .request()
    .input('sessionId', sessionId)
    .query<ExamTaskRunRow>(`
      SELECT *
      FROM dbo.ExamTaskRuns
      WHERE SessionId = @sessionId
      ORDER BY SortOrder ASC, CreatedAt ASC
    `)
  return { session, taskRuns: tr.recordset.map(rowToExamTaskRun) }
}

export async function updateExamSession(
  pool: sql.ConnectionPool,
  sessionId: string,
  patch: ExamSessionPatch,
): Promise<ExamSession | null> {
  const sets: string[] = ['UpdatedAt = SYSUTCDATETIME()']
  const req = pool.request().input('id', sessionId)
  if (patch.status !== undefined) {
    sets.push('Status = @status')
    req.input('status', patch.status)
  }
  if (patch.completedAt !== undefined) {
    sets.push('CompletedAt = @completedAt')
    req.input('completedAt', patch.completedAt ? new Date(patch.completedAt) : null)
  }
  if (patch.totalXP !== undefined) {
    sets.push('TotalXP = @totalXP')
    req.input('totalXP', patch.totalXP)
  }
  if (patch.readinessEstimate !== undefined) {
    sets.push('ReadinessEstimate = @readinessEstimate')
    req.input('readinessEstimate', patch.readinessEstimate)
  }
  if (patch.confidence !== undefined) {
    sets.push('Confidence = @confidence')
    req.input('confidence', patch.confidence)
  }
  if (patch.meta !== undefined) {
    sets.push('MetaJson = @metaJson')
    req.input('metaJson', JSON.stringify(patch.meta ?? {}))
  }
  if (patch.supportMode !== undefined) {
    sets.push('SupportMode = @supportMode')
    req.input('supportMode', patch.supportMode)
  }
  if (patch.sectionId !== undefined) {
    sets.push('SectionId = @sectionId')
    req.input('sectionId', patch.sectionId)
  }
  if (patch.scope !== undefined) {
    sets.push('Scope = @scope')
    req.input('scope', patch.scope)
  }
  if (sets.length === 1) {
    return getExamSession(pool, sessionId)
  }
  await req.query(`
    UPDATE dbo.ExamSessions
    SET ${sets.join(', ')}
    WHERE Id = @id
  `)
  return getExamSession(pool, sessionId)
}

export async function createExamTaskRuns(
  pool: sql.ConnectionPool,
  runs: CreateExamTaskRunInput[],
): Promise<ExamTaskRun[]> {
  const out: ExamTaskRun[] = []
  for (const run of runs) {
    const id = newId()
    const promptMetaJson = JSON.stringify(run.promptMeta ?? {})
    await pool
      .request()
      .input('id', id)
      .input('sessionId', run.sessionId)
      .input('taskBlueprintId', run.taskBlueprintId)
      .input('taskType', run.taskType)
      .input('sortOrder', run.sortOrder)
      .input('prompt', run.prompt)
      .input('promptMetaJson', promptMetaJson)
      .query(`
        INSERT INTO dbo.ExamTaskRuns (
          Id, SessionId, TaskBlueprintId, TaskType, SortOrder, Prompt, PromptMetaJson,
          PrepStartedAt, AnswerStartedAt, AnswerEndedAt, AudioUrl, TextAnswer,
          ScoreBreakdownJson, FeedbackSummary, CreatedAt, UpdatedAt
        )
        VALUES (
          @id, @sessionId, @taskBlueprintId, @taskType, @sortOrder, @prompt, @promptMetaJson,
          NULL, NULL, NULL, NULL, NULL, NULL, NULL, SYSUTCDATETIME(), SYSUTCDATETIME()
        )
      `)
    const row = await pool
      .request()
      .input('id', id)
      .query<ExamTaskRunRow>(`SELECT TOP (1) * FROM dbo.ExamTaskRuns WHERE Id = @id`)
    const created = row.recordset[0]
    if (created) out.push(rowToExamTaskRun(created))
  }
  return out
}

export async function updateExamTaskRun(
  pool: sql.ConnectionPool,
  taskRunId: string,
  patch: ExamTaskRunPatch,
): Promise<ExamTaskRun | null> {
  const sets: string[] = ['UpdatedAt = SYSUTCDATETIME()']
  const req = pool.request().input('id', taskRunId)
  if (patch.prepStartedAt !== undefined) {
    sets.push('PrepStartedAt = @prepStartedAt')
    req.input('prepStartedAt', patch.prepStartedAt ? new Date(patch.prepStartedAt) : null)
  }
  if (patch.answerStartedAt !== undefined) {
    sets.push('AnswerStartedAt = @answerStartedAt')
    req.input('answerStartedAt', patch.answerStartedAt ? new Date(patch.answerStartedAt) : null)
  }
  if (patch.answerEndedAt !== undefined) {
    sets.push('AnswerEndedAt = @answerEndedAt')
    req.input('answerEndedAt', patch.answerEndedAt ? new Date(patch.answerEndedAt) : null)
  }
  if (patch.audioUrl !== undefined) {
    sets.push('AudioUrl = @audioUrl')
    req.input('audioUrl', patch.audioUrl)
  }
  if (patch.textAnswer !== undefined) {
    sets.push('TextAnswer = @textAnswer')
    req.input('textAnswer', patch.textAnswer)
  }
  if (patch.scoreBreakdown !== undefined) {
    sets.push('ScoreBreakdownJson = @scoreBreakdownJson')
    req.input('scoreBreakdownJson', patch.scoreBreakdown == null ? null : JSON.stringify(patch.scoreBreakdown))
  }
  if (patch.feedbackSummary !== undefined) {
    sets.push('FeedbackSummary = @feedbackSummary')
    req.input('feedbackSummary', patch.feedbackSummary)
  }
  if (patch.prompt !== undefined) {
    sets.push('Prompt = @prompt')
    req.input('prompt', patch.prompt)
  }
  if (patch.promptMeta !== undefined) {
    sets.push('PromptMetaJson = @promptMetaJson')
    req.input('promptMetaJson', JSON.stringify(patch.promptMeta ?? {}))
  }
  if (sets.length === 1) {
    const r = await pool.request().input('id', taskRunId).query<ExamTaskRunRow>(`SELECT TOP (1) * FROM dbo.ExamTaskRuns WHERE Id = @id`)
    return r.recordset[0] ? rowToExamTaskRun(r.recordset[0]) : null
  }
  await req.query(`
    UPDATE dbo.ExamTaskRuns
    SET ${sets.join(', ')}
    WHERE Id = @id
  `)
  const r2 = await pool.request().input('id', taskRunId).query<ExamTaskRunRow>(`SELECT TOP (1) * FROM dbo.ExamTaskRuns WHERE Id = @id`)
  return r2.recordset[0] ? rowToExamTaskRun(r2.recordset[0]) : null
}

export async function saveExamReport(
  pool: sql.ConnectionPool,
  report: Omit<ExamReport, 'id' | 'createdAt'> & { id?: string },
): Promise<ExamReport> {
  const existing = await pool
    .request()
    .input('sessionId', report.sessionId)
    .query<{ Id: string }>(`SELECT TOP (1) Id FROM dbo.ExamReports WHERE SessionId = @sessionId`)
  const id = existing.recordset[0]?.Id ?? report.id ?? newId()
  const sectionJson = JSON.stringify(report.sectionBreakdown ?? [])
  const taskTypeJson = JSON.stringify(report.taskTypeBreakdown ?? [])
  const blockersJson = JSON.stringify(report.blockers ?? [])
  const recJson = JSON.stringify(report.recommendations ?? [])
  if (existing.recordset[0]?.Id) {
    await pool
      .request()
      .input('id', id)
      .input('mode', report.mode)
      .input('level', report.level)
      .input('overallOutcome', report.overallOutcome)
      .input('readinessState', report.readinessState)
      .input('confidence', report.confidence)
      .input('sectionJson', sectionJson)
      .input('taskTypeJson', taskTypeJson)
      .input('blockersJson', blockersJson)
      .input('recJson', recJson)
      .input('xpAwarded', report.xpAwarded)
      .query(`
        UPDATE dbo.ExamReports
        SET Mode = @mode, Level = @level, OverallOutcome = @overallOutcome,
            ReadinessState = @readinessState, Confidence = @confidence,
            SectionBreakdownJson = @sectionJson, TaskTypeBreakdownJson = @taskTypeJson,
            BlockersJson = @blockersJson, RecommendationsJson = @recJson, XpAwarded = @xpAwarded
        WHERE Id = @id
      `)
  } else {
    await pool
      .request()
      .input('id', id)
      .input('sessionId', report.sessionId)
      .input('mode', report.mode)
      .input('level', report.level)
      .input('overallOutcome', report.overallOutcome)
      .input('readinessState', report.readinessState)
      .input('confidence', report.confidence)
      .input('sectionJson', sectionJson)
      .input('taskTypeJson', taskTypeJson)
      .input('blockersJson', blockersJson)
      .input('recJson', recJson)
      .input('xpAwarded', report.xpAwarded)
      .query(`
        INSERT INTO dbo.ExamReports (
          Id, SessionId, Mode, Level, OverallOutcome, ReadinessState, Confidence,
          SectionBreakdownJson, TaskTypeBreakdownJson, BlockersJson, RecommendationsJson, XpAwarded, CreatedAt
        )
        VALUES (
          @id, @sessionId, @mode, @level, @overallOutcome, @readinessState, @confidence,
          @sectionJson, @taskTypeJson, @blockersJson, @recJson, @xpAwarded, SYSUTCDATETIME()
        )
      `)
  }
  const saved = await getExamReport(pool, report.sessionId)
  if (!saved) throw new Error('saveExamReport: failed to read row')
  return saved
}

export async function getExamReport(pool: sql.ConnectionPool, sessionId: string): Promise<ExamReport | null> {
  const r = await pool
    .request()
    .input('sessionId', sessionId)
    .query<ExamReportRow>(`
      SELECT TOP (1) *
      FROM dbo.ExamReports
      WHERE SessionId = @sessionId
    `)
  return r.recordset[0] ? rowToExamReport(r.recordset[0]) : null
}

export async function getExamHistory(pool: sql.ConnectionPool, filter: ExamHistoryFilter): Promise<ExamHistoryRow[]> {
  const maxRows = Math.min(200, Math.max(1, filter.maxRows ?? 80))
  const req = pool.request().input('userId', filter.userId).input('maxRows', maxRows)
  const where: string[] = ['s.UserId = @userId']
  if (filter.profileId?.trim()) {
    where.push('s.ProfileId = @profileId')
    req.input('profileId', filter.profileId.trim())
  }
  if (filter.mode) {
    where.push('s.Mode = @mode')
    req.input('mode', filter.mode)
  }
  if (filter.level) {
    where.push('s.Level = @level')
    req.input('level', filter.level)
  }
  if (filter.status) {
    where.push('s.Status = @status')
    req.input('status', filter.status)
  }
  type HistorySqlRow = ExamSessionRow & { ReportXp: number | null; HasReport: number }
  const r = await req.query<HistorySqlRow>(`
    SELECT
      s.*,
      r.XpAwarded AS ReportXp,
      CASE WHEN r.Id IS NULL THEN 0 ELSE 1 END AS HasReport
    FROM dbo.ExamSessions s
    LEFT JOIN dbo.ExamReports r ON r.SessionId = s.Id
    WHERE ${where.join(' AND ')}
    ORDER BY s.UpdatedAt DESC
    OFFSET 0 ROWS FETCH NEXT @maxRows ROWS ONLY
  `)
  return r.recordset.map((row) => {
    const { ReportXp, HasReport, ...sessionRow } = row
    return {
      ...rowToExamSession(sessionRow),
      reportXpAwarded: ReportXp,
      hasReport: Boolean(HasReport),
    }
  })
}

export async function saveReadinessSnapshot(
  pool: sql.ConnectionPool,
  input: Omit<ExamReadinessSnapshot, 'id' | 'generatedAt'> & { id?: string },
): Promise<ExamReadinessSnapshot> {
  const id = input.id ?? newId()
  await pool
    .request()
    .input('id', id)
    .input('userId', input.userId)
    .input('profileId', input.profileId)
    .input('level', input.level)
    .input('readinessState', input.readinessState)
    .input('confidence', input.confidence)
    .input('blockersJson', JSON.stringify(input.blockers ?? []))
    .input('strengthsJson', JSON.stringify(input.strengths ?? []))
    .query(`
      INSERT INTO dbo.ExamReadinessSnapshots (
        Id, UserId, ProfileId, Level, ReadinessState, Confidence, BlockersJson, StrengthsJson, GeneratedAt
      )
      VALUES (
        @id, @userId, @profileId, @level, @readinessState, @confidence, @blockersJson, @strengthsJson, SYSUTCDATETIME()
      )
    `)
  const r = await pool
    .request()
    .input('id', id)
    .query<ExamReadinessRow>(`SELECT TOP (1) * FROM dbo.ExamReadinessSnapshots WHERE Id = @id`)
  const row = r.recordset[0]
  if (!row) throw new Error('saveReadinessSnapshot: failed to read row')
  return rowToReadiness(row)
}

export async function getLatestReadinessSnapshot(
  pool: sql.ConnectionPool,
  userId: string,
  profileId: string,
  level: ExamLevel,
): Promise<ExamReadinessSnapshot | null> {
  const r = await pool
    .request()
    .input('userId', userId)
    .input('profileId', profileId)
    .input('level', level)
    .query<ExamReadinessRow>(`
      SELECT TOP (1) *
      FROM dbo.ExamReadinessSnapshots
      WHERE UserId = @userId AND ProfileId = @profileId AND Level = @level
      ORDER BY GeneratedAt DESC
    `)
  return r.recordset[0] ? rowToReadiness(r.recordset[0]) : null
}

/** Bundle implementing {@link ExamRepository} for DI / imports. */
export const examSqlRepository: ExamRepository = {
  getExamProfiles,
  getExamProfile,
  createExamSession,
  getExamSession,
  getExamSessionWithTaskRuns,
  updateExamSession,
  createExamTaskRuns,
  updateExamTaskRun,
  saveExamReport,
  getExamReport,
  getExamHistory,
  saveReadinessSnapshot,
  getLatestReadinessSnapshot,
}
