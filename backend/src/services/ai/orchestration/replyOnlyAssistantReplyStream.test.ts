import { describe, expect, it } from 'vitest'
import { nextAssistantReplyTextDelta, scanAssistantReplyJsonString } from './replyOnlyAssistantReplyStream'

describe('replyOnlyAssistantReplyStream', () => {
  it('extracts assistantText incrementally from a streaming JSON buffer', () => {
    const chunks = [
      '{"answeredGoals":[],"assistantText":"Goe',
      'den dag! Hoe gaat het?"}',
    ]
    let buf = ''
    let emitted = 0
    const deltas: string[] = []
    for (const c of chunks) {
      buf += c
      const { delta, newEmittedStrippedLen } = nextAssistantReplyTextDelta(buf, emitted)
      emitted = newEmittedStrippedLen
      if (delta) deltas.push(delta)
    }
    expect(deltas.join('')).toBe('Goeden dag! Hoe gaat het?')
    const peek = scanAssistantReplyJsonString(buf)
    expect(peek?.complete).toBe(true)
    expect(peek?.decoded).toBe('Goeden dag! Hoe gaat het?')
  })

  it('decodes escaped quotes inside assistantReply', () => {
    const buf = '{"assistantReply":"Hij zei \\"hallo\\" vandaag."}'
    const peek = scanAssistantReplyJsonString(buf)
    expect(peek?.complete).toBe(true)
    expect(peek?.decoded).toBe('Hij zei "hallo" vandaag.')
  })

  it('returns null until assistantReply key is present', () => {
    expect(scanAssistantReplyJsonString('{"shouldCon')).toBeNull()
    expect(scanAssistantReplyJsonString('{"shouldConversationEnd":false')).toBeNull()
  })

  it('strips markdown asterisks from streamed deltas so TTS would not read "asterisk"', () => {
    const buf = '{"assistantReply":"**Hoi!** Ik ben je coach."}'
    let emitted = 0
    const { delta, newEmittedStrippedLen } = nextAssistantReplyTextDelta(buf, emitted)
    emitted = newEmittedStrippedLen
    expect(delta).toBe('Hoi! Ik ben je coach.')
    expect(emitted).toBe(delta.length)
  })
})
