import { describe, expect, it } from 'vitest'
import { inferBottleneck } from './liveSpeechLatencyTrace'

describe('inferBottleneck', () => {
  it('flags LLM when it dominates', () => {
    expect(
      inferBottleneck({
        finalTranscriptMs: 400,
        serverTranscribeMs: 0,
        prepareAudioMs: 0,
        llmMs: 9000,
        ttsMs: 800,
      })
    ).toBe('LLM')
  })

  it('flags server STT when it dominates', () => {
    expect(
      inferBottleneck({
        finalTranscriptMs: 200,
        serverTranscribeMs: 5000,
        prepareAudioMs: 0,
        llmMs: 400,
        ttsMs: 300,
      })
    ).toBe('server STT')
  })
})
