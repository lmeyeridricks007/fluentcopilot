import type { ScenarioConfig } from '../types'
import { TRAIN_STATION_PERSONA_ID } from './mockPersonas'

export const TRAIN_STATION_SCENARIO_ID = 'train-station'

export const MOCK_SCENARIOS: Record<string, ScenarioConfig> = {
  [TRAIN_STATION_SCENARIO_ID]: {
    id: TRAIN_STATION_SCENARIO_ID,
    slug: TRAIN_STATION_SCENARIO_ID,
    title: 'Train station',
    description:
      'You are at a Dutch station counter or info point. Ask practical questions about your train in clear Dutch.',
    userRole: 'Traveller',
    personaId: TRAIN_STATION_PERSONA_ID,
    goals: [
      'Ask which platform your train leaves from',
      'Confirm one detail (time, delay, destination, or transfer)',
      'Close politely',
    ],
    starterSuggestions: ['Welk perron is het?', 'Is de trein op tijd?', 'Dank u wel.'],
    difficulty: 'A2',
    tags: ['travel', 'NS', 'real-life'],
  },
}

export function getScenario(id: string): ScenarioConfig {
  const s = MOCK_SCENARIOS[id]
  if (!s) throw new Error(`Unknown scenario: ${id}`)
  return s
}
