import type sql from 'mssql'
import { newId } from '../shared/ids'

export type QuickCaptureType =
  | 'save_word'
  | 'save_phrase'
  | 'photo_text'
  | 'add_place'
  | 'paste_text'
  | 'log_struggle'
  | 'voice_note'

export type QuickCaptureStatus =
  | 'new'
  | 'enriched'
  | 'ready_for_practice'
  | 'included_in_practice'
  | 'practiced'
  | 'saved_long_term'
  | 'archived'

export type DayPackStatus = 'active' | 'completed' | 'abandoned'

export type QuickCaptureRow = {
  id: string
  userId: string
  captureType: QuickCaptureType
  status: QuickCaptureStatus
  title: string | null
  bodyPrimary: string | null
  bodySecondary: string | null
  enrichedJson: string | null
  rawJson: string | null
  localCaptureDate: string
  placeKind: string | null
  imageMime: string | null
  transcript: string | null
  dayPackId: string | null
  createdAt: string
  updatedAt: string
}

export type DayPracticePackRow = {
  id: string
  userId: string
  localDate: string
  title: string
  stepsJson: string
  captureIdsJson: string
  status: DayPackStatus
  createdAt: string
  completedAt: string | null
}

function mapCapture(r: Record<string, unknown>): QuickCaptureRow {
  return {
    id: String(r.Id),
    userId: String(r.UserId),
    captureType: r.CaptureType as QuickCaptureType,
    status: r.Status as QuickCaptureStatus,
    title: r.Title == null ? null : String(r.Title),
    bodyPrimary: r.BodyPrimary == null ? null : String(r.BodyPrimary),
    bodySecondary: r.BodySecondary == null ? null : String(r.BodySecondary),
    enrichedJson: r.EnrichedJson == null ? null : String(r.EnrichedJson),
    rawJson: r.RawJson == null ? null : String(r.RawJson),
    localCaptureDate: (r.LocalCaptureDate as Date).toISOString().slice(0, 10),
    placeKind: r.PlaceKind == null ? null : String(r.PlaceKind),
    imageMime: r.ImageMime == null ? null : String(r.ImageMime),
    transcript: r.Transcript == null ? null : String(r.Transcript),
    dayPackId: r.DayPackId == null ? null : String(r.DayPackId),
    createdAt: (r.CreatedAt as Date).toISOString(),
    updatedAt: (r.UpdatedAt as Date).toISOString(),
  }
}

export async function insertQuickCapture(params: {
  pool: sql.ConnectionPool
  userId: string
  captureType: QuickCaptureType
  status: QuickCaptureStatus
  title: string | null
  bodyPrimary: string | null
  bodySecondary: string | null
  rawJson: string | null
  localCaptureDate: string
  placeKind: string | null
  imageMime: string | null
  transcript: string | null
}): Promise<string> {
  const id = newId()
  await params.pool
    .request()
    .input('id', id)
    .input('userId', params.userId)
    .input('captureType', params.captureType)
    .input('status', params.status)
    .input('title', params.title)
    .input('bodyPrimary', params.bodyPrimary)
    .input('bodySecondary', params.bodySecondary)
    .input('rawJson', params.rawJson)
    .input('localDate', params.localCaptureDate)
    .input('placeKind', params.placeKind)
    .input('imageMime', params.imageMime)
    .input('transcript', params.transcript)
    .query(`
      INSERT INTO dbo.UserQuickCaptures
        (Id, UserId, CaptureType, Status, Title, BodyPrimary, BodySecondary, RawJson, LocalCaptureDate, PlaceKind, ImageMime, Transcript, CreatedAt, UpdatedAt)
      VALUES
        (@id, @userId, @captureType, @status, @title, @bodyPrimary, @bodySecondary, @rawJson, @localDate, @placeKind, @imageMime, @transcript, SYSUTCDATETIME(), SYSUTCDATETIME())
    `)
  return id
}

export async function updateQuickCaptureRawJson(params: {
  pool: sql.ConnectionPool
  captureId: string
  userId: string
  rawJson: string | null
}): Promise<void> {
  await params.pool
    .request()
    .input('id', params.captureId)
    .input('userId', params.userId)
    .input('rawJson', params.rawJson)
    .query(`
      UPDATE dbo.UserQuickCaptures
      SET RawJson = @rawJson, UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @id AND UserId = @userId
    `)
}

export async function updateQuickCaptureEnriched(params: {
  pool: sql.ConnectionPool
  captureId: string
  userId: string
  enrichedJson: string
  status: QuickCaptureStatus
  title?: string | null
  bodyPrimary?: string | null
  bodySecondary?: string | null
  transcript?: string | null
}): Promise<void> {
  const req = params.pool
    .request()
    .input('id', params.captureId)
    .input('userId', params.userId)
    .input('enrichedJson', params.enrichedJson)
    .input('status', params.status)
  let set = `EnrichedJson = @enrichedJson, Status = @status, UpdatedAt = SYSUTCDATETIME()`
  if (params.title !== undefined) {
    req.input('title', params.title)
    set += `, Title = @title`
  }
  if (params.bodyPrimary !== undefined) {
    req.input('bodyPrimary', params.bodyPrimary)
    set += `, BodyPrimary = @bodyPrimary`
  }
  if (params.bodySecondary !== undefined) {
    req.input('bodySecondary', params.bodySecondary)
    set += `, BodySecondary = @bodySecondary`
  }
  if (params.transcript !== undefined) {
    req.input('transcript', params.transcript)
    set += `, Transcript = @transcript`
  }
  await req.query(`
    UPDATE dbo.UserQuickCaptures SET ${set}
    WHERE Id = @id AND UserId = @userId
  `)
}

export async function updateQuickCaptureStatus(params: {
  pool: sql.ConnectionPool
  captureId: string
  userId: string
  status: QuickCaptureStatus
  dayPackId?: string | null
}): Promise<void> {
  const req = params.pool.request().input('id', params.captureId).input('userId', params.userId).input('status', params.status)
  if (params.dayPackId !== undefined) {
    req.input('dayPackId', params.dayPackId)
    await req.query(`
      UPDATE dbo.UserQuickCaptures
      SET Status = @status, DayPackId = @dayPackId, UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @id AND UserId = @userId
    `)
    return
  }
  await req.query(`
    UPDATE dbo.UserQuickCaptures SET Status = @status, UpdatedAt = SYSUTCDATETIME()
    WHERE Id = @id AND UserId = @userId
  `)
}

export async function listQuickCapturesForUser(params: {
  pool: sql.ConnectionPool
  userId: string
  status?: QuickCaptureStatus | QuickCaptureStatus[]
  localDate?: string
  limit?: number
}): Promise<QuickCaptureRow[]> {
  const lim = Math.min(500, Math.max(1, params.limit ?? 120))
  let where = `UserId = @userId`
  const req = params.pool.request().input('userId', params.userId).input('lim', lim)
  if (params.localDate) {
    where += ` AND LocalCaptureDate = @localDate`
    req.input('localDate', params.localDate)
  }
  if (params.status) {
    const st = Array.isArray(params.status) ? params.status : [params.status]
    where += ` AND Status IN (${st.map((_, i) => `@s${i}`).join(', ')})`
    st.forEach((v, i) => req.input(`s${i}`, v))
  }
  const r = await req.query(`
    SELECT TOP (@lim) *
    FROM dbo.UserQuickCaptures
    WHERE ${where}
    ORDER BY CreatedAt DESC
  `)
  return r.recordset.map((row) => mapCapture(row as Record<string, unknown>))
}

export async function getQuickCaptureById(
  pool: sql.ConnectionPool,
  userId: string,
  captureId: string,
): Promise<QuickCaptureRow | null> {
  const r = await pool
    .request()
    .input('id', captureId)
    .input('userId', userId)
    .query(`SELECT TOP 1 * FROM dbo.UserQuickCaptures WHERE Id = @id AND UserId = @userId`)
  const row = r.recordset[0] as Record<string, unknown> | undefined
  return row ? mapCapture(row) : null
}

export async function insertDayPracticePack(params: {
  pool: sql.ConnectionPool
  userId: string
  localDate: string
  title: string
  stepsJson: string
  captureIdsJson: string
}): Promise<string> {
  const id = newId()
  await params.pool
    .request()
    .input('id', id)
    .input('userId', params.userId)
    .input('localDate', params.localDate)
    .input('title', params.title)
    .input('stepsJson', params.stepsJson)
    .input('captureIdsJson', params.captureIdsJson)
    .query(`
      INSERT INTO dbo.UserDayPracticePacks
        (Id, UserId, LocalDate, Title, StepsJson, CaptureIdsJson, Status, CreatedAt)
      VALUES
        (@id, @userId, @localDate, @title, @stepsJson, @captureIdsJson, N'active', SYSUTCDATETIME())
    `)
  return id
}

export async function completeDayPracticePack(params: {
  pool: sql.ConnectionPool
  packId: string
  userId: string
}): Promise<void> {
  await params.pool
    .request()
    .input('id', params.packId)
    .input('userId', params.userId)
    .query(`
      UPDATE dbo.UserDayPracticePacks
      SET Status = N'completed', CompletedAt = SYSUTCDATETIME()
      WHERE Id = @id AND UserId = @userId AND Status = N'active'
    `)
}

export async function getDayPracticePack(
  pool: sql.ConnectionPool,
  userId: string,
  packId: string,
): Promise<DayPracticePackRow | null> {
  const r = await pool
    .request()
    .input('id', packId)
    .input('userId', userId)
    .query(`
      SELECT TOP 1 Id, UserId, LocalDate, Title, StepsJson, CaptureIdsJson, Status, CreatedAt, CompletedAt
      FROM dbo.UserDayPracticePacks WHERE Id = @id AND UserId = @userId
    `)
  const row = r.recordset[0] as
    | {
        Id: string
        UserId: string
        LocalDate: Date
        Title: string
        StepsJson: string
        CaptureIdsJson: string
        Status: string
        CreatedAt: Date
        CompletedAt: Date | null
      }
    | undefined
  if (!row) return null
  return {
    id: row.Id,
    userId: row.UserId,
    localDate: row.LocalDate.toISOString().slice(0, 10),
    title: row.Title,
    stepsJson: row.StepsJson,
    captureIdsJson: row.CaptureIdsJson,
    status: row.Status as DayPackStatus,
    createdAt: row.CreatedAt.toISOString(),
    completedAt: row.CompletedAt ? row.CompletedAt.toISOString() : null,
  }
}

export async function attachCapturesToPack(params: {
  pool: sql.ConnectionPool
  userId: string
  packId: string
  captureIds: string[]
  status: QuickCaptureStatus
}): Promise<void> {
  if (!params.captureIds.length) return
  for (const cid of params.captureIds) {
    await params.pool
      .request()
      .input('id', cid)
      .input('userId', params.userId)
      .input('packId', params.packId)
      .input('status', params.status)
      .query(`
        UPDATE dbo.UserQuickCaptures
        SET DayPackId = @packId, Status = @status, UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @id AND UserId = @userId
      `)
  }
}

export async function markCapturesPracticedForPack(params: {
  pool: sql.ConnectionPool
  userId: string
  packId: string
}): Promise<void> {
  await params.pool
    .request()
    .input('userId', params.userId)
    .input('packId', params.packId)
    .query(`
      UPDATE dbo.UserQuickCaptures
      SET Status = N'practiced', UpdatedAt = SYSUTCDATETIME()
      WHERE UserId = @userId AND DayPackId = @packId AND Status = N'included_in_practice'
    `)
}
