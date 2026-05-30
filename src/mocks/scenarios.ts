/**
 * Scenario catalog — backed by demo-data (happy-path by default).
 */

import type { DemoScenario } from '@/demo-data'
import { DEMO_SCENARIOS } from '@/demo-data'

export type Scenario = DemoScenario

export const MOCK_SCENARIOS: Scenario[] = DEMO_SCENARIOS
