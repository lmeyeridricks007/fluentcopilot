/**
 * Content engine — Zod schemas for generated content artifacts.
 * Used for parse validation and normalization.
 */

import { z } from 'zod'

const metadataSchema = z.object({
  locale: z.string(),
  cefr_level: z.string().optional(),
  scenario_id: z.string().optional(),
  scenario_code: z.string().optional(),
  topic: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  version: z.number(),
  status: z.enum(['draft', 'in_review', 'approved', 'published', 'deprecated']),
  source: z.enum(['authored', 'ai_generated', 'imported', 'runtime']),
})

const provenanceSchema = z.object({
  prompt_template_id: z.string().optional(),
  prompt_template_code: z.string(),
  prompt_version: z.number(),
  model_id: z.string(),
  input_hash: z.string(),
  validator_results: z.record(z.unknown()).optional(),
  generation_batch_id: z.string().optional(),
})

const translationSchema = z.object({ locale: z.string(), text: z.string() })
const exampleSentenceSchema = z.object({ text: z.string(), translation: z.string().optional() })

export const vocabularyItemSchema = z.object({
  id: z.string().optional(),
  client_generated_id: z.string().optional(),
  lemma: z.string(),
  base_form: z.string().optional(),
  locale: z.string(),
  cefr_level: z.string(),
  part_of_speech: z.string().optional(),
  translations: z.array(translationSchema),
  example_sentences: z.array(exampleSentenceSchema).optional(),
  pronunciation_hints: z.string().optional(),
  phoneme_guidance: z.unknown().optional(),
  scenario_tags: z.array(z.string()).optional(),
  frequency_score: z.number().optional(),
  difficulty_score: z.number().optional(),
  metadata: metadataSchema.optional(),
  provenance: provenanceSchema.optional(),
})

export const phraseItemSchema = z.object({
  id: z.string().optional(),
  client_generated_id: z.string().optional(),
  phrase: z.string(),
  translation: z.string(),
  locale: z.string(),
  intent: z.string().optional(),
  formality: z.string().optional(),
  variants: z.array(z.string()).optional(),
  follow_ups: z.array(z.string()).optional(),
  common_mistakes: z.array(z.string()).optional(),
  metadata: metadataSchema.optional(),
  provenance: provenanceSchema.optional(),
})

const dialogueTurnSchema = z.object({
  speaker: z.string(),
  text: z.string(),
  translation: z.string().optional(),
})

export const dialogueSchema = z.object({
  id: z.string().optional(),
  client_generated_id: z.string().optional(),
  scenario_id: z.string().optional(),
  scenario_code: z.string(),
  locale: z.string(),
  cefr_level: z.string().optional(),
  turns: z.array(dialogueTurnSchema).min(1),
  participant_labels: z.array(z.string()).optional(),
  metadata: metadataSchema.optional(),
  provenance: provenanceSchema.optional(),
})

const contentBlockSchema = z.object({
  type: z.string(),
  content_ref: z.string().optional(),
  content: z.unknown().optional(),
})

export const lessonBlueprintSchema = z.object({
  id: z.string().optional(),
  client_generated_id: z.string().optional(),
  objective: z.string(),
  locale: z.string(),
  content_blocks: z.array(contentBlockSchema),
  cefr_level: z.string().optional(),
  scenario_id: z.string().optional(),
  topic: z.string().optional(),
  example_ids: z.array(z.string()).optional(),
  exercise_template_ids: z.array(z.string()).optional(),
  metadata: metadataSchema.optional(),
  provenance: provenanceSchema.optional(),
})

export const lessonInstanceSchema = z.object({
  id: z.string().optional(),
  client_generated_id: z.string().optional(),
  lesson_template_id: z.string(),
  content_payload: z.record(z.unknown()),
  locale: z.string(),
  lesson_blueprint_id: z.string().optional(),
  cefr_level: z.string().optional(),
  scenario_id: z.string().optional(),
  metadata: metadataSchema.optional(),
  provenance: provenanceSchema.optional(),
})

export const exerciseInstanceSchema = z.object({
  id: z.string().optional(),
  client_generated_id: z.string().optional(),
  exercise_template_id: z.string(),
  payload: z.record(z.unknown()),
  locale: z.string(),
  lesson_id: z.string().optional(),
  cefr_level: z.string().optional(),
  source_vocabulary_ids: z.array(z.string()).optional(),
  metadata: metadataSchema.optional(),
  provenance: provenanceSchema.optional(),
})

export const examTaskSchema = z.object({
  id: z.string().optional(),
  client_generated_id: z.string().optional(),
  exam_module_id: z.string(),
  task_type: z.string(),
  prompt: z.string().optional(),
  payload: z.record(z.unknown()),
  locale: z.string(),
  scoring_criteria: z.unknown().optional(),
  difficulty: z.string().optional(),
  metadata: metadataSchema.optional(),
  provenance: provenanceSchema.optional(),
})

export const reflectionLessonDraftSchema = z.object({
  id: z.string().optional(),
  client_generated_id: z.string().optional(),
  learner_level: z.string(),
  locale: z.string(),
  lesson_outline: z.string().optional(),
  content_blocks: z.array(z.unknown()).optional(),
  source_notes_hash: z.string().optional(),
  vocabulary_used: z.array(z.string()).optional(),
  exercises_suggested: z.array(z.string()).optional(),
  metadata: metadataSchema.optional(),
  provenance: provenanceSchema.optional(),
})

export const pronunciationTargetSchema = z.object({
  id: z.string().optional(),
  client_generated_id: z.string().optional(),
  target_word_or_phrase: z.string(),
  locale: z.string(),
  phoneme_structure: z.unknown().optional(),
  stress_pattern: z.string().optional(),
  scoring_thresholds: z.unknown().optional(),
  corrective_feedback_templates: z.array(z.unknown()).optional(),
  metadata: metadataSchema.optional(),
  provenance: provenanceSchema.optional(),
})

export type VocabularyItemInput = z.infer<typeof vocabularyItemSchema>
export type DialogueInput = z.infer<typeof dialogueSchema>
export type LessonBlueprintInput = z.infer<typeof lessonBlueprintSchema>
export type ExerciseInstanceInput = z.infer<typeof exerciseInstanceSchema>
