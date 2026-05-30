/**
 * Content engine — artifact types (logical).
 * Persistence mapping to DB in repositories.
 */

export type ArtifactStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'deprecated'
export type ArtifactSource = 'authored' | 'ai_generated' | 'imported' | 'runtime'

export interface ArtifactMetadata {
  locale: string
  cefr_level?: string
  scenario_id?: string
  scenario_code?: string
  topic?: string
  created_at: string
  updated_at: string
  version: number
  status: ArtifactStatus
  source: ArtifactSource
}

export interface ArtifactProvenance {
  prompt_template_id?: string
  prompt_template_code: string
  prompt_version: number
  model_id: string
  input_hash: string
  validator_results?: Record<string, unknown>
  generation_batch_id?: string
}

export interface VocabularyItem {
  id?: string
  client_generated_id?: string
  lemma: string
  base_form?: string
  locale: string
  cefr_level: string
  part_of_speech?: string
  translations: Array<{ locale: string; text: string }>
  example_sentences?: Array<{ text: string; translation?: string }>
  pronunciation_hints?: string
  phoneme_guidance?: unknown
  scenario_tags?: string[]
  frequency_score?: number
  difficulty_score?: number
  metadata?: ArtifactMetadata
  provenance?: ArtifactProvenance
}

export interface PhraseItem {
  id?: string
  client_generated_id?: string
  phrase: string
  translation: string
  locale: string
  intent?: string
  formality?: string
  variants?: string[]
  follow_ups?: string[]
  common_mistakes?: string[]
  metadata?: ArtifactMetadata
  provenance?: ArtifactProvenance
}

export interface DialogueTurn {
  speaker: string
  text: string
  translation?: string
}

export interface Dialogue {
  id?: string
  client_generated_id?: string
  scenario_id?: string
  scenario_code: string
  locale: string
  cefr_level?: string
  turns: DialogueTurn[]
  participant_labels?: string[]
  metadata?: ArtifactMetadata
  provenance?: ArtifactProvenance
}

export interface LessonBlueprint {
  id?: string
  client_generated_id?: string
  objective: string
  locale: string
  content_blocks: Array<{ type: string; content_ref?: string; content?: unknown }>
  cefr_level?: string
  scenario_id?: string
  topic?: string
  example_ids?: string[]
  exercise_template_ids?: string[]
  metadata?: ArtifactMetadata
  provenance?: ArtifactProvenance
}

export interface LessonInstance {
  id?: string
  client_generated_id?: string
  lesson_template_id: string
  content_payload: Record<string, unknown>
  locale: string
  lesson_blueprint_id?: string
  cefr_level?: string
  scenario_id?: string
  metadata?: ArtifactMetadata
  provenance?: ArtifactProvenance
}

export interface ExerciseInstance {
  id?: string
  client_generated_id?: string
  exercise_template_id: string
  payload: Record<string, unknown>
  locale: string
  lesson_id?: string
  cefr_level?: string
  source_vocabulary_ids?: string[]
  metadata?: ArtifactMetadata
  provenance?: ArtifactProvenance
}

export interface PronunciationTarget {
  id?: string
  client_generated_id?: string
  target_word_or_phrase: string
  locale: string
  phoneme_structure?: unknown
  stress_pattern?: string
  scoring_thresholds?: unknown
  corrective_feedback_templates?: unknown[]
  metadata?: ArtifactMetadata
  provenance?: ArtifactProvenance
}

export interface ExamTask {
  id?: string
  client_generated_id?: string
  exam_module_id: string
  task_type: string
  prompt?: string
  payload: Record<string, unknown>
  locale: string
  scoring_criteria?: unknown
  difficulty?: string
  metadata?: ArtifactMetadata
  provenance?: ArtifactProvenance
}

export interface ReflectionLessonDraft {
  id?: string
  client_generated_id?: string
  learner_level: string
  locale: string
  lesson_outline?: string
  content_blocks?: unknown[]
  source_notes_hash?: string
  vocabulary_used?: string[]
  exercises_suggested?: string[]
  metadata?: ArtifactMetadata
  provenance?: ArtifactProvenance
}

export type NormalizedArtifact =
  | VocabularyItem
  | PhraseItem
  | Dialogue
  | LessonBlueprint
  | LessonInstance
  | ExerciseInstance
  | PronunciationTarget
  | ExamTask
  | ReflectionLessonDraft

export type ArtifactType =
  | 'VocabularyItem'
  | 'PhraseItem'
  | 'Dialogue'
  | 'LessonBlueprint'
  | 'LessonInstance'
  | 'ExerciseInstance'
  | 'PronunciationTarget'
  | 'ExamTask'
  | 'ReflectionLessonDraft'
