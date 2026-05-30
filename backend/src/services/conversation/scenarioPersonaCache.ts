/**
 * Short-TTL in-memory cache for static scenario/persona rows on hot conversation paths.
 * Safe: definitions change rarely; cold Azure Function instances reset the map.
 */
import type sql from 'mssql'
import type { PersonaConfig, ScenarioConfig } from '../../models/contracts'
import * as personaRepo from '../../repositories/personaRepository'
import * as scenarioRepo from '../../repositories/scenarioRepository'

const DEFAULT_TTL_MS = 60_000

function ttlMs(): number {
  const n = Number.parseInt(process.env.SCENARIO_PERSONA_CACHE_TTL_MS ?? '', 10)
  if (Number.isFinite(n) && n >= 5000 && n <= 600_000) return n
  return DEFAULT_TTL_MS
}

type CacheEntry<T> = { loadedAt: number; value: T }

const scenarioCache = new Map<string, CacheEntry<ScenarioConfig | null>>()
const personaCache = new Map<string, CacheEntry<PersonaConfig | null>>()

export async function getScenarioByIdCached(
  pool: sql.ConnectionPool,
  scenarioId: string
): Promise<ScenarioConfig | null> {
  const now = Date.now()
  const hit = scenarioCache.get(scenarioId)
  if (hit && now - hit.loadedAt < ttlMs()) {
    return hit.value
  }
  const value = await scenarioRepo.getScenarioById(pool, scenarioId)
  scenarioCache.set(scenarioId, { loadedAt: now, value })
  return value
}

export async function getPersonaByIdCached(
  pool: sql.ConnectionPool,
  personaId: string
): Promise<PersonaConfig | null> {
  const now = Date.now()
  const hit = personaCache.get(personaId)
  if (hit && now - hit.loadedAt < ttlMs()) {
    return hit.value
  }
  const value = await personaRepo.getPersonaById(pool, personaId)
  personaCache.set(personaId, { loadedAt: now, value })
  return value
}
