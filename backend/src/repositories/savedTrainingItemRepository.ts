import sql from 'mssql'
import type { ConnectionPool } from 'mssql'
import { newId } from '../shared/ids'

export type SavedTrainingItemType =
  | 'word'
  | 'phrase'
  | 'pronunciation_drill'
  | 'rhythm_drill'
  | 'phrasing_drill'
  | 'natural_phrasing_drill'
  | 'scenario_followup'
  | 'sentence_drill'
  | 'coach_followup'
  | 'review_queue'
  | 'speaking_drill'

/** Where this item should surface in FluentCopilot (filters + coach routing). */
export type SavedTrainingTagCategory =
  | 'library'
  | 'coach_follow_up'
  | 'review_queue'
  | 'speaking_drill'
  | 'pronunciation_drill'
  | 'rhythm_drill'
  | 'phrasing_upgrade'
  | 'general'

export type SavedTrainingItemRow = {
  id: string
  userId: string
  sourceSessionId: string
  sourceTurnId: string | null
  sourceScenarioId: string | null
  learnerOriginalSentence: string | null
  improvedSentence: string | null
  tagCategory: SavedTrainingTagCategory | null
  suggestedTrainingMode: string | null
  itemType: SavedTrainingItemType
  title: string
  content: string
  audioReferenceUrl: string | null
  learnerAudioUrl: string | null
  metadataJson: string | null
  createdAt: string
}

function mapRow(r: {
  Id: string
  UserId: string
  SourceSessionId: string
  SourceTurnId: string | null
  SourceScenarioId?: string | null
  LearnerOriginalSentence?: string | null
  ImprovedSentence?: string | null
  TagCategory?: string | null
  SuggestedTrainingMode?: string | null
  ItemType: string
  Title: string
  Content: string
  AudioReferenceUrl: string | null
  LearnerAudioUrl: string | null
  MetadataJson: string | null
  CreatedAt: Date
}): SavedTrainingItemRow {
  return {
    id: r.Id,
    userId: r.UserId,
    sourceSessionId: r.SourceSessionId,
    sourceTurnId: r.SourceTurnId,
    sourceScenarioId: r.SourceScenarioId ?? null,
    learnerOriginalSentence: r.LearnerOriginalSentence ?? null,
    improvedSentence: r.ImprovedSentence ?? null,
    tagCategory: (r.TagCategory as SavedTrainingTagCategory | null) ?? null,
    suggestedTrainingMode: r.SuggestedTrainingMode ?? null,
    itemType: r.ItemType as SavedTrainingItemType,
    title: r.Title,
    content: r.Content,
    audioReferenceUrl: r.AudioReferenceUrl,
    learnerAudioUrl: r.LearnerAudioUrl,
    metadataJson: r.MetadataJson,
    createdAt: r.CreatedAt.toISOString(),
  }
}

export async function insertSavedTrainingItem(
  pool: ConnectionPool,
  input: {
    userInternalId: string
    sourceSessionId: string
    sourceTurnId?: string | null
    sourceScenarioId?: string | null
    learnerOriginalSentence?: string | null
    improvedSentence?: string | null
    tagCategory?: SavedTrainingTagCategory | null
    suggestedTrainingMode?: string | null
    itemType: SavedTrainingItemType
    title: string
    content: string
    audioReferenceUrl?: string | null
    learnerAudioUrl?: string | null
    metadata?: Record<string, unknown> | null
  }
): Promise<SavedTrainingItemRow> {
  const id = newId()
  const meta = input.metadata ? JSON.stringify(input.metadata) : null
  await pool
    .request()
    .input('id', id)
    .input('userId', input.userInternalId)
    .input('sourceSessionId', input.sourceSessionId)
    .input('sourceTurnId', input.sourceTurnId ?? null)
    .input('sourceScenarioId', input.sourceScenarioId ?? null)
    .input('learnerOriginalSentence', sql.NVarChar(sql.MAX), input.learnerOriginalSentence ?? null)
    .input('improvedSentence', sql.NVarChar(sql.MAX), input.improvedSentence ?? null)
    .input('tagCategory', input.tagCategory ?? null)
    .input('suggestedTrainingMode', input.suggestedTrainingMode ?? null)
    .input('itemType', input.itemType)
    .input('title', input.title.slice(0, 512))
    .input('content', sql.NVarChar(sql.MAX), input.content)
    .input('audioReferenceUrl', input.audioReferenceUrl ?? null)
    .input('learnerAudioUrl', input.learnerAudioUrl ?? null)
    .input('metadataJson', sql.NVarChar(sql.MAX), meta)
    .query(`
      INSERT INTO dbo.SavedTrainingItems (
        Id, UserId, SourceSessionId, SourceTurnId, SourceScenarioId,
        LearnerOriginalSentence, ImprovedSentence, TagCategory, SuggestedTrainingMode,
        ItemType, Title, Content, AudioReferenceUrl, LearnerAudioUrl, MetadataJson, CreatedAt
      )
      VALUES (
        @id, @userId, @sourceSessionId, @sourceTurnId, @sourceScenarioId,
        @learnerOriginalSentence, @improvedSentence, @tagCategory, @suggestedTrainingMode,
        @itemType, @title, @content, @audioReferenceUrl, @learnerAudioUrl, @metadataJson, SYSUTCDATETIME()
      )
    `)
  const r = await pool.request().input('id', id).query(`
    SELECT Id, UserId, SourceSessionId, SourceTurnId, SourceScenarioId,
           LearnerOriginalSentence, ImprovedSentence, TagCategory, SuggestedTrainingMode,
           ItemType, Title, Content, AudioReferenceUrl, LearnerAudioUrl, MetadataJson, CreatedAt
    FROM dbo.SavedTrainingItems WHERE Id = @id
  `)
  return mapRow(r.recordset[0])
}

export async function listSavedTrainingItemsForUser(
  pool: ConnectionPool,
  params: {
    userInternalId: string
    limit?: number
    tagCategory?: SavedTrainingTagCategory | null
    itemType?: SavedTrainingItemType | null
  }
): Promise<SavedTrainingItemRow[]> {
  const limit = params.limit ?? 100
  const req = pool
    .request()
    .input('userId', params.userInternalId)
    .input('limit', sql.Int, limit)
  let tagClause = ''
  if (params.tagCategory) {
    req.input('tagCategory', params.tagCategory)
    tagClause = 'AND TagCategory = @tagCategory'
  }
  let typeClause = ''
  if (params.itemType) {
    req.input('itemType', params.itemType)
    typeClause = 'AND ItemType = @itemType'
  }
  const r = await req.query(`
      SELECT TOP (@limit) Id, UserId, SourceSessionId, SourceTurnId, SourceScenarioId,
             LearnerOriginalSentence, ImprovedSentence, TagCategory, SuggestedTrainingMode,
             ItemType, Title, Content, AudioReferenceUrl, LearnerAudioUrl, MetadataJson, CreatedAt
      FROM dbo.SavedTrainingItems
      WHERE UserId = @userId
      ${tagClause}
      ${typeClause}
      ORDER BY CreatedAt DESC
    `)
  return r.recordset.map(mapRow)
}
