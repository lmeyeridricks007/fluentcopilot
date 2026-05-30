/**
 * AI Conversation Engine — mock voice pipeline for development.
 */

import type {
  ISpeechToTextService,
  ITextToSpeechService,
  IPronunciationService,
  SpeechToTextInput,
  SpeechToTextResult,
  TextToSpeechInput,
  TextToSpeechResult,
  PronunciationScoreInput,
  PronunciationScoreResult,
} from './types.js'

export class MockSpeechToText implements ISpeechToTextService {
  async transcribe(_input: SpeechToTextInput): Promise<SpeechToTextResult> {
    return { text: '[Mock STT: Mag ik een koffie alstublieft?]', confidence: 0.9, duration_ms: 1500 }
  }
}

export class MockTextToSpeech implements ITextToSpeechService {
  async synthesize(input: TextToSpeechInput): Promise<TextToSpeechResult> {
    // Mock: return a fixed base64 placeholder (no real audio)
    const audio_base64 = 'bW9jay1hdWRpby1mb3ItdGVzdA=='
    return {
      audio_base64,
      duration_ms: Math.max(500, input.text.length * 50),
    }
  }
}

export class MockPronunciationService implements IPronunciationService {
  async score(_input: PronunciationScoreInput): Promise<PronunciationScoreResult> {
    return { score: 0.85, feedback: 'Good pronunciation. Practice the "g" sound.' }
  }
}
