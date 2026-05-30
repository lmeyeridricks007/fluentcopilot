import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGenerateSpeechFromText } = vi.hoisted(() => ({
  mockGenerateSpeechFromText: vi.fn(),
}))

vi.mock('../speech/pronunciationAssessmentConfig', () => ({
  isAzurePronunciationConfigured: () => false,
}))

vi.mock('../audio/openAiSpeechService', () => ({
  generateSpeechFromText: (...args: unknown[]) => mockGenerateSpeechFromText(...args),
}))

import { clearSpeakLiveReferenceTtsCachesForTests } from './speakLiveReferenceTtsCache'
import { generateSpeakLiveReferenceSpeechForReport } from './speakLiveTtsGateway'

const mp3Body = Buffer.alloc(24, 7)

describe('generateSpeakLiveReferenceSpeechForReport (reference-layer cache)', () => {
  beforeEach(() => {
    clearSpeakLiveReferenceTtsCachesForTests()
    mockGenerateSpeechFromText.mockReset()
    mockGenerateSpeechFromText.mockResolvedValue({
      mimeType: 'audio/mpeg',
      audioBase64: mp3Body.toString('base64'),
      audioUrl: `data:audio/mpeg;base64,${mp3Body.toString('base64')}`,
      provider: 'openai',
      cached: true,
    })
    process.env.SPEAK_LIVE_TTS_PROVIDER = 'openai'
    delete process.env.SPEAK_LIVE_REFERENCE_TTS_CACHE_DISABLED
    process.env.SPEAK_LIVE_OPENAI_TTS_VOICE = 'nova'
  })

  it('reuses cache for identical normalized text and voice (second call does not synthesize)', async () => {
    const text = 'Goedemorgen,   hoe gaat het?'
    const first = await generateSpeakLiveReferenceSpeechForReport({ text, language: 'nl' })
    const second = await generateSpeakLiveReferenceSpeechForReport({ text: 'Goedemorgen, hoe gaat het?', language: 'nl' })
    expect(first.cached).toBe(false)
    expect(second.cached).toBe(true)
    expect(mockGenerateSpeechFromText).toHaveBeenCalledTimes(1)
  })

  it('misses cache when OpenAI voice env changes', async () => {
    await generateSpeakLiveReferenceSpeechForReport({ text: 'Hallo', language: 'nl' })
    process.env.SPEAK_LIVE_OPENAI_TTS_VOICE = 'alloy'
    await generateSpeakLiveReferenceSpeechForReport({ text: 'Hallo', language: 'nl' })
    expect(mockGenerateSpeechFromText).toHaveBeenCalledTimes(2)
  })

  it('misses cache when language changes', async () => {
    await generateSpeakLiveReferenceSpeechForReport({ text: 'Hallo', language: 'nl' })
    await generateSpeakLiveReferenceSpeechForReport({ text: 'Hallo', language: 'de' })
    expect(mockGenerateSpeechFromText).toHaveBeenCalledTimes(2)
  })
})
