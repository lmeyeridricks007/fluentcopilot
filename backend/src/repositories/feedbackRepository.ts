import type sql from 'mssql'
import type { FeedbackItem } from '../models/contracts'
import { newId } from '../shared/ids'

function mapFb(r: {
  Id: string
  ThreadId: string
  LinkedMessageId: string
  Category: string
  OriginalText: string
  CorrectedText: string
  Explanation: string
  Severity: string
  CreatedAt: Date
}): FeedbackItem {
  return {
    id: r.Id,
    threadId: r.ThreadId,
    linkedMessageId: r.LinkedMessageId,
    category: r.Category,
    originalText: r.OriginalText,
    correctedText: r.CorrectedText,
    explanation: r.Explanation,
    severity: r.Severity,
    createdAt: r.CreatedAt.toISOString(),
  }
}

export async function insertFeedback(
  pool: sql.ConnectionPool,
  input: {
    threadId: string
    linkedMessageId: string
    category: string
    originalText: string
    correctedText: string
    explanation: string
    severity?: string
  }
): Promise<FeedbackItem> {
  const id = newId()
  await pool
    .request()
    .input('id', id)
    .input('threadId', input.threadId)
    .input('linkedMessageId', input.linkedMessageId)
    .input('category', input.category)
    .input('originalText', input.originalText)
    .input('correctedText', input.correctedText)
    .input('explanation', input.explanation)
    .input('severity', input.severity ?? 'info')
    .query(`
      INSERT INTO dbo.FeedbackItems (Id, ThreadId, LinkedMessageId, Category, OriginalText, CorrectedText, Explanation, Severity)
      VALUES (@id, @threadId, @linkedMessageId, @category, @originalText, @correctedText, @explanation, @severity)
    `)
  const r = await pool.request().input('id', id).query(`
    SELECT Id, ThreadId, LinkedMessageId, Category, OriginalText, CorrectedText, Explanation, Severity, CreatedAt
    FROM dbo.FeedbackItems WHERE Id = @id
  `)
  return mapFb(r.recordset[0])
}

export async function listFeedbackForThread(pool: sql.ConnectionPool, threadId: string): Promise<FeedbackItem[]> {
  const r = await pool.request().input('threadId', threadId).query(`
    SELECT Id, ThreadId, LinkedMessageId, Category, OriginalText, CorrectedText, Explanation, Severity, CreatedAt
    FROM dbo.FeedbackItems WHERE ThreadId = @threadId ORDER BY CreatedAt ASC
  `)
  return r.recordset.map(mapFb)
}

export async function findFeedbackByLinkedMessageId(
  pool: sql.ConnectionPool,
  threadId: string,
  linkedMessageId: string
): Promise<FeedbackItem | null> {
  const r = await pool
    .request()
    .input('threadId', threadId)
    .input('linkedMessageId', linkedMessageId)
    .query(`
    SELECT TOP 1 Id, ThreadId, LinkedMessageId, Category, OriginalText, CorrectedText, Explanation, Severity, CreatedAt
    FROM dbo.FeedbackItems WHERE ThreadId = @threadId AND LinkedMessageId = @linkedMessageId
    ORDER BY CreatedAt DESC
  `)
  const row = r.recordset[0]
  return row ? mapFb(row) : null
}
