/**
 * Content engine — schema validator (Zod-based).
 * Validates artifact against artifact type schema.
 */

import type { NormalizedArtifact } from '../types/artifacts.js'
import type { CheckResult } from '../types/validation.js'
import type { ValidationContext } from './interfaces.js'
import {
  vocabularyItemSchema,
  phraseItemSchema,
  dialogueSchema,
  lessonBlueprintSchema,
  lessonInstanceSchema,
  exerciseInstanceSchema,
  examTaskSchema,
  reflectionLessonDraftSchema,
  pronunciationTargetSchema,
} from '../schemas/artifacts.js'

const schemaMap = {
  VocabularyItem: vocabularyItemSchema,
  PhraseItem: phraseItemSchema,
  Dialogue: dialogueSchema,
  LessonBlueprint: lessonBlueprintSchema,
  LessonInstance: lessonInstanceSchema,
  ExerciseInstance: exerciseInstanceSchema,
  ExamTask: examTaskSchema,
  ReflectionLessonDraft: reflectionLessonDraftSchema,
  PronunciationTarget: pronunciationTargetSchema,
} as const

function getArtifactType(artifact: NormalizedArtifact): keyof typeof schemaMap | 'Unknown' {
  if ('translations' in artifact && Array.isArray((artifact as { translations: unknown }).translations)) return 'VocabularyItem'
  if ('phrase' in artifact && 'translation' in artifact) return 'PhraseItem'
  if ('turns' in artifact && Array.isArray((artifact as { turns: unknown }).turns)) return 'Dialogue'
  if ('objective' in artifact && 'content_blocks' in artifact) return 'LessonBlueprint'
  if ('lesson_template_id' in artifact && 'content_payload' in artifact) return 'LessonInstance'
  if ('exercise_template_id' in artifact && 'payload' in artifact) return 'ExerciseInstance'
  if ('exam_module_id' in artifact && 'task_type' in artifact) return 'ExamTask'
  if ('learner_level' in artifact) return 'ReflectionLessonDraft'
  if ('target_word_or_phrase' in artifact) return 'PronunciationTarget'
  return 'Unknown'
}

export function validateSchema(artifact: NormalizedArtifact, _context: ValidationContext): CheckResult[] {
  const type = getArtifactType(artifact)
  if (type === 'Unknown') {
    return [{ name: 'schema', passed: false, message: 'Unknown artifact type', severity: 'error' }]
  }
  const schema = schemaMap[type]
  const result = schema.safeParse(artifact)
  if (result.success) return [{ name: 'schema', passed: true }]
  const message = result.error?.message ?? 'Validation failed'
  return [{ name: 'schema', passed: false, message, severity: 'error' }]
}
