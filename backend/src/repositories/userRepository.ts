import type sql from 'mssql'
import { newId } from '../shared/ids'

export async function ensureUser(pool: sql.ConnectionPool, externalId: string): Promise<string> {
  const existing = await pool
    .request()
    .input('externalId', externalId)
    .query<{ Id: string }>(`SELECT Id FROM dbo.Users WHERE ExternalId = @externalId`)
  if (existing.recordset[0]) return existing.recordset[0].Id

  const id = newId()
  await pool
    .request()
    .input('id', id)
    .input('externalId', externalId)
    .query(`INSERT INTO dbo.Users (Id, ExternalId) VALUES (@id, @externalId)`)
  return id
}

export async function getUserInternalId(pool: sql.ConnectionPool, externalId: string): Promise<string | null> {
  const r = await pool
    .request()
    .input('externalId', externalId)
    .query<{ Id: string }>(`SELECT Id FROM dbo.Users WHERE ExternalId = @externalId`)
  return r.recordset[0]?.Id ?? null
}
