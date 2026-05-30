import type { SessionLoopAdapterHints, SessionAdapterResolutionInput } from './sessionLoopAdapterTypes'
import type { TrainingLoopType } from '../trainingLoopTypes'

const QC_ALLOWED = new Set<TrainingLoopType>([
  'weak_words',
  'retry_sentence',
  'mini_scenario',
  'read_aloud_fix',
  'structure_drill',
  'pronunciation_drill',
  'question_drill',
  'listening_burst',
])

/**
 * Quick Capture completions are lighter than Speak Live — allow compact drills + one decode rep.
 */
export function buildQuickCaptureAdapterHints(_input: SessionAdapterResolutionInput): SessionLoopAdapterHints {
  const preferred: TrainingLoopType[] = [
    'weak_words',
    'mini_scenario',
    'retry_sentence',
    'read_aloud_fix',
    'pronunciation_drill',
    'question_drill',
    'listening_burst',
  ]
  return {
    adapterId: 'quick_capture',
    source: 'quick_capture',
    allowedLoopTypes: QC_ALLOWED,
    scenarioTheme: 'general',
    miniScenarioObjectiveOverride:
      'Micro-drill from something you saved today: one short exchange, same domain, calmer wording.',
    structurePromptTail: null,
    structureDrillTitleHint: null,
    questionDrillTitle: 'Ask the next question',
    questionDrillSubtitle: 'Short follow-ups you can reuse in real life.',
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
