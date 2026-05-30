import type { SessionLoopAdapterHints, SessionAdapterResolutionInput } from './sessionLoopAdapterTypes'
import type { TrainingLoopType } from '../trainingLoopTypes'

export const LISTENING_TRAINING_LOOP_TYPES: TrainingLoopType[] = [
  'listening_burst',
  'missed_detail_retry',
  'fast_speech_burst',
  'listen_and_reply',
  'route_detail_drill',
  'number_time_drill',
]

const ALLOWED = new Set<TrainingLoopType>(LISTENING_TRAINING_LOOP_TYPES)

export function buildListeningModalityAdapterHints(_input: SessionAdapterResolutionInput): SessionLoopAdapterHints {
  const preferred: TrainingLoopType[] = [
    'missed_detail_retry',
    'number_time_drill',
    'route_detail_drill',
    'fast_speech_burst',
    'listen_and_reply',
    'listening_burst',
  ]
  return {
    adapterId: 'listening_modality',
    source: 'listening',
    allowedLoopTypes: ALLOWED,
    scenarioTheme: 'general',
    miniScenarioObjectiveOverride: null,
    structurePromptTail: null,
    structureDrillTitleHint: null,
    questionDrillTitle: null,
    questionDrillSubtitle: null,
    questionDrillPrompts: null,
    questionDrillExampleQuestions: null,
    liveMicroReadPassage: null,
    liveMicroReadSubtitle: null,
    readAloudRetryPhrase: null,
    readAloudPacingFocusLabel: null,
    chatSpeakingTransferPrompts: null,
    preferredLoopTypesForSession: preferred,
  }
}
