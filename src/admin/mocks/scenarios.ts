export interface MockScenario {
  id: string
  name: string
  category: string
  cefr_range: string
  artifact_count: number
  published_count: number
}

export const MOCK_SCENARIOS: MockScenario[] = [
  { id: 'cafe', name: 'Café', category: 'Food & drink', cefr_range: 'A1–B1', artifact_count: 8, published_count: 4 },
  { id: 'supermarket_shop', name: 'Supermarket / shop', category: 'Shopping', cefr_range: 'A1–B1', artifact_count: 6, published_count: 3 },
  { id: 'doctor_visit', name: 'Doctor visit', category: 'Health', cefr_range: 'A2–B2', artifact_count: 5, published_count: 2 },
  { id: 'office_introduction', name: 'Office introduction', category: 'Work', cefr_range: 'A2–B2', artifact_count: 4, published_count: 2 },
]
