/**
 * Versioned schema for "From your day" interactive exercise packs.
 * Built deterministically from {@link DayPracticeStep} so packs stay reopenable without extra DB columns.
 */
export const INTERACTIVE_PACK_SCHEMA_VERSION = 1 as const

export type InteractivePhase = 'warm_up' | 'core' | 'transfer' | 'finish'

export type InteractiveExerciseBase = {
  id: string
  phase: InteractivePhase
  sourceStepId?: string
  captureId?: string
}

/** Rich read — user taps Continue when ready. */
export type ExplanationCardExercise = InteractiveExerciseBase & {
  kind: 'explanation_card'
  eyebrow?: string
  title?: string
  paragraphs: string[]
  bullets?: string[]
}

export type MultipleChoiceExercise = InteractiveExerciseBase & {
  kind: 'multiple_choice_meaning' | 'multiple_choice_usage' | 'choose_best_phrase' | 'mini_dialogue_choice'
  questionEn: string
  options: { id: string; label: string }[]
  correctOptionId: string
  /** Shown after a correct pick — keep short. */
  correctExplanationEn?: string
  /** Richer copy after a wrong attempt (before the learner picks again). */
  incorrectFeedbackStyle?: 'listening' | 'meaning' | 'usage'
}

export type HearAndRepeatExercise = InteractiveExerciseBase & {
  kind: 'hear_and_repeat' | 'pronunciation_rep'
  textNl: string
  helperEn?: string
  /** Optional lines from the capture for extra reference playback (saved-word packs). */
  exampleLinesNl?: string[]
  /** Pre-baked clip when hydration provides one. */
  referenceAudioUrl?: string | null
  /** Optional Azure / OpenAI voice id for `/api/speaking/reference-audio`. */
  voice?: string
}

export type FillInBlankExercise = InteractiveExerciseBase & {
  kind: 'fill_in_blank'
  promptEn: string
  sentenceNl: string
  acceptableAnswers: string[]
  caseInsensitive?: boolean
}

export type ReorderSentenceExercise = InteractiveExerciseBase & {
  kind: 'reorder_sentence' | 'build_a_sentence'
  tokens: string[]
  /** Target sentence (tokens joined with single spaces). */
  correctSentenceNl: string
}

export type SayItAloudExercise = InteractiveExerciseBase & {
  kind: 'say_it_aloud'
  instructionEn: string
  targetNl: string
  exampleLinesNl?: string[]
  referenceAudioUrl?: string | null
  voice?: string
}

export type RecordAndCompareExercise = InteractiveExerciseBase & {
  kind: 'record_and_compare'
  instructionEn: string
  targetNl: string
  referenceAudioUrl?: string | null
  voice?: string
  maxRecordingSeconds?: number
}

export type WriteYourOwnLineExercise = InteractiveExerciseBase & {
  kind: 'write_your_own_line'
  promptEn: string
  promptNl?: string
  minChars?: number
}

export type ListeningBurstExercise = InteractiveExerciseBase & {
  kind: 'listening_burst'
  textNl: string
  playsRecommended?: number
  questionEn: string
  options: { id: string; label: string }[]
  correctOptionId: string
  correctExplanationEn?: string
  referenceAudioUrl?: string | null
  voice?: string
}

export type ReadAloudRepExercise = InteractiveExerciseBase & {
  kind: 'read_aloud_rep'
  textNl: string
  readAloudHref: string
  afterReadPromptEn?: string
  referenceAudioUrl?: string | null
  voice?: string
  optionalDeepLinks?: { label: string; href: string }[]
}

export type ScenarioJumpoffExercise = InteractiveExerciseBase & {
  kind: 'scenario_jumpoff'
  title: string
  descriptionEn?: string
  href: string
  confirmLabel?: string
  /** Primary outbound link label (e.g. “Open in Talk”). */
  linkLabel?: string
  optionalDeepLinks?: { label: string; href: string }[]
}

export type SaveToLibraryActionExercise = InteractiveExerciseBase & {
  kind: 'save_to_library_action'
  bodyEn: string
}

/** One-tap reflection — no wrong answer. */
export type ReflectionCheckExercise = InteractiveExerciseBase & {
  kind: 'reflection_check'
  promptEn: string
  yesLabel?: string
  notYetLabel?: string
}

export type InteractiveExercise =
  | ExplanationCardExercise
  | MultipleChoiceExercise
  | HearAndRepeatExercise
  | FillInBlankExercise
  | ReorderSentenceExercise
  | SayItAloudExercise
  | RecordAndCompareExercise
  | WriteYourOwnLineExercise
  | ListeningBurstExercise
  | ReadAloudRepExercise
  | ScenarioJumpoffExercise
  | SaveToLibraryActionExercise
  | ReflectionCheckExercise

export type InteractiveSessionPackV1 = {
  schemaVersion: typeof INTERACTIVE_PACK_SCHEMA_VERSION
  title: string
  subtitle?: string
  exercises: InteractiveExercise[]
}
