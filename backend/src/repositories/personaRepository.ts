import type sql from 'mssql'
import type { PersonaConfig } from '../models/contracts'
import { ApiError } from '../shared/errors'

function mapRow(r: {
  Id: string
  Slug: string
  DisplayName: string
  RoleDescription: string
  Tone: string
  StyleRulesJson: string
  AvatarKey: string | null
  IntroLine: string
}): PersonaConfig {
  return {
    id: r.Id,
    slug: r.Slug,
    displayName: r.DisplayName,
    role: r.RoleDescription,
    tone: r.Tone,
    styleRules: JSON.parse(r.StyleRulesJson) as string[],
    avatarKey: r.AvatarKey,
    introLine: r.IntroLine,
  }
}

export async function getPersonaById(pool: sql.ConnectionPool, id: string): Promise<PersonaConfig> {
  const r = await pool.request().input('id', id).query(`
    SELECT TOP 1 Id, Slug, DisplayName, RoleDescription, Tone, StyleRulesJson, AvatarKey, IntroLine
    FROM dbo.PersonaDefinitions WHERE Id = @id AND IsActive = 1
  `)
  const row = r.recordset[0]
  if (!row) throw new ApiError(404, 'NOT_FOUND', `Persona not found: ${id}`)
  return mapRow(row)
}
