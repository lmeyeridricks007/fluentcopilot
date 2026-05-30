/**
 * Demo data entry point — scenario-based datasets for local development.
 *
 * Usage:
 *   const data = getDemoDataset('happy-path')
 *   // data.lessons, data.progress, data.scenarios, data.lessonProgress, data.usage
 *
 * To switch scenario at runtime (e.g. dev panel): set localStorage 'demoScenario'
 * to a DemoScenarioId and reload, or call getDemoDataset with that id.
 */

import type { DemoDataset, DemoScenarioId } from './types'
import { buildScenarioDataset } from './scenarios'

export { buildScenarioDataset } from './scenarios'

const DEFAULT_SCENARIO: DemoScenarioId = 'happy-path'

export function getDemoScenarioFromStorage(): DemoScenarioId | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('demoScenario')
  if (!stored) return null
  const valid: DemoScenarioId[] = ['happy-path', 'new-user', 'at-cap', 'trial', 'premium', 'power-user', 'edge-case']
  return valid.includes(stored as DemoScenarioId) ? (stored as DemoScenarioId) : null
}

export function getDemoDataset(scenarioId?: DemoScenarioId | null): DemoDataset {
  const id = scenarioId ?? getDemoScenarioFromStorage() ?? DEFAULT_SCENARIO
  return buildScenarioDataset(id)
}

// Default dataset for app bootstrap. Uses scenario from localStorage if set (e.g. after scenario switcher + reload).
const defaultDataset = buildScenarioDataset(getDemoScenarioFromStorage() ?? DEFAULT_SCENARIO)

export const DEMO_LESSONS = defaultDataset.lessons
export const DEMO_RECOMMENDED = defaultDataset.recommended
export const DEMO_PROGRESS = defaultDataset.progress
export const DEMO_SCENARIOS = defaultDataset.scenarios
export const DEMO_LESSON_PROGRESS = defaultDataset.lessonProgress
export const DEMO_USAGE = defaultDataset.usage
export const DEMO_ACHIEVEMENTS = defaultDataset.achievements

export type {
  DemoDataset,
  DemoScenarioId,
  DemoLesson,
  DemoProgressSummary,
  DemoScenario,
  DemoLessonProgress,
  DemoUsageCounts,
  DemoAchievement,
} from './types'
