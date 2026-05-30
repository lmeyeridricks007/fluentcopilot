import { describe, expect, it } from 'vitest'
import type { ConversationMessage, PersonaConfig } from '../../models/contracts'
import {
  applyScenarioRuntimeConfig,
  buildOrderingFoodScenario,
  dutchPersonaForOrderingFoodIfNeeded,
  sanitizeOrderingFoodAssistantMessages,
  stripLeadingEnglishClauseFromOrderingFoodAssistantLine,
} from './orderingFoodScenario'

describe('buildOrderingFoodScenario', () => {
  it('supports explicit user overrides', () => {
    const scenario = buildOrderingFoodScenario({
      level: 'A2',
      subType: 'restaurant',
      variation: 'dietary',
      random: () => 0.2,
    })

    expect(scenario.subType).toBe('restaurant')
    expect(scenario.variation).toBe('dietary_request')
    expect(scenario.goals).toHaveLength(4)
    expect(scenario.goals.find((goal) => goal.id === 'ask_about_ingredients')?.required).toBe(true)
    expect(scenario.weights.make_clear_order).toBe(40)
    expect(scenario.assistantBehavior.register).toMatch(/formeel|formal/i)
    expect(['friendly', 'neutral', 'slightly rushed']).toContain(scenario.assistantBehavior.tone)
    expect(scenario.assistantBehavior.openingVariants?.length).toBeGreaterThan(1)
    expect(scenario.assistantBehavior.recommendationStyle).toMatch(/aanbeveling|concrete|breed|vage/i)
  })

  it('randomizes subtype and variation when no override is supplied', () => {
    const scenario = buildOrderingFoodScenario({
      level: 'B1',
      random: () => 0.95,
    })

    expect(scenario.subType).toBe('takeaway')
    expect(scenario.variation).toBe('recommendation')
    expect(scenario.difficultyAdjustments.learnerLevel).toBe('B1')
    expect(scenario.context).toMatch(/aanrad|aanbeveling/i)
    expect(scenario.openingLine).toBeTruthy()
    expect(scenario.assistantBehavior.frictionChance).toMatch(/18%|Around 18%/i)
  })
})

describe('applyScenarioRuntimeConfig', () => {
  it('hydrates the prompt-facing scenario fields without changing the slug', () => {
    const runtime = buildOrderingFoodScenario({
      level: 'A1',
      subType: 'cafe',
      variation: 'simple',
      random: () => 0.1,
    })

    const scenario = applyScenarioRuntimeConfig(
      {
        id: '1',
        slug: 'ordering_food',
        title: 'Ordering food / drinks',
        description: 'base',
        userRole: 'Customer',
        goals: ['base'],
        starterSuggestions: ['base'],
        difficultyBand: 'A2',
        tags: ['food'],
        allowedModes: ['guided', 'free'],
        openingMessage: null,
      },
      runtime
    )

    expect(scenario.slug).toBe('ordering_food')
    expect(scenario.title).toBe(runtime.title)
    expect(scenario.userRole).toBe('Klant')
    expect(scenario.description).toBe(runtime.context)
    expect(scenario.goals).toEqual(runtime.goals.map((goal) => goal.label))
    expect(scenario.runtimeConfig?.subType).toBe('cafe')
  })
})

describe('stripLeadingEnglishClauseFromOrderingFoodAssistantLine', () => {
  it('removes common English café prefix before Dutch', () => {
    expect(
      stripLeadingEnglishClauseFromOrderingFoodAssistantLine(
        'Hi, what can I get you? Wat mag het voor u zijn?'
      )
    ).toBe('Wat mag het voor u zijn?')
  })

  it('leaves Dutch-only lines unchanged', () => {
    expect(stripLeadingEnglishClauseFromOrderingFoodAssistantLine('Hallo, wat mag het voor u zijn?')).toBe(
      'Hallo, wat mag het voor u zijn?'
    )
  })
})

describe('sanitizeOrderingFoodAssistantMessages', () => {
  it('cleans assistant rows in a message list', () => {
    const messages: ConversationMessage[] = [
      {
        id: '1',
        threadId: 't',
        sender: 'assistant',
        messageType: 'text',
        content: 'Hi, what can I get you? Wat mag het voor u zijn?',
        metadata: null,
        createdAt: new Date().toISOString(),
      },
    ]
    const out = sanitizeOrderingFoodAssistantMessages(messages)
    expect(out[0].content).toBe('Wat mag het voor u zijn?')
  })
})

describe('dutchPersonaForOrderingFoodIfNeeded', () => {
  it('replaces legacy English display name for food staff', () => {
    const persona: PersonaConfig = {
      id: 'p',
      slug: 'food_service_staff',
      displayName: 'Food service staff',
      role: 'Staff',
      tone: 'friendly',
      styleRules: [],
      avatarKey: null,
      introLine: 'Hallo',
    }
    const out = dutchPersonaForOrderingFoodIfNeeded('ordering_food', persona)
    expect(out.displayName).toBe('Medewerker bediening')
  })

  it('does not change other scenarios', () => {
    const persona: PersonaConfig = {
      id: 'p',
      slug: 'food_service_staff',
      displayName: 'Food service staff',
      role: 'Staff',
      tone: 'friendly',
      styleRules: [],
      avatarKey: null,
      introLine: 'Hallo',
    }
    expect(dutchPersonaForOrderingFoodIfNeeded('train-station', persona).displayName).toBe('Food service staff')
  })
})
