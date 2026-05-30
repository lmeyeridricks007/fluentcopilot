import type { TrainingLoopSourceType } from '../trainingLoopKinds'
import type { SessionAdapterResolutionInput, SessionLoopAdapterHints } from './sessionLoopAdapterTypes'
import { buildLiveScenarioAdapterHints } from './liveScenarioLoopAdapter'
import { buildLanguageCoachAdapterHints } from './languageCoachLoopAdapter'
import { buildChatLoopAdapterHints } from './chatLoopAdapter'
import { buildReadAloudAdapterHints } from './readAloudLoopAdapter'
import { buildListeningModalityAdapterHints } from './listeningModalityLoopAdapter'
import { buildQuickCaptureAdapterHints } from './quickCaptureLoopAdapter'

/**
 * Maps completed session modality → adapter hints (allow-list, copy, and extra drill shapes).
 *
 * | Session | Source resolver | Adapter |
 * |-----------|-----------------|---------|
 * | `read_aloud` | n/a | {@link buildReadAloudAdapterHints} |
 * | `text_conversation` | `chat` | {@link buildChatLoopAdapterHints} |
 * | `speak_live` + coach slug | `coach` | {@link buildLanguageCoachAdapterHints} |
 * | `speak_live` + scenario | `scenario` | {@link buildLiveScenarioAdapterHints} |
 * | `listening` | `listening` | {@link buildListeningModalityAdapterHints} |
 */
export function resolveSessionLoopAdapterHints(params: {
  input: SessionAdapterResolutionInput
  source: TrainingLoopSourceType
  /** Precomputed in engine — passed so adapter matches hesitation logic. */
  hesitationStrong: boolean
}): SessionLoopAdapterHints {
  const { input, source, hesitationStrong } = params
  if (input.sessionType === 'quick_capture') {
    return buildQuickCaptureAdapterHints(input)
  }
  if (input.sessionType === 'listening') {
    return buildListeningModalityAdapterHints(input)
  }
  if (input.sessionType === 'read_aloud') {
    return buildReadAloudAdapterHints(input)
  }
  if (input.sessionType === 'text_conversation') {
    return buildChatLoopAdapterHints(input)
  }
  if (source === 'coach') {
    return buildLanguageCoachAdapterHints(input)
  }
  return buildLiveScenarioAdapterHints(input, { hesitationStrong })
}
