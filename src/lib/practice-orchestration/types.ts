/**
 * Practice AI orchestration — shared types (UI-agnostic).
 * Sits between practice surfaces and LLM / mock providers.
 */
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'

/** Granular A2 band for constraints (maps from catalog difficulty + learner profile later). */
export type A2DifficultyBand = 'a2_lower' | 'a2_mid' | 'a2_upper'

/** How the learner produced this turn (speech hooks are structural; STT wiring comes later). */
export type PracticeInputModality = 'text' | 'speech_transcript' | 'speech_transcript_low_confidence'

export type TurnFeedbackTier = 'none' | 'light' | 'supportive' | 'recovery'

export type RecoveryKind =
  | 'none'
  | 'english_input'
  | 'dont_know'
  | 'too_short'
  | 'low_confidence_speech'
  | 'help_request'
  | 'repeated_struggle'

export interface PracticeMessageTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface PracticeTurnFeedbackSignals {
  tier: TurnFeedbackTier
  recovery: RecoveryKind
  /** Suggested analytics / mastery hooks (persist via adapter). */
  mistakeSignal?: { tag: string; note?: string }
  /** Soft hint for UI (English), intensity scales with mode. */
  learnerCoachEn?: string
  /** Review lemma candidates — placeholder for extraction pipeline. */
  reviewLemmaHints?: string[]
}

export interface ListeningOutputHints {
  /** Text is short enough / clear enough for TTS without sounding overloaded. */
  suitableForTts: boolean
  /** Product: “simpler” replay available (we set true when reply had multiple clauses). */
  simplerReplaySuggested: boolean
}

export interface PracticeOrchestrationDebug {
  systemPrompt: string
  /** Tags for logging / devtools (not end-user). */
  modeRulesApplied: string[]
  recoveryApplied: RecoveryKind
}

/** Mirrors `FeedbackTimingMode` in product guidance — kept as string union to avoid client store imports here. */
export type PracticeFeedbackTimingPreference = 'each_turn' | 'end' | 'silent'

export interface RunPracticeConversationTurnInput {
  scenarioId: string
  mode: PracticeConversationMode
  userMessage: string
  priorUserTurns: number
  messageHistory: PracticeMessageTurn[]
  /** Default a2_mid */
  difficulty?: A2DifficultyBand
  /**
   * When true, prompt adds gentler scaffolding (shorter sentences, clearer prompts)
   * without switching to guided script — pairs with lowered difficulty in UI.
   */
  easierModeActive?: boolean
  inputModality?: PracticeInputModality
  /** 0–1 when from STT */
  sttConfidence?: number
  localeInstruction?: 'nl-NL'
  /** Learner preference: per-turn coach line vs end-only vs off (open/semi practice). */
  feedbackTiming?: PracticeFeedbackTimingPreference
  /** Tighter A2 band + stricter tone in prompts when wired to LLM. */
  examStyleConversation?: boolean
  /** When true, include `debug` in output (dev / inspectors only). */
  debug?: boolean
}

export interface RunPracticeConversationTurnOutput {
  assistantNl: string
  coachEn?: string
  feedbackSignals: PracticeTurnFeedbackSignals
  listeningHints: ListeningOutputHints
  /** Built system prompt for LLM path; same structure used to steer mock. */
  systemPromptForProvider: string
  debug?: PracticeOrchestrationDebug
}

export interface BuildPracticeSystemPromptInput {
  scenarioId: string
  mode: PracticeConversationMode
  difficulty: A2DifficultyBand
  turnObjective: string
  recovery: RecoveryKind
  extraConstraints?: string[]
}
