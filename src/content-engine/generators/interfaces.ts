/**
 * Content engine — generator interfaces.
 * Implementations call prompt executor and return normalized artifacts.
 */

import type {
  VocabularyItem,
  PhraseItem,
  Dialogue,
  LessonBlueprint,
  LessonInstance,
  ExerciseInstance,
  ExamTask,
  ReflectionLessonDraft,
} from '../types/artifacts.js'
import type { ParseResult } from '../types/pipeline.js'

export interface GenerateVocabularyPackInput {
  locale: string
  cefr_level: string
  topic?: string
  scenario_codes?: string[]
  max_items: number
}

export interface GenerateVocabularyPackResult {
  items: VocabularyItem[]
}

export interface GeneratePhrasePackInput {
  locale: string
  scenario_or_intent: string
  formality?: string
  max_phrases: number
  variants?: boolean
}

export interface GeneratePhrasePackResult {
  items: PhraseItem[]
}

export interface GenerateDialogueInput {
  scenario_id?: string
  scenario_code: string
  locale: string
  cefr_level: string
  num_turns?: number
}

export interface GenerateDialogueResult {
  dialogue: Dialogue
}

export interface GenerateLessonBlueprintInput {
  lesson_template_id?: string
  lesson_type: string
  locale: string
  cefr_level: string
  topic?: string
  scenario_id?: string
  objective?: string
  max_exercises?: number
}

export interface GenerateLessonBlueprintResult {
  blueprint: LessonBlueprint
  instance?: LessonInstance
}

export interface GenerateExerciseSetInput {
  exercise_template_id: string
  locale: string
  cefr_level: string
  source_content?: { vocabulary_ids?: string[]; lesson_id?: string }
  num_items: number
}

export interface GenerateExerciseSetResult {
  exercises: ExerciseInstance[]
}

export interface GenerateExamTaskInput {
  exam_type_id: string
  module: string
  locale: string
  num_tasks: number
  difficulty?: string
}

export interface GenerateExamTaskResult {
  tasks: ExamTask[]
}

export interface GenerateReflectionLessonInput {
  user_notes_sanitized: string
  learner_level: string
  locale: string
  place_category?: string
}

export interface GenerateReflectionLessonResult {
  draft: ReflectionLessonDraft
}

export interface IContentGenerator {
  generateVocabularyPack(input: GenerateVocabularyPackInput): Promise<ParseResult<GenerateVocabularyPackResult>>
  generatePhrasePack(input: GeneratePhrasePackInput): Promise<ParseResult<GeneratePhrasePackResult>>
  generateDialogue(input: GenerateDialogueInput): Promise<ParseResult<GenerateDialogueResult>>
  generateLessonBlueprint(input: GenerateLessonBlueprintInput): Promise<ParseResult<GenerateLessonBlueprintResult>>
  generateExerciseSet(input: GenerateExerciseSetInput): Promise<ParseResult<GenerateExerciseSetResult>>
  generateExamTasks(input: GenerateExamTaskInput): Promise<ParseResult<GenerateExamTaskResult>>
  generateReflectionLesson(input: GenerateReflectionLessonInput): Promise<ParseResult<GenerateReflectionLessonResult>>
}
