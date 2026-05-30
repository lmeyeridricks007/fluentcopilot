/**
 * Generated interactive exercise packs — domain types + per-block config shapes.
 * Persisted: dbo.GeneratedExercisePacks, dbo.GeneratedExerciseBlockResults.
 */

// --- Pack & progress ---

export type GeneratedExercisePackId = string
export type UserId = string

export type GeneratedExercisePackType =
  | 'from_your_day'
  | 'capture_word'
  | 'capture_phrase'
  | 'capture_text'
  | 'capture_struggle'
  | 'capture_voice_note'

export type GeneratedExercisePackStatus = 'ready' | 'started' | 'completed' | 'archived'

export type ExercisePackLevel = 'A1' | 'A2' | 'B1' | 'mixed'

export type ExercisePackProgress = {
  totalBlocks: number
  completedBlocks: number
  completionPercent: number
  lastOpenedAt?: string
  lastCompletedBlockId?: string
}

export type ExerciseResult = {
  correctness?: number
  completionScore?: number
  userAnswer?: unknown
  notes?: string[]
  createdAt: string
}

export type ExerciseBlockCompletionState = 'not_started' | 'in_progress' | 'completed'

// --- Block types ---

export type ExerciseBlockType =
  | 'explanation_card'
  | 'hear_and_repeat'
  | 'pronunciation_rep'
  | 'multiple_choice_meaning'
  | 'multiple_choice_usage'
  | 'fill_in_blank'
  | 'reorder_sentence'
  | 'build_a_sentence'
  | 'say_it_aloud'
  | 'record_and_compare'
  | 'write_your_own_line'
  | 'choose_best_phrase'
  | 'mini_dialogue_choice'
  | 'scenario_jumpoff'
  | 'read_aloud_rep'
  | 'listening_burst'
  | 'reflection_check'

// --- Config shapes (Part 2) ---

export type ExampleLine = { dutch: string; english?: string }

export type ExplanationCardConfig = {
  dutch: string
  englishMeaning: string
  shortUsageNote?: string
  exampleLines: ExampleLine[]
}

export type HearAndRepeatConfig = {
  targetText: string
  referenceAudioUrl?: string
  hint?: string
  repeatCount?: number
}

export type PronunciationRepConfig = HearAndRepeatConfig

export type McOption = { id: string; label: string; isCorrect: boolean }

export type MultipleChoiceMeaningConfig = {
  prompt: string
  options: McOption[]
  correctExplanation: string
}

export type MultipleChoiceUsageConfig = {
  prompt: string
  options: McOption[]
  correctExplanation: string
}

export type FillInBlankConfig = {
  prompt: string
  sentenceNl: string
  acceptableAnswers: string[]
  caseInsensitive?: boolean
}

export type ReorderSentenceConfig = {
  tokens: string[]
  correctSentenceNl: string
}

export type BuildASentenceConfig = {
  prompt: string
  requiredWords: string[]
  suggestedAnswer?: string
  evaluationMode: 'llm' | 'rule_based'
}

export type SayItAloudConfig = {
  instruction: string
  targetNl: string
}

export type RecordAndCompareConfig = {
  instruction: string
  targetNl: string
  maxRecordingSeconds?: number
}

export type WriteYourOwnLineConfig = {
  prompt: string
  targetWordOrPhrase: string
  evaluationMode: 'llm'
  feedbackStyle: 'light' | 'coaching'
  minChars?: number
}

export type ChooseBestPhraseConfig = {
  prompt: string
  options: McOption[]
  correctExplanation?: string
}

export type MiniDialogueChoiceConfig = {
  context: string
  prompt: string
  options: McOption[]
  correctExplanation?: string
}

export type ScenarioJumpoffConfig = {
  scenarioId: string
  ctaLabel: string
  reason: string
  href?: string
}

export type ReadAloudRepConfig = {
  textNl: string
  readAloudHref: string
  afterReadPrompt?: string
}

export type ListeningBurstConfig = {
  textNl: string
  playsRecommended?: number
  prompt: string
  options: McOption[]
  correctExplanation?: string
}

export type ReflectionCheckConfig = {
  prompt: string
  affirmations?: string[]
}

// --- Exercise blocks (discriminated union) ---

export type ExerciseBlockBase = {
  id: string
  title?: string
  subtitle?: string
  instruction?: string
  sourceCaptureIds: string[]
  skillTags: string[]
  estimatedSeconds?: number
  completionState: ExerciseBlockCompletionState
  result?: ExerciseResult
}

export type ExerciseBlock =
  | (ExerciseBlockBase & { type: 'explanation_card'; config: ExplanationCardConfig })
  | (ExerciseBlockBase & { type: 'hear_and_repeat'; config: HearAndRepeatConfig })
  | (ExerciseBlockBase & { type: 'pronunciation_rep'; config: PronunciationRepConfig })
  | (ExerciseBlockBase & { type: 'multiple_choice_meaning'; config: MultipleChoiceMeaningConfig })
  | (ExerciseBlockBase & { type: 'multiple_choice_usage'; config: MultipleChoiceUsageConfig })
  | (ExerciseBlockBase & { type: 'fill_in_blank'; config: FillInBlankConfig })
  | (ExerciseBlockBase & { type: 'reorder_sentence'; config: ReorderSentenceConfig })
  | (ExerciseBlockBase & { type: 'build_a_sentence'; config: BuildASentenceConfig })
  | (ExerciseBlockBase & { type: 'say_it_aloud'; config: SayItAloudConfig })
  | (ExerciseBlockBase & { type: 'record_and_compare'; config: RecordAndCompareConfig })
  | (ExerciseBlockBase & { type: 'write_your_own_line'; config: WriteYourOwnLineConfig })
  | (ExerciseBlockBase & { type: 'choose_best_phrase'; config: ChooseBestPhraseConfig })
  | (ExerciseBlockBase & { type: 'mini_dialogue_choice'; config: MiniDialogueChoiceConfig })
  | (ExerciseBlockBase & { type: 'scenario_jumpoff'; config: ScenarioJumpoffConfig })
  | (ExerciseBlockBase & { type: 'read_aloud_rep'; config: ReadAloudRepConfig })
  | (ExerciseBlockBase & { type: 'listening_burst'; config: ListeningBurstConfig })
  | (ExerciseBlockBase & { type: 'reflection_check'; config: ReflectionCheckConfig })

/** Core fields persisted in BlocksJson (no completionState / result — those come from block results + hydration). */
export type StoredExerciseBlockCore = {
  id: string
  title?: string
  subtitle?: string
  instruction?: string
  sourceCaptureIds: string[]
  skillTags: string[]
  estimatedSeconds?: number
}

/** JSON in GeneratedExercisePacks.BlocksJson — `config` validated at generation time. */
export type StoredExerciseBlock = StoredExerciseBlockCore & {
  type: ExerciseBlockType
  config: unknown
}

export type GeneratedExercisePack = {
  id: GeneratedExercisePackId
  userId: UserId
  sourceCaptureIds: string[]
  title: string
  subtitle: string
  estimatedMinutes: number
  level: ExercisePackLevel
  theme: string
  packType: GeneratedExercisePackType
  blocks: ExerciseBlock[]
  status: GeneratedExercisePackStatus
  createdAt: string
  completedAt?: string
  xpPotential: number
  xpAwarded?: number
  progress: ExercisePackProgress
}

export type GeneratedExercisePackIdBranded = GeneratedExercisePack['id']

export function computeExercisePackProgress(input: {
  totalBlocks: number
  completedBlocks: number
  lastOpenedAt?: string
  lastCompletedBlockId?: string
}): ExercisePackProgress {
  const total = Math.max(0, input.totalBlocks)
  const done = Math.min(total, Math.max(0, input.completedBlocks))
  const completionPercent = total === 0 ? 0 : Math.round((done / total) * 1000) / 10
  return {
    totalBlocks: total,
    completedBlocks: done,
    completionPercent,
    lastOpenedAt: input.lastOpenedAt,
    lastCompletedBlockId: input.lastCompletedBlockId,
  }
}
