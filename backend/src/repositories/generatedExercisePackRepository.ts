import type sql from 'mssql'
import { newId } from '../shared/ids'
import type { BlockResultRow } from '../domain/generatedExercisePack/generatedExercisePackHydration'
import { hydrateGeneratedExercisePack } from '../domain/generatedExercisePack/generatedExercisePackHydration'
import type {
  GeneratedExercisePack,
  GeneratedExercisePackStatus,
  GeneratedExercisePackType,
  ExercisePackLevel,
  StoredExerciseBlock,
} from '../domain/generatedExercisePack/generatedExercisePackTypes'

export async function insertGeneratedExercisePack(params: {
  pool: sql.ConnectionPool
  userId: string
  sourceCaptureIds: string[]
  title: string
  subtitle: string | null
  estimatedMinutes: number
  level: ExercisePackLevel
  theme: string | null
  packType: GeneratedExercisePackType
  blocks: readonly StoredExerciseBlock[]
  xpPotential: number
  status?: GeneratedExercisePackStatus
}): Promise<string> {
  const id = newId()
  const total = params.blocks.length
  await params.pool
    .request()
    .input('id', id)
    .input('userId', params.userId)
    .input('sourceCaptureIdsJson', JSON.stringify(params.sourceCaptureIds))
    .input('title', params.title)
    .input('subtitle', params.subtitle)
    .input('estimatedMinutes', params.estimatedMinutes)
    .input('level', params.level)
    .input('theme', params.theme)
    .input('packType', params.packType)
    .input('blocksJson', JSON.stringify(params.blocks))
    .input('status', params.status ?? 'ready')
    .input('xpPotential', params.xpPotential)
    .input('totalBlocks', total)
    .query(`
      INSERT INTO dbo.GeneratedExercisePacks (
        Id, UserId, SourceCaptureIdsJson, Title, Subtitle, EstimatedMinutes, Level, Theme, PackType,
        BlocksJson, Status, XpPotential, TotalBlocks, CompletedBlocks, CreatedAt, UpdatedAt
      ) VALUES (
        @id, @userId, @sourceCaptureIdsJson, @title, @subtitle, @estimatedMinutes, @level, @theme, @packType,
        @blocksJson, @status, @xpPotential, @totalBlocks, 0, SYSUTCDATETIME(), SYSUTCDATETIME()
      )
    `)
  return id
}

export async function getGeneratedExercisePackById(params: {
  pool: sql.ConnectionPool
  userId: string
  packId: string
}): Promise<GeneratedExercisePack | null> {
  const res = await params.pool
    .request()
    .input('id', params.packId)
    .input('userId', params.userId)
    .query(`
      SELECT
        p.Id, p.UserId, p.SourceCaptureIdsJson, p.Title, p.Subtitle, p.EstimatedMinutes, p.Level, p.Theme, p.PackType,
        p.BlocksJson, p.Status, p.CreatedAt, p.CompletedAt, p.XpPotential, p.XpAwarded,
        p.TotalBlocks, p.CompletedBlocks, p.LastOpenedAt, p.LastCompletedBlockId
      FROM dbo.GeneratedExercisePacks p
      WHERE p.Id = @id AND p.UserId = @userId
    `)
  const row = res.recordset?.[0] as Record<string, unknown> | undefined
  if (!row) return null

  const r2 = await params.pool
    .request()
    .input('packId', params.packId)
    .input('userId', params.userId)
    .query(`
      SELECT BlockId, Correctness, CompletionScore, UserAnswerJson, NotesJson, CreatedAt
      FROM dbo.GeneratedExerciseBlockResults
      WHERE PackId = @packId AND UserId = @userId
    `)

  const results: BlockResultRow[] = (r2.recordset ?? []).map((x: Record<string, unknown>) => ({
    blockId: String(x.BlockId),
    correctness: x.Correctness == null ? null : Number(x.Correctness),
    completionScore: x.CompletionScore == null ? null : Number(x.CompletionScore),
    userAnswerJson: x.UserAnswerJson == null ? null : String(x.UserAnswerJson),
    notesJson: x.NotesJson == null ? null : String(x.NotesJson),
    createdAt: (x.CreatedAt as Date).toISOString(),
  }))

  return hydrateGeneratedExercisePack({
    id: String(row.Id),
    userId: String(row.UserId),
    sourceCaptureIdsJson: String(row.SourceCaptureIdsJson),
    title: String(row.Title),
    subtitle: row.Subtitle == null ? null : String(row.Subtitle),
    estimatedMinutes: Number(row.EstimatedMinutes ?? 0),
    level: String(row.Level ?? 'mixed'),
    theme: row.Theme == null ? null : String(row.Theme),
    packType: String(row.PackType),
    blocksJson: String(row.BlocksJson),
    status: String(row.Status),
    createdAt: (row.CreatedAt as Date).toISOString(),
    completedAt: row.CompletedAt == null ? null : (row.CompletedAt as Date).toISOString(),
    xpPotential: Number(row.XpPotential ?? 0),
    xpAwarded: row.XpAwarded == null ? null : Number(row.XpAwarded),
    totalBlocks: Number(row.TotalBlocks ?? 0),
    completedBlocks: Number(row.CompletedBlocks ?? 0),
    lastOpenedAt: row.LastOpenedAt == null ? null : (row.LastOpenedAt as Date).toISOString(),
    lastCompletedBlockId: row.LastCompletedBlockId == null ? null : String(row.LastCompletedBlockId),
    results,
  })
}

export async function touchGeneratedExercisePackOpened(params: {
  pool: sql.ConnectionPool
  userId: string
  packId: string
}): Promise<void> {
  await params.pool
    .request()
    .input('packId', params.packId)
    .input('userId', params.userId)
    .query(`
      UPDATE dbo.GeneratedExercisePacks
      SET
        LastOpenedAt = SYSUTCDATETIME(),
        Status = CASE WHEN Status = N'ready' THEN N'started' ELSE Status END,
        UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @packId AND UserId = @userId
    `)
}

export async function upsertGeneratedExerciseBlockResult(params: {
  pool: sql.ConnectionPool
  userId: string
  packId: string
  blockId: string
  correctness?: number | null
  completionScore?: number | null
  userAnswer?: unknown
  notes?: string[]
}): Promise<void> {
  const userAnswerJson =
    params.userAnswer === undefined ? null : JSON.stringify(params.userAnswer)
  const notesJson = params.notes?.length ? JSON.stringify(params.notes) : null
  const correctness = params.correctness ?? null
  const completionScore = params.completionScore ?? null
  const newRowId = newId()

  await params.pool
    .request()
    .input('id', newRowId)
    .input('packId', params.packId)
    .input('userId', params.userId)
    .input('blockId', params.blockId)
    .input('correctness', correctness)
    .input('completionScore', completionScore)
    .input('userAnswerJson', userAnswerJson)
    .input('notesJson', notesJson)
    .query(`
      ;MERGE dbo.GeneratedExerciseBlockResults AS t
      USING (SELECT @packId AS PackId, @blockId AS BlockId, @userId AS UserId) AS s
      ON (t.PackId = s.PackId AND t.BlockId = s.BlockId AND t.UserId = s.UserId)
      WHEN MATCHED THEN
        UPDATE SET
          Correctness = @correctness,
          CompletionScore = @completionScore,
          UserAnswerJson = @userAnswerJson,
          NotesJson = @notesJson,
          UpdatedAt = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (Id, PackId, UserId, BlockId, Correctness, CompletionScore, UserAnswerJson, NotesJson, CreatedAt, UpdatedAt)
        VALUES (@id, @packId, @userId, @blockId, @correctness, @completionScore, @userAnswerJson, @notesJson, SYSUTCDATETIME(), SYSUTCDATETIME());
    `)

  await params.pool
    .request()
    .input('packId', params.packId)
    .input('userId', params.userId)
    .input('blockId', params.blockId)
    .query(`
      DECLARE @done INT = (
        SELECT COUNT(*) FROM dbo.GeneratedExerciseBlockResults WHERE PackId = @packId AND UserId = @userId
      );
      DECLARE @total INT = (SELECT TotalBlocks FROM dbo.GeneratedExercisePacks WHERE Id = @packId AND UserId = @userId);
      UPDATE dbo.GeneratedExercisePacks
      SET
        CompletedBlocks = @done,
        LastCompletedBlockId = @blockId,
        Status = CASE WHEN Status = N'ready' THEN N'started' ELSE Status END,
        UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @packId AND UserId = @userId
    `)
}

export async function markGeneratedExercisePackXp(params: {
  pool: sql.ConnectionPool
  userId: string
  packId: string
  xpAwarded: number
}): Promise<void> {
  await params.pool
    .request()
    .input('packId', params.packId)
    .input('userId', params.userId)
    .input('xpAwarded', params.xpAwarded)
    .query(`
      UPDATE dbo.GeneratedExercisePacks
      SET XpAwarded = @xpAwarded, UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @packId AND UserId = @userId
    `)
}

export async function markGeneratedExercisePackArchived(params: {
  pool: sql.ConnectionPool
  userId: string
  packId: string
}): Promise<void> {
  await params.pool
    .request()
    .input('packId', params.packId)
    .input('userId', params.userId)
    .query(`
      UPDATE dbo.GeneratedExercisePacks
      SET Status = N'archived', UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @packId AND UserId = @userId
    `)
}

export async function finalizeGeneratedExercisePackCompletion(params: {
  pool: sql.ConnectionPool
  userId: string
  packId: string
  xpAwarded?: number | null
}): Promise<void> {
  await params.pool
    .request()
    .input('packId', params.packId)
    .input('userId', params.userId)
    .input('xpAwarded', params.xpAwarded ?? null)
    .query(`
      UPDATE dbo.GeneratedExercisePacks
      SET
        Status = N'completed',
        CompletedAt = SYSUTCDATETIME(),
        XpAwarded = COALESCE(@xpAwarded, XpAwarded),
        UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @packId AND UserId = @userId
    `)
}
