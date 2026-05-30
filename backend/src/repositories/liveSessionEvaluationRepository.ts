import sql from 'mssql'
import type { ConnectionPool } from 'mssql'

export type LiveEvaluationStatus = 'pending' | 'running' | 'complete' | 'failed'

export type LiveSessionEvaluationRow = {
  threadId: string
  userId: string
  status: LiveEvaluationStatus
  evaluationJson: string | null
  /** JSON: {@link ../services/speak-live/speakLiveAsyncEvaluationProgress.ts SpeakLiveEvaluationProgressV1} */
  progressJson: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

function mapRow(r: {
  ThreadId: string
  UserId: string
  Status: string
  EvaluationJson: string | null
  ProgressJson?: string | null
  ErrorMessage: string | null
  CreatedAt: Date
  UpdatedAt: Date
}): LiveSessionEvaluationRow {
  return {
    threadId: r.ThreadId,
    userId: r.UserId,
    status: r.Status as LiveEvaluationStatus,
    evaluationJson: r.EvaluationJson,
    progressJson: r.ProgressJson ?? null,
    errorMessage: r.ErrorMessage,
    createdAt: r.CreatedAt.toISOString(),
    updatedAt: r.UpdatedAt.toISOString(),
  }
}

export async function upsertPendingEvaluation(
  pool: ConnectionPool,
  input: { threadId: string; userInternalId: string }
): Promise<LiveSessionEvaluationRow> {
  const existing = await getEvaluationByThreadId(pool, input.threadId)
  if (!existing) {
    await pool
      .request()
      .input('threadId', input.threadId)
      .input('userId', input.userInternalId)
      .query(`
        INSERT INTO dbo.LiveSessionEvaluations (ThreadId, UserId, Status, EvaluationJson, ErrorMessage, CreatedAt, UpdatedAt)
        VALUES (@threadId, @userId, N'pending', NULL, NULL, SYSUTCDATETIME(), SYSUTCDATETIME())
      `)
  } else if (existing.status === 'failed') {
    await pool.request().input('threadId', input.threadId).query(`
      UPDATE dbo.LiveSessionEvaluations
      SET Status = N'pending', ErrorMessage = NULL, EvaluationJson = NULL, ProgressJson = NULL, UpdatedAt = SYSUTCDATETIME()
      WHERE ThreadId = @threadId
    `)
  }
  const r = await pool.request().input('threadId', input.threadId).query(`
    SELECT ThreadId, UserId, Status, EvaluationJson, ProgressJson, ErrorMessage, CreatedAt, UpdatedAt
    FROM dbo.LiveSessionEvaluations WHERE ThreadId = @threadId
  `)
  return mapRow(r.recordset[0])
}

export async function updateEvaluationStatus(
  pool: ConnectionPool,
  input: {
    threadId: string
    status: LiveEvaluationStatus
    evaluationJson?: string | null
    errorMessage?: string | null
    /** When true (default for complete/failed), clears `ProgressJson`. */
    clearProgressJson?: boolean
  }
): Promise<void> {
  const clearProgress = input.clearProgressJson !== false && input.status === 'complete'
  const req = pool
    .request()
    .input('threadId', input.threadId)
    .input('status', input.status)
    .input('errorMessage', input.errorMessage ?? null)
  if (input.evaluationJson !== undefined) {
    req.input('evaluationJson', sql.NVarChar(sql.MAX), input.evaluationJson)
    if (clearProgress) {
      await req.query(`
        UPDATE dbo.LiveSessionEvaluations
        SET Status = @status,
            EvaluationJson = @evaluationJson,
            ProgressJson = NULL,
            ErrorMessage = @errorMessage,
            UpdatedAt = SYSUTCDATETIME()
        WHERE ThreadId = @threadId
      `)
    } else {
      await req.query(`
        UPDATE dbo.LiveSessionEvaluations
        SET Status = @status,
            EvaluationJson = @evaluationJson,
            ErrorMessage = @errorMessage,
            UpdatedAt = SYSUTCDATETIME()
        WHERE ThreadId = @threadId
      `)
    }
  } else if (clearProgress) {
    await req.query(`
      UPDATE dbo.LiveSessionEvaluations
      SET Status = @status,
          ProgressJson = NULL,
          ErrorMessage = @errorMessage,
          UpdatedAt = SYSUTCDATETIME()
      WHERE ThreadId = @threadId
    `)
  } else {
    await req.query(`
      UPDATE dbo.LiveSessionEvaluations
      SET Status = @status,
          ErrorMessage = @errorMessage,
          UpdatedAt = SYSUTCDATETIME()
      WHERE ThreadId = @threadId
    `)
  }
}

export async function updateEvaluationProgressJson(
  pool: ConnectionPool,
  input: { threadId: string; progressJson: string | null },
): Promise<void> {
  await pool
    .request()
    .input('threadId', input.threadId)
    .input('progressJson', sql.NVarChar(sql.MAX), input.progressJson)
    .query(`
      UPDATE dbo.LiveSessionEvaluations
      SET ProgressJson = @progressJson,
          UpdatedAt = SYSUTCDATETIME()
      WHERE ThreadId = @threadId
    `)
}

export async function tryClaimEvaluationRun(
  pool: ConnectionPool,
  input: { threadId: string }
): Promise<boolean> {
  const r = await pool
    .request()
    .input('threadId', input.threadId)
    .query(`
      UPDATE dbo.LiveSessionEvaluations
      SET Status = N'running',
          ErrorMessage = NULL,
          ProgressJson = NULL,
          UpdatedAt = SYSUTCDATETIME()
      WHERE ThreadId = @threadId
        AND Status <> N'running'
    `)
  return (r.rowsAffected?.[0] ?? 0) > 0
}

export async function getEvaluationByThreadId(
  pool: ConnectionPool,
  threadId: string
): Promise<LiveSessionEvaluationRow | null> {
  const r = await pool.request().input('threadId', threadId).query(`
    SELECT ThreadId, UserId, Status, EvaluationJson, ProgressJson, ErrorMessage, CreatedAt, UpdatedAt
    FROM dbo.LiveSessionEvaluations WHERE ThreadId = @threadId
  `)
  const row = r.recordset[0]
  return row ? mapRow(row) : null
}
