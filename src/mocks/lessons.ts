/**
 * Lesson catalog and recommended — backed by demo-data (happy-path by default).
 * Switch scenario via getDemoDataset('at-cap') or localStorage 'demoScenario' + reload.
 */

import type { DemoLesson } from '@/demo-data'
import { DEMO_LESSONS, DEMO_RECOMMENDED } from '@/demo-data'

export type Lesson = DemoLesson

export const MOCK_LESSONS: Lesson[] = DEMO_LESSONS
export const MOCK_RECOMMENDED: Lesson[] = DEMO_RECOMMENDED
