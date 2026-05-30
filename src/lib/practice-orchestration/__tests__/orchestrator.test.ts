import { describe, it, expect } from 'vitest'
import { runPracticeConversationTurn } from '@/lib/practice-orchestration/conversationOrchestrator'
import { detectRecovery } from '@/lib/practice-orchestration/recoveryPolicy'
import { buildPracticeScenarioPrompt } from '@/lib/practice-orchestration/scenarioPromptBuilder'
import { getScenario } from '@/ai-conversation-engine/config/scenarios'
import { ensureCatalogScenariosRegistered } from '@/lib/practice/conversation/ensureCatalogScenarios'

describe('recoveryPolicy', () => {
  it('detects English-only lean input', () => {
    const r = detectRecovery({ userMessage: 'hello' })
    expect(r.kind).toBe('english_input')
    expect(r.scriptedAssistantNl).toMatch(/Nederlands/i)
  })

  it('detects ik weet het niet', () => {
    const r = detectRecovery({ userMessage: 'Ik weet het niet' })
    expect(r.kind).toBe('dont_know')
  })
})

describe('runPracticeConversationTurn', () => {
  it('returns scenario-styled Dutch for café order', async () => {
    ensureCatalogScenariosRegistered()
    const out = await runPracticeConversationTurn({
      scenarioId: 'cafe',
      mode: 'semi_guided',
      userMessage: 'Mag ik een koffie, alstublieft?',
      priorUserTurns: 0,
      messageHistory: [],
      debug: false,
    })
    expect(out.assistantNl.length).toBeGreaterThan(5)
    expect(out.systemPromptForProvider).toContain('Practice orchestration layer')
    expect(out.listeningHints).toBeDefined()
  })

  it('applies recovery over mock for short input', async () => {
    const out = await runPracticeConversationTurn({
      scenarioId: 'cafe',
      mode: 'free',
      userMessage: 'a',
      priorUserTurns: 0,
      messageHistory: [],
    })
    expect(out.feedbackSignals.recovery).not.toBe('none')
  })
})

describe('buildPracticeScenarioPrompt', () => {
  it('includes guardrails and persona', () => {
    ensureCatalogScenariosRegistered()
    const ctx = getScenario('cafe')
    const { systemPrompt } = buildPracticeScenarioPrompt({
      ctx,
      scenarioId: 'cafe',
      mode: 'free',
      difficulty: 'a2_mid',
      turnObjective: 'Test objective',
    })
    expect(systemPrompt).toMatch(/CEFR target: A2/i)
    expect(systemPrompt).toMatch(/barista|Role:/i)
  })
})
