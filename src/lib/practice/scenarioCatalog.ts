/**
 * Loaded scenario catalog (content-driven). Validates at module init in dev via parse.
 */
import rawCatalog from '../../../content/practice/catalog/scenarios.json'
import {
  scenarioCatalogBundleSchema,
  type ScenarioCatalogEntry,
  type ScenarioCatalogCategory,
  type ScenarioReadiness,
  type ScenarioSkillFocus,
} from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import { practiceConversationModeSchema, type PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'

const bundle = scenarioCatalogBundleSchema.parse(rawCatalog)

export const SCENARIO_CATALOG_VERSION = bundle.version

export function getScenarioCatalogEntries(): ScenarioCatalogEntry[] {
  return bundle.scenarios
}

export function getScenarioCatalogEntry(id: string): ScenarioCatalogEntry | undefined {
  return bundle.scenarios.find((s) => s.id === id)
}

/** Category labels for UI (single source for browse IA). */
export const CATALOG_CATEGORY_LABELS: Record<ScenarioCatalogCategory, { title: string; short: string }> = {
  food: { title: 'Food', short: 'Food & shops' },
  work: { title: 'Work', short: 'Work' },
  health: { title: 'Health', short: 'Health' },
  municipality: { title: 'Municipality', short: 'Admin' },
  housing: { title: 'Housing', short: 'Housing' },
  transport: { title: 'Transport', short: 'Transport' },
  social: { title: 'Social', short: 'Social' },
  problem_solving: { title: 'Problem solving', short: 'Problems' },
  appointments: { title: 'Appointments', short: 'Appointments' },
}

export const READINESS_LABELS: Record<ScenarioReadiness, string> = {
  beginner_friendly: 'Beginner-friendly',
  a2_1: 'A2.1',
  a2_2: 'A2.2',
  near_b1: 'Near B1',
  confident_practice: 'Confident practice',
}

export const SKILL_FOCUS_LABELS: Record<ScenarioSkillFocus, string> = {
  speaking: 'Speaking',
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  conversation_repair: 'Conversation repair',
  polite_requests: 'Polite requests',
  clarification: 'Clarification',
  fluency: 'Fluency',
  workplace_register: 'Workplace register',
  housing_register: 'Housing register',
  requests: 'Requests',
}

export const MODE_LABELS: Record<PracticeConversationMode, string> = {
  guided: 'Guided',
  semi_guided: 'Semi-guided',
  free: 'Free',
}

export const practiceConversationModes: PracticeConversationMode[] = practiceConversationModeSchema.options

export function countScenariosByCategory(): Record<ScenarioCatalogCategory, number> {
  const counts: Record<ScenarioCatalogCategory, number> = {
    food: 0,
    work: 0,
    health: 0,
    municipality: 0,
    housing: 0,
    transport: 0,
    social: 0,
    problem_solving: 0,
    appointments: 0,
  }
  for (const s of bundle.scenarios) {
    counts[s.category] += 1
  }
  return counts
}
