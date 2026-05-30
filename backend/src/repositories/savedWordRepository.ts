import type sql from 'mssql'
import type { SavedWordItem } from '../models/contracts'
import { newId } from '../shared/ids'

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

function mapRow(r: {
  Id: string
  UserId: string
  Text: string
  NormalizedText: string
  Meaning: string | null
  SourceType: string
  SourceThreadId: string | null
  SourceMessageId: string | null
  SourceScenarioId: string | null
  ExampleSentence: string | null
  CreatedAt: Date
}): SavedWordItem {
  return {
    id: r.Id,
    userId: r.UserId,
    text: r.Text,
    normalizedText: r.NormalizedText,
    meaning: r.Meaning,
    sourceType: r.SourceType,
    sourceThreadId: r.SourceThreadId,
    sourceMessageId: r.SourceMessageId,
    sourceScenarioId: r.SourceScenarioId,
    exampleSentence: r.ExampleSentence,
    createdAt: r.CreatedAt.toISOString(),
  }
}

export async function insertSavedWord(
  pool: sql.ConnectionPool,
  input: {
    userInternalId: string
    text: string
    meaning?: string | null
    sourceType: string
    sourceThreadId?: string | null
    sourceMessageId?: string | null
    sourceScenarioId?: string | null
    exampleSentence?: string | null
  }
): Promise<SavedWordItem> {
  const id = newId()
  const norm = normalize(input.text)
  await pool
    .request()
    .input('id', id)
    .input('userId', input.userInternalId)
    .input('text', input.text.trim())
    .input('normalizedText', norm)
    .input('meaning', input.meaning ?? null)
    .input('sourceType', input.sourceType)
    .input('sourceThreadId', input.sourceThreadId ?? null)
    .input('sourceMessageId', input.sourceMessageId ?? null)
    .input('sourceScenarioId', input.sourceScenarioId ?? null)
    .input('exampleSentence', input.exampleSentence ?? null)
    .query(`
      INSERT INTO dbo.SavedWords (Id, UserId, Text, NormalizedText, Meaning, SourceType, SourceThreadId, SourceMessageId, SourceScenarioId, ExampleSentence)
      VALUES (@id, @userId, @text, @normalizedText, @meaning, @sourceType, @sourceThreadId, @sourceMessageId, @sourceScenarioId, @exampleSentence)
    `)
  const r = await pool.request().input('id', id).query(`
    SELECT Id, UserId, Text, NormalizedText, Meaning, SourceType, SourceThreadId, SourceMessageId, SourceScenarioId, ExampleSentence, CreatedAt
    FROM dbo.SavedWords WHERE Id = @id
  `)
  return mapRow(r.recordset[0])
}
