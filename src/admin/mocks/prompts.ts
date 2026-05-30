export interface MockPromptTemplate {
  code: string
  name: string
  description: string
  versions: { version: number; enabled: boolean; updated_at: string }[]
}

export const MOCK_PROMPTS: MockPromptTemplate[] = [
  { code: 'dialogue_cafe', name: 'Café dialogue', description: 'Generate café ordering dialogue', versions: [{ version: 2, enabled: true, updated_at: '2025-03-01T00:00:00Z' }, { version: 1, enabled: false, updated_at: '2025-02-15T00:00:00Z' }] },
  { code: 'vocab_scenario', name: 'Scenario vocabulary', description: 'Vocabulary for a scenario', versions: [{ version: 1, enabled: true, updated_at: '2025-02-20T00:00:00Z' }] },
]
