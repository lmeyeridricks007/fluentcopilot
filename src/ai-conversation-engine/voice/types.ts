/**
 * AI Conversation Engine — voice pipeline interfaces (STT, TTS, pronunciation).
 */

export interface SpeechToTextInput {
  audio_base64?: string
  audio_url?: string
  language?: string
}

export interface SpeechToTextResult {
  text: string
  confidence?: number
  duration_ms?: number
}

export interface TextToSpeechInput {
  text: string
  voice_id?: string
  language?: string
}

export interface TextToSpeechResult {
  audio_base64: string
  duration_ms?: number
}

export interface PronunciationScoreInput {
  audio_base64: string
  reference_text: string
  language?: string
}

export interface PronunciationScoreResult {
  score: number
  feedback?: string
  phoneme_scores?: Array<{ phoneme: string; score: number }>
}

export interface ISpeechToTextService {
  transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult>
}

export interface ITextToSpeechService {
  synthesize(input: TextToSpeechInput): Promise<TextToSpeechResult>
}

export interface IPronunciationService {
  score(input: PronunciationScoreInput): Promise<PronunciationScoreResult>
}
