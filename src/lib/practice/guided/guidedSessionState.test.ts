import { describe, expect, it } from 'vitest'
import supermarketShopRaw from '../../../../content/practice/guided/scenarios/supermarket_shop.json'
import { guidedScenarioDefinitionSchema } from '@/lib/schemas/practice/guidedScenarioDefinition.schema'
import {
  createGuidedSessionState,
  reduceGuidedSession,
  resolveNextTurnAfterUserReply,
} from '@/lib/practice/guided/guidedSessionState'
import { validateGuidedDefinition } from '@/lib/practice/guided/validateGuidedDefinition'

const supermarketDef = guidedScenarioDefinitionSchema.parse(supermarketShopRaw)

describe('resolveNextTurnAfterUserReply', () => {
  it('routes supermarket follow-up “where is pineapple” to extra turn', () => {
    const turn = supermarketDef.turns.find((t) => t.id === 't_dir')!
    expect(
      resolveNextTurnAfterUserReply(turn, {
        usedCustom: true,
        customNl: 'Dankjewel En waar kan ik die ananas vinden',
      })
    ).toBe('t_followup_where')
  })

  it('keeps simple thanks on supermarket direction turn → closing', () => {
    const turn = supermarketDef.turns.find((t) => t.id === 't_dir')!
    expect(
      resolveNextTurnAfterUserReply(turn, {
        usedCustom: true,
        customNl: 'Prima, bedankt.',
      })
    ).toBe('t_thanks')
  })
})

describe('RESTART_CHAT', () => {
  it('clears messages and replays the opening assistant line', () => {
    let state = createGuidedSessionState(supermarketDef)
    state = reduceGuidedSession(state, { type: 'START_CHAT' })
    state = reduceGuidedSession(state, { type: 'SUBMIT_REPLY', customText: 'Waar vind ik de melk?' })
    expect(state.messages.length).toBeGreaterThan(1)
    state = reduceGuidedSession(state, { type: 'RESTART_CHAT' })
    expect(state.messages).toHaveLength(1)
    expect(state.messages[0]!.role).toBe('assistant')
    expect(state.currentTurnId).toBe(supermarketDef.startTurnId)
    expect(state.branchQualities).toEqual([])
    expect(state.outcome).toBeNull()
    expect(state.phase).toBe('chat')
  })
})

describe('reduceGuidedSession — supermarket follow-up', () => {
  it('emits fruit-aisle reply before the generic closing', () => {
    expect(validateGuidedDefinition(supermarketDef)).toEqual([])

    let state = createGuidedSessionState(supermarketDef)
    state = reduceGuidedSession(state, { type: 'START_CHAT' })
    state = reduceGuidedSession(state, {
      type: 'SUBMIT_REPLY',
      customText: 'Waar vind ik de melk, alstublieft?',
    })
    expect(state.currentTurnId).toBe('t_dir')
    state = reduceGuidedSession(state, {
      type: 'SUBMIT_REPLY',
      customText: 'Dankjewel En waar kan ik die ananas vinden',
    })
    expect(state.currentTurnId).toBe('t_followup_where')
    const lastAssistant = [...state.messages].reverse().find((m) => m.role === 'assistant')
    expect(lastAssistant?.nl).toContain('ananas')
    expect(lastAssistant?.nl).not.toMatch(/^Graag gedaan/)
  })
})
