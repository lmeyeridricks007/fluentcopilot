import type sql from 'mssql'
import { newId } from '../shared/ids'
import { shouldTransitionLoopToStale } from '../domain/trainingLoops/trainingLoopStaleEligibility'
import { parseTrainingLoopPayloadFromStorage } from '../domain/trainingLoops/trainingLoopPayloads'
import type {
  PersonalizedTrainingLoop,
  TrainingLoopDifficulty,
  TrainingLoopPatch,
  TrainingLoopSourceType,
  TrainingLoopStatus,
  TrainingLoopType,
} from '../domain/trainingLoops/trainingLoopTypes'
import type { TrainingLoopEventType } from '../domain/trainingLoops/trainingLoopKinds'

export type PersonalizedTrainingLoopRow = {
  Id: string
  UserId: string
  SourceSessionId: string
  ThreadId: string | null
  SourceType: string
  SourceScenarioId: string | null
  LoopType: string
  LoopSlot: number
  Title: string
  Subtitle: string | null
  Reason: string
  TargetSkillsJson: string
  TargetWeaknessKeysJson: string
  EstimatedMinutes: number
  Difficulty: string
  PayloadJson: string
  Status: string
  Confidence: string
  PriorityScore: number
  DedupeKey: string | null
  GenerationDebugJson: string | null
  CreatedAt: Date
  UpdatedAt: Date
  ExpiresAt: Date | null
  CompletionResultJson?: string | null
}

function rowToDomain(r: PersonalizedTrainingLoopRow): PersonalizedTrainingLoop {
  const loopType = r.LoopType as TrainingLoopType
  let rawPayload: unknown = {}
  try {
    rawPayload = JSON.parse(r.PayloadJson || '{}') as unknown
  } catch {
    rawPayload = {}
  }
  return {
    id: r.Id,
    userId: r.UserId,
    sourceSessionId: r.SourceSessionId,
    threadId: r.ThreadId,
    sourceType: r.SourceType as TrainingLoopSourceType,
    sourceScenarioId: r.SourceScenarioId,
    loopSlot: r.LoopSlot as 0 | 1 | 2,
    loopType,
    title: r.Title,
    subtitle: r.Subtitle,
    reason: r.Reason,
    targetSkills: JSON.parse(r.TargetSkillsJson || '[]') as string[],
    targetWeaknessKeys: JSON.parse(r.TargetWeaknessKeysJson || '[]') as string[],
    estimatedMinutes: r.EstimatedMinutes,
    difficulty: r.Difficulty as TrainingLoopDifficulty,
    payload: parseTrainingLoopPayloadFromStorage(loopType, rawPayload),
    createdAt: r.CreatedAt.toISOString(),
    updatedAt: r.UpdatedAt.toISOString(),
    expiresAt: r.ExpiresAt ? r.ExpiresAt.toISOString() : null,
    status: r.Status as TrainingLoopStatus,
    confidence: r.Confidence as PersonalizedTrainingLoop['confidence'],
    priorityScore: r.PriorityScore,
    dedupeKey: r.DedupeKey,
    lastCompletionResult: parseCompletionResultJson(r.CompletionResultJson),
  }
}

function parseCompletionResultJson(raw: string | null | undefined): PersonalizedTrainingLoop['lastCompletionResult'] {
  if (!raw || !raw.trim()) return null
  try {
    return JSON.parse(raw) as PersonalizedTrainingLoop['lastCompletionResult']
  } catch {
    return null
  }
}

export async function hasLoopsForSourceSession(
  pool: sql.ConnectionPool,
  userId: string,
  sourceSessionId: string,
): Promise<boolean> {
  const r = await pool
    .request()
    .input('userId', userId)
    .input('sourceSessionId', sourceSessionId)
    .query<{ n: number }>(`
      SELECT COUNT(1) AS n
      FROM dbo.PersonalizedTrainingLoops
      WHERE UserId = @userId AND SourceSessionId = @sourceSessionId
    `)
  return (r.recordset[0]?.n ?? 0) > 0
}

export type ListTrainingLoopsFilter = {
  userId: string
  status?: TrainingLoopStatus | null
  sourceType?: TrainingLoopSourceType | null
  loopType?: TrainingLoopType | null
  createdAtOrAfter?: string | null
  createdAtOrBefore?: string | null
  maxRows?: number
}

export async function listTrainingLoopsWithFilters(
  pool: sql.ConnectionPool,
  f: ListTrainingLoopsFilter,
): Promise<PersonalizedTrainingLoop[]> {
  const rowLimit = Math.min(200, Math.max(1, f.maxRows ?? 60))
  const r = await pool
    .request()
    .input('userId', f.userId)
    .input('rowLimit', rowLimit)
    .input('status', f.status ?? null)
    .input('sourceType', f.sourceType ?? null)
    .input('loopType', f.loopType ?? null)
    .input('since', f.createdAtOrAfter ?? null)
    .input('until', f.createdAtOrBefore ?? null)
    .query<PersonalizedTrainingLoopRow>(`
      SELECT TOP (@rowLimit) *
      FROM dbo.PersonalizedTrainingLoops
      WHERE UserId = @userId
        AND ((@status IS NULL) OR (Status = @status))
        AND ((@sourceType IS NULL) OR (SourceType = @sourceType))
        AND ((@loopType IS NULL) OR (LoopType = @loopType))
        AND ((@since IS NULL) OR (CreatedAt >= @since))
        AND ((@until IS NULL) OR (CreatedAt <= @until))
      ORDER BY CreatedAt DESC
    `)
  return r.recordset.map(rowToDomain)
}

export async function listRecentLoopsForUser(
  pool: sql.ConnectionPool,
  userId: string,
  maxRows: number,
): Promise<PersonalizedTrainingLoopRow[]> {
  const r = await pool
    .request()
    .input('userId', userId)
    .input('maxRows', Math.min(200, Math.max(1, maxRows)))
    .query<PersonalizedTrainingLoopRow>(`
      SELECT TOP (@maxRows) *
      FROM dbo.PersonalizedTrainingLoops
      WHERE UserId = @userId
      ORDER BY CreatedAt DESC
    `)
  return r.recordset
}

export async function insertTrainingLoop(
  pool: sql.ConnectionPool,
  row: {
    userId: string
    sourceSessionId: string
    threadId: string | null
    sourceType: TrainingLoopSourceType
    sourceScenarioId: string | null
    loopType: TrainingLoopType
    loopSlot: number
    title: string
    subtitle: string | null
    reason: string
    targetSkills: string[]
    targetWeaknessKeys: string[]
    estimatedMinutes: number
    difficulty: TrainingLoopDifficulty
    payload: PersonalizedTrainingLoop['payload']
    status: TrainingLoopStatus
    confidence: string
    priorityScore: number
    dedupeKey: string | null
    generationDebugJson: string | null
    expiresAt: string | null
    id?: string
  },
): Promise<string> {
  const id = row.id ?? newId()
  await pool
    .request()
    .input('id', id)
    .input('userId', row.userId)
    .input('sourceSessionId', row.sourceSessionId)
    .input('threadId', row.threadId)
    .input('sourceType', row.sourceType)
    .input('sourceScenarioId', row.sourceScenarioId)
    .input('loopType', row.loopType)
    .input('loopSlot', row.loopSlot)
    .input('title', row.title)
    .input('subtitle', row.subtitle)
    .input('reason', row.reason)
    .input('targetSkillsJson', JSON.stringify(row.targetSkills))
    .input('targetWeaknessKeysJson', JSON.stringify(row.targetWeaknessKeys))
    .input('estimatedMinutes', row.estimatedMinutes)
    .input('difficulty', row.difficulty)
    .input('payloadJson', JSON.stringify(row.payload ?? {}))
    .input('status', row.status)
    .input('confidence', row.confidence)
    .input('priorityScore', row.priorityScore)
    .input('dedupeKey', row.dedupeKey)
    .input('generationDebugJson', row.generationDebugJson)
    .input('expiresAt', row.expiresAt)
    .query(`
      INSERT INTO dbo.PersonalizedTrainingLoops (
        Id, UserId, SourceSessionId, ThreadId, SourceType, SourceScenarioId,
        LoopType, LoopSlot, Title, Subtitle, Reason,
        TargetSkillsJson, TargetWeaknessKeysJson, EstimatedMinutes, Difficulty,
        PayloadJson, Status, Confidence, PriorityScore, DedupeKey, GenerationDebugJson,
        CreatedAt, UpdatedAt, ExpiresAt
      ) VALUES (
        @id, @userId, @sourceSessionId, @threadId, @sourceType, @sourceScenarioId,
        @loopType, @loopSlot, @title, @subtitle, @reason,
        @targetSkillsJson, @targetWeaknessKeysJson, @estimatedMinutes, @difficulty,
        @payloadJson, @status, @confidence, @priorityScore, @dedupeKey, @generationDebugJson,
        SYSUTCDATETIME(), SYSUTCDATETIME(), @expiresAt
      )
    `)
  return id
}

export async function insertTrainingLoopEvent(params: {
  pool: sql.ConnectionPool
  loopId: string
  userId: string
  eventType: TrainingLoopEventType
  resultJson: string | null
}): Promise<string> {
  const id = newId()
  await params.pool
    .request()
    .input('id', id)
    .input('loopId', params.loopId)
    .input('userId', params.userId)
    .input('eventType', params.eventType)
    .input('resultJson', params.resultJson)
    .query(`
      INSERT INTO dbo.TrainingLoopEvents (Id, LoopId, UserId, EventType, ResultJson, CreatedAt)
      VALUES (@id, @loopId, @userId, @eventType, @resultJson, SYSUTCDATETIME())
    `)
  return id
}

export async function updateTrainingLoopPatch(
  pool: sql.ConnectionPool,
  params: { userId: string; loopId: string; patch: TrainingLoopPatch },
): Promise<boolean> {
  const p = params.patch
  if (Object.keys(p).length === 0) return true
  const req = pool.request().input('userId', params.userId).input('id', params.loopId)
  const sets: string[] = ['UpdatedAt = SYSUTCDATETIME()']
  if (p.title !== undefined) {
    sets.push('Title = @title')
    req.input('title', p.title)
  }
  if (p.subtitle !== undefined) {
    sets.push('Subtitle = @subtitle')
    req.input('subtitle', p.subtitle)
  }
  if (p.reason !== undefined) {
    sets.push('Reason = @reason')
    req.input('reason', p.reason)
  }
  if (p.priorityScore !== undefined) {
    sets.push('PriorityScore = @priorityScore')
    req.input('priorityScore', p.priorityScore)
  }
  if (p.expiresAt !== undefined) {
    sets.push('ExpiresAt = @expiresAt')
    req.input('expiresAt', p.expiresAt)
  }
  if (p.confidence !== undefined) {
    sets.push('Confidence = @confidence')
    req.input('confidence', p.confidence)
  }
  if (p.estimatedMinutes !== undefined) {
    sets.push('EstimatedMinutes = @estimatedMinutes')
    req.input('estimatedMinutes', p.estimatedMinutes)
  }
  if (p.difficulty !== undefined) {
    sets.push('Difficulty = @difficulty')
    req.input('difficulty', p.difficulty)
  }
  if (p.targetSkills !== undefined) {
    sets.push('TargetSkillsJson = @targetSkillsJson')
    req.input('targetSkillsJson', JSON.stringify(p.targetSkills))
  }
  if (p.targetWeaknessKeys !== undefined) {
    sets.push('TargetWeaknessKeysJson = @targetWeaknessKeysJson')
    req.input('targetWeaknessKeysJson', JSON.stringify(p.targetWeaknessKeys))
  }
  if (p.payload !== undefined) {
    sets.push('PayloadJson = @payloadJson')
    req.input('payloadJson', JSON.stringify(p.payload))
  }
  const res = await req.query(`
    UPDATE dbo.PersonalizedTrainingLoops
    SET ${sets.join(', ')}
    WHERE UserId = @userId AND Id = @id
  `)
  return (res.rowsAffected?.[0] ?? 0) > 0
}

export async function listLoopsForThread(
  pool: sql.ConnectionPool,
  userId: string,
  threadId: string,
): Promise<PersonalizedTrainingLoop[]> {
  const r = await pool
    .request()
    .input('userId', userId)
    .input('threadId', threadId)
    .query<PersonalizedTrainingLoopRow>(`
      SELECT * FROM dbo.PersonalizedTrainingLoops
      WHERE UserId = @userId AND ThreadId = @threadId
      ORDER BY LoopSlot ASC, CreatedAt DESC
    `)
  return r.recordset.map(rowToDomain)
}

export async function listActiveLoopsForUser(
  pool: sql.ConnectionPool,
  userId: string,
  limit: number,
): Promise<PersonalizedTrainingLoop[]> {
  await markStaleTrainingLoopsForUser(pool, userId)
  const r = await pool
    .request()
    .input('userId', userId)
    .input('limit', Math.min(40, Math.max(1, limit)))
    .query<PersonalizedTrainingLoopRow>(`
      SELECT TOP (@limit) * FROM dbo.PersonalizedTrainingLoops
      WHERE UserId = @userId
        AND Status IN (N'active', N'in_progress')
        AND (ExpiresAt IS NULL OR ExpiresAt > SYSUTCDATETIME())
      ORDER BY PriorityScore DESC, CreatedAt DESC
    `)
  return r.recordset.map(rowToDomain)
}

export async function markStaleTrainingLoopsForUser(pool: sql.ConnectionPool, userId: string): Promise<number> {
  const rows = await pool.request().input('userId', userId).query<{
    Id: string
    Status: string
    ExpiresAt: Date | null
    CreatedAt: Date
    UpdatedAt: Date
  }>(`
      SELECT Id, Status, ExpiresAt, CreatedAt, UpdatedAt
      FROM dbo.PersonalizedTrainingLoops
      WHERE UserId = @userId
        AND Status IN (N'active', N'in_progress')
    `)
  const nowMs = Date.now()
  const ids = rows.recordset
    .filter((r) =>
      shouldTransitionLoopToStale({
        status: r.Status,
        expiresAt: r.ExpiresAt,
        createdAt: r.CreatedAt,
        updatedAt: r.UpdatedAt,
        nowMs,
      }),
    )
    .map((r) => r.Id)
    .filter(Boolean)
  if (!ids.length) return 0
  for (const id of ids) {
    await pool
      .request()
      .input('userId', userId)
      .input('id', id)
      .query(`
        UPDATE dbo.PersonalizedTrainingLoops
        SET Status = N'stale', UpdatedAt = SYSUTCDATETIME()
        WHERE UserId = @userId AND Id = @id
      `)
  }
  for (const id of ids) {
    try {
      await insertTrainingLoopEvent({
        pool,
        loopId: id,
        userId,
        eventType: 'stale_marked',
        resultJson: JSON.stringify({ reason: 'lifecycle', kind: 'expired_or_ignored' }),
      })
    } catch {
      /* TrainingLoopEvents optional */
    }
  }
  return ids.length
}

/** Completed / dismissed / stale rows for history, dedupe signals, and “what worked” surfaces. */
export async function listTrainingLoopHistoryForUser(
  pool: sql.ConnectionPool,
  userId: string,
  limit = 20,
): Promise<PersonalizedTrainingLoop[]> {
  const lim = Math.min(40, Math.max(1, limit))
  const r = await pool
    .request()
    .input('userId', userId)
    .input('lim', lim)
    .query<PersonalizedTrainingLoopRow>(`
      SELECT TOP (@lim) *
      FROM dbo.PersonalizedTrainingLoops
      WHERE UserId = @userId
        AND Status IN (N'completed', N'dismissed', N'stale')
      ORDER BY UpdatedAt DESC, CreatedAt DESC
    `)
  return r.recordset.map(rowToDomain)
}

/** Dismiss from actionable states and demote priority so future generation prefers fresh shapes. */
export async function dismissLoopWithPriorityDemotion(
  pool: sql.ConnectionPool,
  userId: string,
  loopId: string,
): Promise<boolean> {
  const res = await pool
    .request()
    .input('userId', userId)
    .input('id', loopId)
    .query(`
      UPDATE dbo.PersonalizedTrainingLoops
      SET Status = N'dismissed',
          UpdatedAt = SYSUTCDATETIME(),
          PriorityScore = CASE
            WHEN PriorityScore * 0.38 < 6 THEN 6
            ELSE ROUND(PriorityScore * 0.38, 2)
          END
      WHERE UserId = @userId AND Id = @id
        AND Status IN (N'active', N'in_progress')
    `)
  return (res.rowsAffected?.[0] ?? 0) > 0
}

export async function getLoopById(
  pool: sql.ConnectionPool,
  userId: string,
  loopId: string,
): Promise<PersonalizedTrainingLoop | null> {
  const r = await pool
    .request()
    .input('userId', userId)
    .input('id', loopId)
    .query<PersonalizedTrainingLoopRow>(`
      SELECT TOP (1) * FROM dbo.PersonalizedTrainingLoops
      WHERE UserId = @userId AND Id = @id
    `)
  const row = r.recordset[0]
  return row ? rowToDomain(row) : null
}

export async function updateLoopStatus(
  pool: sql.ConnectionPool,
  params: {
    userId: string
    loopId: string
    status: TrainingLoopStatus
    /** When set (e.g. status completed), persists migration 036 column. */
    completionResultJson?: string | null
  },
): Promise<boolean> {
  if (typeof params.completionResultJson === 'string') {
    const res = await pool
      .request()
      .input('userId', params.userId)
      .input('id', params.loopId)
      .input('status', params.status)
      .input('completionJson', params.completionResultJson)
      .query(`
        UPDATE dbo.PersonalizedTrainingLoops
        SET Status = @status,
            UpdatedAt = SYSUTCDATETIME(),
            CompletionResultJson = @completionJson
        WHERE UserId = @userId AND Id = @id
      `)
    return (res.rowsAffected?.[0] ?? 0) > 0
  }
  const res = await pool
    .request()
    .input('userId', params.userId)
    .input('id', params.loopId)
    .input('status', params.status)
    .query(`
      UPDATE dbo.PersonalizedTrainingLoops
      SET Status = @status, UpdatedAt = SYSUTCDATETIME()
      WHERE UserId = @userId AND Id = @id
    `)
  return (res.rowsAffected?.[0] ?? 0) > 0
}

export async function listLoopsForSourceSession(
  pool: sql.ConnectionPool,
  userId: string,
  sourceSessionId: string,
): Promise<PersonalizedTrainingLoop[]> {
  const r = await pool
    .request()
    .input('userId', userId)
    .input('sourceSessionId', sourceSessionId)
    .query<PersonalizedTrainingLoopRow>(`
      SELECT * FROM dbo.PersonalizedTrainingLoops
      WHERE UserId = @userId AND SourceSessionId = @sourceSessionId
      ORDER BY LoopSlot ASC
    `)
  return r.recordset.map(rowToDomain)
}

export type ActiveLoopGenerationDebugDevRow = {
  loopId: string
  loopSlot: number
  threadId: string | null
  sourceSessionId: string
  loopType: string
  title: string
  status: string
  updatedAt: Date
  generationDebugJson: string | null
}

export async function listActiveLoopsWithGenerationDebugJsonForDev(
  pool: sql.ConnectionPool,
  userId: string,
  limit: number,
): Promise<ActiveLoopGenerationDebugDevRow[]> {
  const lim = Math.min(12, Math.max(1, limit))
  const r = await pool
    .request()
    .input('userId', userId)
    .input('lim', lim)
    .query<{
      Id: string
      LoopSlot: number
      ThreadId: string | null
      SourceSessionId: string
      LoopType: string
      Title: string
      Status: string
      UpdatedAt: Date
      GenerationDebugJson: string | null
    }>(`
      SELECT TOP (@lim)
        Id, LoopSlot, ThreadId, SourceSessionId, LoopType, Title, Status, UpdatedAt, GenerationDebugJson
      FROM dbo.PersonalizedTrainingLoops
      WHERE UserId = @userId
        AND Status IN (N'active', N'in_progress')
        AND (ExpiresAt IS NULL OR ExpiresAt > SYSUTCDATETIME())
      ORDER BY LoopSlot ASC, PriorityScore DESC, CreatedAt DESC
    `)
  return r.recordset.map((row) => ({
    loopId: row.Id,
    loopSlot: row.LoopSlot,
    threadId: row.ThreadId,
    sourceSessionId: row.SourceSessionId,
    loopType: row.LoopType,
    title: row.Title,
    status: row.Status,
    updatedAt: row.UpdatedAt,
    generationDebugJson: row.GenerationDebugJson,
  }))
}

export type TrainingLoopLifecycleEventDevRow = {
  id: string
  loopId: string
  eventType: string
  createdAt: Date
  resultJson: string | null
  loopType: string | null
  loopTitle: string | null
  loopSlot: number | null
}

export async function listRecentTrainingLoopLifecycleEventsForDev(
  pool: sql.ConnectionPool,
  userId: string,
  maxRows: number,
): Promise<TrainingLoopLifecycleEventDevRow[]> {
  const lim = Math.min(50, Math.max(1, maxRows))
  const r = await pool
    .request()
    .input('userId', userId)
    .input('lim', lim)
    .query<{
      Id: string
      LoopId: string
      EventType: string
      CreatedAt: Date
      ResultJson: string | null
      LoopType: string | null
      Title: string | null
      LoopSlot: number | null
    }>(`
      SELECT TOP (@lim)
        e.Id,
        e.LoopId,
        e.EventType,
        e.CreatedAt,
        e.ResultJson,
        l.LoopType,
        l.Title,
        l.LoopSlot
      FROM dbo.TrainingLoopEvents e
      INNER JOIN dbo.PersonalizedTrainingLoops l
        ON l.Id = e.LoopId AND l.UserId = e.UserId
      WHERE e.UserId = @userId
      ORDER BY e.CreatedAt DESC
    `)
  return r.recordset.map((row) => ({
    id: row.Id,
    loopId: row.LoopId,
    eventType: row.EventType,
    createdAt: row.CreatedAt,
    resultJson: row.ResultJson,
    loopType: row.LoopType,
    loopTitle: row.Title,
    loopSlot: row.LoopSlot,
  }))
}
