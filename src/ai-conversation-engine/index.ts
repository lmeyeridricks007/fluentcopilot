/**
 * AI Conversation Engine — public API.
 */

export * from './types/index.js'
export * from './api/conversationApi.js'
export * from './providers/index.js'
export * from './session/sessionStore.js'
export * from './prompts/templates.js'
export * from './safety/moderation.js'
export * from './feedback/summary.js'
export * from './feedback/scoring.js'
export * from './telemetry/events.js'
export { getScenario, registerScenario, listScenarioIds } from './config/scenarios.js'
export { defaultConfig } from './config/index.js'
export type {
  ISpeechToTextService,
  ITextToSpeechService,
  IPronunciationService,
  SpeechToTextInput,
  SpeechToTextResult,
  TextToSpeechInput,
  TextToSpeechResult,
  PronunciationScoreInput,
  PronunciationScoreResult,
} from './voice/types.js'
export { MockSpeechToText, MockTextToSpeech, MockPronunciationService } from './voice/mockVoice.js'
