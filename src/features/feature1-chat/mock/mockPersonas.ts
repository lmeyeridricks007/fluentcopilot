import type { PersonaConfig } from '../types'

export const TRAIN_STATION_PERSONA_ID = 'ns-station-assistant'

export const MOCK_PERSONAS: Record<string, PersonaConfig> = {
  [TRAIN_STATION_PERSONA_ID]: {
    id: TRAIN_STATION_PERSONA_ID,
    displayName: 'NS assistant',
    role: 'Train station help desk',
    avatarEmoji: '🚆',
    tone: 'concise, polite, practical Dutch public-transport style',
    introLine:
      'Goedemiddag. Waarmee kan ik u helpen? Ik kan het perron, de vertrektijd of overstappen voor u nakijken.',
  },
}

export function getPersona(id: string): PersonaConfig {
  const p = MOCK_PERSONAS[id]
  if (!p) throw new Error(`Unknown persona: ${id}`)
  return p
}
