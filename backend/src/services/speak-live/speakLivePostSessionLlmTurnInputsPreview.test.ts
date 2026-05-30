import { describe, expect, it } from 'vitest'
import { buildPostSessionLlmTurnInputsPreview } from './speakLivePostSessionLlmTurnInputsPreview'
import type { PostSessionSpeechTurnInput } from './speakLiveNormalizedConversation'

function userTurn(id: string, content: string, blob: string | null): PostSessionSpeechTurnInput {
  return {
    msg: {
      id,
      sender: 'user',
      content,
      createdAt: '2026-05-01T10:00:00.000Z',
      threadId: 'preview-test-thread',
      messageType: 'text',
      metadata: blob
        ? { learnerAudioBlobPath: blob, transcriptRaw: content }
        : { transcriptRaw: content },
    } as PostSessionSpeechTurnInput['msg'],
    assistant: 'Hallo!',
    index: 0,
  }
}

describe('buildPostSessionLlmTurnInputsPreview', () => {
  it('sets azureSummary null and hasLearnerAudio from blob path', () => {
    const turns = [userTurn('t1', 'Ik wil koffie', 'path/to/a.webm')]
    const out = buildPostSessionLlmTurnInputsPreview(turns, ['Order drink'])
    expect(out).toHaveLength(1)
    expect(out[0].azureSummary).toBeNull()
    expect(out[0].hasLearnerAudio).toBe(true)
    expect(out[0].assistantReply).toContain('Hallo')
  })

  it('marks no audio when blob path missing', () => {
    const turns = [userTurn('t2', 'Alleen tekst', null)]
    const out = buildPostSessionLlmTurnInputsPreview(turns, [])
    expect(out[0].hasLearnerAudio).toBe(false)
  })
})
