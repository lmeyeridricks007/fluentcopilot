import type sql from 'mssql'
import { newId } from '../shared/ids'

export type SessionLearningSessionType =
  | 'speak_live'
  | 'text_conversation'
  | 'read_aloud'
  | 'listening'
  | 'quick_capture'

export async function getUserLearningProfileJson(pool: sql.ConnectionPool, userId: string): Promise<string | null> {
  const r = await pool.request().input('userId', userId).query<{ ProfileJson: string }>(`
    SELECT ProfileJson FROM dbo.UserLearningProfiles WHERE UserId = @userId
  `)
  return r.recordset[0]?.ProfileJson ?? null
}

export async function upsertUserLearningProfile(
  pool: sql.ConnectionPool,
  userId: string,
  profileJson: string,
  schemaVersion: number
): Promise<void> {
  await pool
    .request()
    .input('userId', userId)
    .input('profileJson', profileJson)
    .input('schemaVersion', schemaVersion)
    .query(`
      MERGE dbo.UserLearningProfiles AS tgt
      USING (SELECT @userId AS UserId) AS src
      ON tgt.UserId = src.UserId
      WHEN MATCHED THEN
        UPDATE SET ProfileJson = @profileJson, SchemaVersion = @schemaVersion, UpdatedAt = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (UserId, ProfileJson, SchemaVersion, CreatedAt, UpdatedAt)
        VALUES (@userId, @profileJson, @schemaVersion, SYSUTCDATETIME(), SYSUTCDATETIME());
    `)
}

export async function hasSessionInsightForThread(pool: sql.ConnectionPool, threadId: string): Promise<boolean> {
  const r = await pool
    .request()
    .input('threadId', threadId)
    .query<{ n: number }>(`SELECT COUNT(1) AS n FROM dbo.SessionLearningInsights WHERE ThreadId = @threadId`)
  return (r.recordset[0]?.n ?? 0) > 0
}

/** De-dupe listening-session insight rows (ThreadId is null; match JSON sessionId). */
export async function hasSessionInsightForListeningSession(
  pool: sql.ConnectionPool,
  userId: string,
  listeningSessionId: string,
): Promise<boolean> {
  const r = await pool
    .request()
    .input('userId', userId)
    .input('sessionId', listeningSessionId)
    .query<{ n: number }>(`
      SELECT COUNT(1) AS n
      FROM dbo.SessionLearningInsights
      WHERE UserId = @userId
        AND SessionType = N'listening'
        AND ISJSON(InsightsJson) = 1
        AND JSON_VALUE(InsightsJson, '$.sessionId') = @sessionId
    `)
  return (r.recordset[0]?.n ?? 0) > 0
}

/** Oldest-first replay order for skill recompute / backfill. */
export async function listSessionLearningInsightsForUser(params: {
  pool: sql.ConnectionPool
  userId: string
  maxRows?: number
}): Promise<Array<{ insightsJson: string; sessionType: SessionLearningSessionType; scenarioId: string | null; createdAt: string }>> {
  const rowLimit = Math.min(2000, Math.max(1, params.maxRows ?? 800))
  const r = await params.pool
    .request()
    .input('userId', params.userId)
    .input('rowLimit', rowLimit)
    .query<{ InsightsJson: string; SessionType: string; ScenarioId: string | null; CreatedAt: Date }>(`
      SELECT TOP (@rowLimit) InsightsJson, SessionType, ScenarioId, CreatedAt
      FROM dbo.SessionLearningInsights
      WHERE UserId = @userId
      ORDER BY CreatedAt ASC
    `)
  return r.recordset.map((row) => ({
    insightsJson: row.InsightsJson,
    sessionType: row.SessionType as SessionLearningSessionType,
    scenarioId: row.ScenarioId,
    createdAt: row.CreatedAt.toISOString(),
  }))
}

export async function insertSessionLearningInsight(params: {
  pool: sql.ConnectionPool
  userId: string
  sessionType: SessionLearningSessionType
  threadId: string | null
  scenarioId: string | null
  insightsJson: string
  signalsJson: string | null
}): Promise<string> {
  const id = newId()
  try {
    await params.pool
      .request()
      .input('id', id)
      .input('userId', params.userId)
      .input('sessionType', params.sessionType)
      .input('threadId', params.threadId)
      .input('scenarioId', params.scenarioId)
      .input('insightsJson', params.insightsJson)
      .input('signalsJson', params.signalsJson)
      .query(`
        INSERT INTO dbo.SessionLearningInsights
          (Id, UserId, SessionType, ThreadId, ScenarioId, InsightsJson, SignalsJson, CreatedAt)
        VALUES
          (@id, @userId, @sessionType, @threadId, @scenarioId, @insightsJson, @signalsJson, SYSUTCDATETIME())
      `)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/UX_SessionLearningInsights_ThreadId/i.test(msg) || /duplicate key/i.test(msg)) {
      return id
    }
    throw e
  }
  return id
}

export async function hasSessionInsightForQuickCaptureSessionId(
  pool: sql.ConnectionPool,
  userId: string,
  sessionId: string,
): Promise<boolean> {
  const r = await pool
    .request()
    .input('userId', userId)
    .input('sessionId', sessionId)
    .query<{ n: number }>(`
      SELECT COUNT(1) AS n
      FROM dbo.SessionLearningInsights
      WHERE UserId = @userId
        AND SessionType = N'quick_capture'
        AND ISJSON(InsightsJson) = 1
        AND JSON_VALUE(InsightsJson, '$.sessionId') = @sessionId
    `)
  return (r.recordset[0]?.n ?? 0) > 0
}
