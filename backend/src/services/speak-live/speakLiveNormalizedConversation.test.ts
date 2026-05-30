import { describe, expect, it } from 'vitest'
import type { ConversationMessage, ScenarioConfig } from '../../models/contracts'
import { buildNormalizedSpeakLiveSession, buildPostSessionUserTurnsForSpeechScoring } from './speakLiveNormalizedConversation'

const scenario: ScenarioConfig = {
  id: 's1',
  slug: 'test_scenario',
  title: 'Test',
  description: '',
  userRole: 'learner',
  goals: ['g1'],
  starterSuggestions: [],
  difficultyBand: 'A2',
  tags: [],
  allowedModes: ['guided'],
  openingMessage: null,
}

function msg(p: Partial<ConversationMessage> & Pick<ConversationMessage, 'id' | 'sender' | 'content'>): ConversationMessage {
  return {
    threadId: 't1',
    messageType: 'text',
    metadata: null,
    createdAt: p.createdAt ?? '2026-01-01T12:00:00.000Z',
    id: p.id,
    sender: p.sender,
    content: p.content,
  }
}

describe('speakLiveNormalizedConversation', () => {
  it('buildPostSessionUserTurnsForSpeechScoring skips assistant and pairs prior assistant', () => {
    const messages: ConversationMessage[] = [
      msg({ id: 'a1', sender: 'assistant', content: 'Hallo!' }),
      msg({ id: 'u1', sender: 'user', content: 'Hoi' }),
      msg({ id: 'a2', sender: 'assistant', content: 'Goed.' }),
      msg({ id: 'u2', sender: 'user', content: 'Dank je' }),
    ]
    const turns = buildPostSessionUserTurnsForSpeechScoring(messages)
    expect(turns).toHaveLength(2)
    expect(turns[0]!.assistant).toBe('Hallo!')
    expect(turns[1]!.assistant).toBe('Goed.')
  })

  it('buildNormalizedSpeakLiveSession exposes userTurns subset', () => {
    const messages: ConversationMessage[] = [
      msg({ id: 'a1', sender: 'assistant', content: 'X' }),
      msg({ id: 'u1', sender: 'user', content: 'Y' }),
    ]
    const n = buildNormalizedSpeakLiveSession({
      threadId: 't1',
      scenario,
      learnerLevel: 'A2',
      messages,
    })
    expect(n.turns).toHaveLength(2)
    expect(n.userTurns).toHaveLength(1)
    expect(n.userTurns[0]!.speaker).toBe('user')
  })
})
