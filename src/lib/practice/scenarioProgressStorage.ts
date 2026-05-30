/**
 * Client-side progression: semi after guided, free conversation after solid semi (premium path),
 * and lightweight catalog unlocks. Replace with server profile when accounts exist.
 */
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { PRACTICE_DOMAIN_BASE_KEYS, userScopedLocalKey } from '@/lib/storage/storageKeys'

const SCENARIO_BASE = PRACTICE_DOMAIN_BASE_KEYS.scenarioProgress

function storageKey(): string {
  if (typeof window === 'undefined') return SCENARIO_BASE
  return userScopedLocalKey(SCENARIO_BASE, getRetentionUserId())
}

export type ScenarioProgressRecord = {
  guidedCompletedAt?: string
  semiCompletionCount?: number
  lastSemiOutcome?: string
  lastSemiAt?: string
  /** Premium/trial: practice-gated open conversation for this scenario */
  freeModeUnlockedAt?: string
}

export type GlobalPracticeProgress = {
  /** Distinct scenario ids with at least one qualifying success */
  successfulScenarioIds: string[]
  /** Scenarios unlocked via practice breadth (e.g. premium-only rows) */
  practiceUnlockedScenarioIds: string[]
}

export type ScenarioProgressMap = Record<string, ScenarioProgressRecord>

type StoredShape = {
  scenarios: ScenarioProgressMap
  global: GlobalPracticeProgress
}

function defaultGlobal(): GlobalPracticeProgress {
  return { successfulScenarioIds: [], practiceUnlockedScenarioIds: [] }
}

/** Explicit `userId` for progress snapshot / bootstrap (same key shape as runtime reads). */
export function readScenarioProgressStateForUserId(userId: string): StoredShape {
  if (typeof window === 'undefined') {
    return { scenarios: {}, global: defaultGlobal() }
  }
  try {
    const raw = localStorage.getItem(userScopedLocalKey(SCENARIO_BASE, userId))
    if (!raw) return { scenarios: {}, global: defaultGlobal() }
    const v = JSON.parse(raw) as Partial<StoredShape>
    const scenarios = v.scenarios && typeof v.scenarios === 'object' ? v.scenarios : {}
    const global =
      v.global && Array.isArray(v.global.successfulScenarioIds)
        ? {
            successfulScenarioIds: [...new Set(v.global.successfulScenarioIds)],
            practiceUnlockedScenarioIds: [...new Set(v.global.practiceUnlockedScenarioIds ?? [])],
          }
        : defaultGlobal()
    return { scenarios, global }
  } catch {
    return { scenarios: {}, global: defaultGlobal() }
  }
}

function readShape(): StoredShape {
  if (typeof window === 'undefined') {
    return { scenarios: {}, global: defaultGlobal() }
  }
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return { scenarios: {}, global: defaultGlobal() }
    const v = JSON.parse(raw) as Partial<StoredShape>
    const scenarios = v.scenarios && typeof v.scenarios === 'object' ? v.scenarios : {}
    const global =
      v.global && Array.isArray(v.global.successfulScenarioIds)
        ? {
            successfulScenarioIds: [...new Set(v.global.successfulScenarioIds)],
            practiceUnlockedScenarioIds: [...new Set(v.global.practiceUnlockedScenarioIds ?? [])],
          }
        : defaultGlobal()
    return { scenarios, global }
  } catch {
    return { scenarios: {}, global: defaultGlobal() }
  }
}

function writeShape(s: StoredShape): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(), JSON.stringify(s))
    window.dispatchEvent(new CustomEvent('lt-practice-progress-updated'))
  } catch {
    /* quota */
  }
}

/** Migrate v1 key into v2 shape once */
function migrateV1IfNeeded(): void {
  if (typeof window === 'undefined') return
  try {
    const v1 = localStorage.getItem('language-tutor-scenario-progress-v1')
    if (!v1) return
    const map = JSON.parse(v1) as ScenarioProgressMap
    if (map && typeof map === 'object') {
      writeShape({ scenarios: map, global: defaultGlobal() })
    }
    localStorage.removeItem('language-tutor-scenario-progress-v1')
  } catch {
    /* ignore */
  }
}

migrateV1IfNeeded()

export function markGuidedScenarioComplete(scenarioId: string): void {
  const shape = readShape()
  shape.scenarios[scenarioId] = {
    ...shape.scenarios[scenarioId],
    guidedCompletedAt: new Date().toISOString(),
  }
  writeShape(shape)
}

export function hasCompletedGuidedScenario(scenarioId: string): boolean {
  return Boolean(readShape().scenarios[scenarioId]?.guidedCompletedAt)
}

export function markSemiScenarioComplete(scenarioId: string, outcome: string): void {
  const shape = readShape()
  const prev = shape.scenarios[scenarioId] ?? {}
  shape.scenarios[scenarioId] = {
    ...prev,
    semiCompletionCount: (prev.semiCompletionCount ?? 0) + 1,
    lastSemiOutcome: outcome,
    lastSemiAt: new Date().toISOString(),
  }
  writeShape(shape)
}

export function markFreeModeUnlockedByPractice(scenarioId: string): void {
  const shape = readShape()
  shape.scenarios[scenarioId] = {
    ...shape.scenarios[scenarioId],
    freeModeUnlockedAt: new Date().toISOString(),
  }
  writeShape(shape)
}

export function hasPracticeUnlockedFreeMode(scenarioId: string): boolean {
  return Boolean(readShape().scenarios[scenarioId]?.freeModeUnlockedAt)
}

export function recordQualifyingScenarioSuccess(scenarioId: string): GlobalPracticeProgress {
  const shape = readShape()
  const set = new Set(shape.global.successfulScenarioIds)
  set.add(scenarioId)
  shape.global = {
    ...shape.global,
    successfulScenarioIds: [...set],
  }
  writeShape(shape)
  return shape.global
}

export function addPracticeUnlockedScenario(scenarioId: string): void {
  const shape = readShape()
  const set = new Set(shape.global.practiceUnlockedScenarioIds)
  set.add(scenarioId)
  shape.global = {
    ...shape.global,
    practiceUnlockedScenarioIds: [...set],
  }
  writeShape(shape)
}

export function isPracticeUnlockedScenario(scenarioId: string): boolean {
  return readShape().global.practiceUnlockedScenarioIds.includes(scenarioId)
}

export function getGlobalPracticeProgress(): GlobalPracticeProgress {
  return readShape().global
}
