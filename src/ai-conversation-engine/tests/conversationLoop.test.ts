/**
 * AI Conversation Engine — conversation loop and API tests.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  startConversation,
  sendMessage,
  endConversation,
  getConversation,
  getSession,
} from '../index.js'

describe('Conversation API', () => {
  let sessionId: string

  beforeEach(async () => {
    const res = await startConversation({
      user_id: 'user-1',
      scenario_id: 'cafe',
      cefr_level: 'A1',
      conversation_type: 'text',
    })
    sessionId = res.session_id
  })

  it('starts a session and returns session_id', async () => {
    const res = await startConversation({
      user_id: 'user-2',
      scenario_id: 'doctor',
      cefr_level: 'B1',
      conversation_type: 'text',
    })
    expect(res.session_id).toBeDefined()
    expect(res.session.user_id).toBe('user-2')
    expect(res.session.scenario_id).toBe('doctor')
    expect(res.session.status).toBe('active')
    expect(res.session.messages).toHaveLength(0)
  })

  it('processes a message and returns tutor response', async () => {
    const res = await sendMessage({
      session_id: sessionId,
      content: 'Mag ik een koffie alstublieft?',
    })
    if ('error' in res) throw new Error(res.error)
    expect(res.message.role).toBe('user')
    expect(res.message.content).toBe('Mag ik een koffie alstublieft?')
    expect(res.tutor_response.role).toBe('tutor')
    expect(res.tutor_response.content.length).toBeGreaterThan(0)
  })

  it('ends session and returns summary', async () => {
    await sendMessage({ session_id: sessionId, content: 'Hallo' })
    const endRes = await endConversation({ session_id: sessionId })
    if ('error' in endRes) throw new Error(endRes.error)
    expect(endRes.session.status).toBe('completed')
    expect(endRes.summary.conversation_summary).toBeDefined()
    expect(Array.isArray(endRes.summary.grammar_mistakes_list)).toBe(true)
  })

  it('getConversation returns session', async () => {
    const res = await getConversation(sessionId)
    if ('error' in res) throw new Error(res.error)
    expect(res.session.session_id).toBe(sessionId)
    expect(res.session.messages).toBeDefined()
  })

  it('sendMessage on unknown session returns error', async () => {
    const res = await sendMessage({
      session_id: 'unknown-id',
      content: 'Test',
    })
    expect('error' in res).toBe(true)
    if ('error' in res) expect(res.error).toBe('Session not found')
  })
})

describe('Session store', () => {
  it('getSession returns null for missing session', () => {
    expect(getSession('no-such-id')).toBeNull()
  })
})
