import type { TrainingLoopSourceType } from '../trainingLoopKinds'
import type { TrainingLoopType } from '../trainingLoopTypes'
import type { SessionLearningInsights } from '../../learningMemory/sessionLearningInsightTypes'
import type { UserLearningProfile } from '../../learningMemory/userLearningProfileDocument'
import type { LiveSessionEvaluation } from '../../../services/speak-live/liveVoiceEvaluationTypes'
import type { ReadAloudEvaluateResult } from '../../../services/read-aloud/readAloudEvaluateTypes'

/** Narrow input for adapters — keeps `trainingLoopGenerationEngine` import-free from adapter internals. */
export type SessionAdapterResolutionInput = {
  sessionType: SessionLearningInsights['sessionType']
  scenarioSlug: string | null
  insights: SessionLearningInsights
  profile: UserLearningProfile
  speakLiveEvaluation: LiveSessionEvaluation | null
  readAloudResult: ReadAloudEvaluateResult | null
}

export type SessionLoopAdapterId =
  | 'live_scenario'
  | 'language_coach'
  | 'chat_messaging'
  | 'read_aloud_modality'
  | 'listening_modality'
  | 'quick_capture'

export type ScenarioContentTheme = 'transport' | 'opinions' | 'story' | 'food_service' | 'general'

export type SessionLoopAdapterHints = {
  adapterId: SessionLoopAdapterId
  source: TrainingLoopSourceType
  /** Effective allow-list for this completed session modality. */
  allowedLoopTypes: Set<TrainingLoopType>
  scenarioTheme: ScenarioContentTheme
  /** When set, replaces default heuristic mini-scenario objective (Speak Live scenario). */
  miniScenarioObjectiveOverride: string | null
  /** Optional extra line appended to structure drill prompts (theme-specific). */
  structurePromptTail: string | null
  structureDrillTitleHint: string | null
  questionDrillTitle: string | null
  questionDrillSubtitle: string | null
  questionDrillPrompts: string[] | null
  questionDrillExampleQuestions: string[] | null
  /** Speak-live scenario: micro “read again” passage when pacing/quality warrants read_aloud_fix style drill. */
  liveMicroReadPassage: string | null
  liveMicroReadSubtitle: string | null
  /** Read aloud: phrase-level retry (maps to `retry_sentence` payload shape). */
  readAloudRetryPhrase: {
    learnerOriginal: string
    correctedVersion: string
    referenceAudioUrl: string | null
    explanationShort: string
  } | null
  /** Overrides read_aloud_fix focus label when pacing/rush signals dominate. */
  readAloudPacingFocusLabel: string | null
  /** Chat: optional second structure drill — typed line → spoken line. */
  chatSpeakingTransferPrompts: string[] | null
  /** Small scoring bias toward these loop kinds for this session. */
  preferredLoopTypesForSession: TrainingLoopType[]
}
