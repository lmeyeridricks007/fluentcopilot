/**
 * AI Conversation Engine — prompt template tests.
 */

import { describe, it, expect } from 'vitest'
import {
  buildSystemPrompt,
  defaultConversationTemplate,
  parseTutorResponse,
} from '../prompts/templates.js'
import type { ScenarioContext } from '../types/scenario.js'

const minimalScenario: ScenarioContext = {
  scenario_id: 'cafe',
  scenario_name: 'Café',
  setting: 'A café',
  goal: 'Order drinks',
  key_phrases: [{ phrase: 'Mag ik een koffie?' }],
  ai_roleplay_instructions: {
    role: 'You are a barista.',
    setting: 'Customer ordering.',
    tone: 'friendly',
    language: 'Dutch only',
  },
}

describe('buildSystemPrompt', () => {
  it('includes scenario name and goal', () => {
    const out = buildSystemPrompt(
      defaultConversationTemplate,
      minimalScenario,
      'A1',
      'nl-NL'
    )
    expect(out).toContain('Café')
    expect(out).toContain('Order drinks')
    expect(out).toContain('A1')
    expect(out).toContain('Dutch')
  })

  it('includes constraints', () => {
    const out = buildSystemPrompt(
      defaultConversationTemplate,
      minimalScenario,
      'B1',
      'nl-NL'
    )
    expect(out).toContain('Use Dutch only')
  })
})

describe('parseTutorResponse', () => {
  it('extracts [CORRECTION: ...] from end of response', () => {
    const raw = 'Graag! Dat is €2,50.\n[CORRECTION: Use "alstublieft" at the end.]'
    const { content, correction } = parseTutorResponse(raw)
    expect(content).toBe('Graag! Dat is €2,50.')
    expect(correction).toBe('Use "alstublieft" at the end.')
  })

  it('returns full content when no correction', () => {
    const raw = 'Goed zo! Wilt u er iets bij?'
    const { content, correction } = parseTutorResponse(raw)
    expect(content).toBe(raw)
    expect(correction).toBeUndefined()
  })
})
