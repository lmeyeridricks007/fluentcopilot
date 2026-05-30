import sql from 'mssql'
import type { ConnectionPool } from 'mssql'
import type { ConversationMessage, MessageSender, MessageType } from '../models/contracts'
import { newId } from '../shared/ids'

function mapMsg(r: {
  Id: string
  ThreadId: string
  SenderType: string
  MessageType: string
  Content: string
  MetadataJson: string | null
  CreatedAt: Date
}): ConversationMessage {
  return {
    id: r.Id,
    threadId: r.ThreadId,
    sender: r.SenderType as MessageSender,
    messageType: r.MessageType as MessageType,
    content: r.Content,
    metadata: r.MetadataJson ? (JSON.parse(r.MetadataJson) as Record<string, unknown>) : null,
    createdAt: r.CreatedAt.toISOString(),
  }
}

export async function insertMessage(
  pool: ConnectionPool,
  input: {
    threadId: string
    sender: MessageSender
    messageType: MessageType
    content: string
    metadata?: Record<string, unknown> | null
  }
): Promise<ConversationMessage> {
  const id = newId()
  const meta = input.metadata ? JSON.stringify(input.metadata) : null
  await pool
    .request()
    .input('id', id)
    .input('threadId', input.threadId)
    .input('sender', input.sender)
    .input('messageType', input.messageType)
    .input('content', input.content)
    .input('metadataJson', meta)
    .query(`
      INSERT INTO dbo.ConversationMessages (Id, ThreadId, SenderType, MessageType, Content, MetadataJson)
      VALUES (@id, @threadId, @sender, @messageType, @content, @metadataJson)
    `)
  const r = await pool.request().input('id', id).query(`
    SELECT Id, ThreadId, SenderType, MessageType, Content, MetadataJson, CreatedAt
    FROM dbo.ConversationMessages WHERE Id = @id
  `)
  return mapMsg(r.recordset[0])
}

export async function listMessagesForThread(
  pool: ConnectionPool,
  threadId: string,
  limit = 200
): Promise<ConversationMessage[]> {
  const r = await pool
    .request()
    .input('threadId', threadId)
    .input('limit', sql.Int, limit)
    .query(`
    SELECT TOP (@limit) Id, ThreadId, SenderType, MessageType, Content, MetadataJson, CreatedAt
    FROM dbo.ConversationMessages WHERE ThreadId = @threadId ORDER BY CreatedAt ASC
  `)
  return r.recordset.map(mapMsg)
}

export async function listRecentMessagesForThread(
  pool: ConnectionPool,
  threadId: string,
  maxMessages: number
): Promise<ConversationMessage[]> {
  const r = await pool
    .request()
    .input('threadId', threadId)
    .input('max', sql.Int, maxMessages)
    .query(`
    SELECT Id, ThreadId, SenderType, MessageType, Content, MetadataJson, CreatedAt
    FROM (
      SELECT TOP (@max) Id, ThreadId, SenderType, MessageType, Content, MetadataJson, CreatedAt
      FROM dbo.ConversationMessages WHERE ThreadId = @threadId
      ORDER BY CreatedAt DESC
    ) AS recent
    ORDER BY CreatedAt ASC
  `)
  return r.recordset.map(mapMsg)
}

export async function getMessageById(pool: ConnectionPool, messageId: string): Promise<ConversationMessage | null> {
  const r = await pool.request().input('id', messageId).query(`
    SELECT Id, ThreadId, SenderType, MessageType, Content, MetadataJson, CreatedAt
    FROM dbo.ConversationMessages WHERE Id = @id
  `)
  const row = r.recordset[0]
  return row ? mapMsg(row) : null
}

export async function updateMessageMetadata(
  pool: ConnectionPool,
  messageId: string,
  patch: Record<string, unknown>
): Promise<ConversationMessage | null> {
  const existing = await getMessageById(pool, messageId)
  if (!existing) return null
  const meta = { ...(existing.metadata ?? {}), ...patch }
  await pool
    .request()
    .input('id', messageId)
    .input('metadataJson', JSON.stringify(meta))
    .query(`UPDATE dbo.ConversationMessages SET MetadataJson = @metadataJson WHERE Id = @id`)
  return getMessageById(pool, messageId)
}
