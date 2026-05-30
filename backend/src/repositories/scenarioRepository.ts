import type sql from 'mssql'
import type { ScenarioConfig } from '../models/contracts'
import { ApiError } from '../shared/errors'

function mapRow(r: {
  Id: string
  Slug: string
  Title: string
  Description: string
  UserRole: string
  GoalsJson: string
  StarterSuggestionsJson: string
  DifficultyBand: string
  TagsJson: string
  AllowedModesJson: string
  OpeningMessage: string | null
}): ScenarioConfig {
  return {
    id: r.Id,
    slug: r.Slug,
    title: r.Title,
    description: r.Description,
    userRole: r.UserRole,
    goals: JSON.parse(r.GoalsJson) as string[],
    starterSuggestions: JSON.parse(r.StarterSuggestionsJson) as string[],
    difficultyBand: r.DifficultyBand,
    tags: JSON.parse(r.TagsJson) as string[],
    allowedModes: JSON.parse(r.AllowedModesJson) as ScenarioConfig['allowedModes'],
    openingMessage: r.OpeningMessage,
  }
}

export async function getScenarioBySlug(pool: sql.ConnectionPool, slug: string): Promise<ScenarioConfig> {
  const r = await pool.request().input('slug', slug).query(`
    SELECT TOP 1 Id, Slug, Title, Description, UserRole, GoalsJson, StarterSuggestionsJson,
           DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
    FROM dbo.ScenarioDefinitions WHERE Slug = @slug AND IsActive = 1
  `)
  const row = r.recordset[0]
  if (!row) throw new ApiError(404, 'NOT_FOUND', `Scenario not found: ${slug}`)
  return mapRow(row)
}

export async function getScenarioById(pool: sql.ConnectionPool, id: string): Promise<ScenarioConfig> {
  const r = await pool.request().input('id', id).query(`
    SELECT TOP 1 Id, Slug, Title, Description, UserRole, GoalsJson, StarterSuggestionsJson,
           DifficultyBand, TagsJson, AllowedModesJson, OpeningMessage
    FROM dbo.ScenarioDefinitions WHERE Id = @id AND IsActive = 1
  `)
  const row = r.recordset[0]
  if (!row) throw new ApiError(404, 'NOT_FOUND', `Scenario not found: ${id}`)
  return mapRow(row)
}
