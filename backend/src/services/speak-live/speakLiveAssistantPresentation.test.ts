import { describe, expect, it } from 'vitest'
import { inferSpeakLiveAssistantPresentation } from './speakLiveAssistantPresentation'

describe('inferSpeakLiveAssistantPresentation', () => {
  it('maps Azure nl-NL neural names', () => {
    expect(inferSpeakLiveAssistantPresentation('azure', 'nl-NL-MaartenNeural')).toBe('male')
    expect(inferSpeakLiveAssistantPresentation('azure', 'nl-NL-FennaNeural')).toBe('female')
    expect(inferSpeakLiveAssistantPresentation('azure', 'nl-NL-ColetteNeural')).toBe('female')
  })

  it('maps OpenAI preset voices', () => {
    expect(inferSpeakLiveAssistantPresentation('openai', 'onyx')).toBe('male')
    expect(inferSpeakLiveAssistantPresentation('openai', 'coral')).toBe('female')
    expect(inferSpeakLiveAssistantPresentation('openai', 'alloy')).toBe('female')
  })
})
