/**
 * Content engine — repository interfaces (storage contracts).
 * Implementations persist to DB; engine only depends on these interfaces.
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
import type { ReviewQueueItem, ReviewDecision, PublishRecord } from '../types/pipeline.js'

export interface StoredArtifact {
  artifact_type: string
  id: string
  client_generated_id?: string
  version: number
}

export interface IVocabularyRepository {
  save(items: VocabularyItem[]): Promise<StoredArtifact[]>
  findByIds(ids: string[]): Promise<VocabularyItem[]>
}

export interface IPhraseRepository {
  save(items: PhraseItem[]): Promise<StoredArtifact[]>
}

export interface IDialogueRepository {
  save(dialogue: Dialogue): Promise<StoredArtifact>
}

export interface ILessonBlueprintRepository {
  save(blueprint: LessonBlueprint): Promise<StoredArtifact>
}

export interface ILessonInstanceRepository {
  save(instance: LessonInstance): Promise<StoredArtifact>
}

export interface IExerciseRepository {
  save(exercises: ExerciseInstance[]): Promise<StoredArtifact[]>
}

export interface IExamTaskRepository {
  save(tasks: ExamTask[]): Promise<StoredArtifact[]>
}

export interface IReflectionDraftRepository {
  save(draft: ReflectionLessonDraft): Promise<StoredArtifact>
}

export interface IReviewQueueRepository {
  add(item: ReviewQueueItem): Promise<string>
  updateDecision(itemId: string, decision: ReviewDecision): Promise<void>
}

export interface IPublishRecordRepository {
  add(record: PublishRecord): Promise<string>
}

export interface IGenerationBatchRepository {
  create(batchId: string, jobType: string, totalCount: number): Promise<void>
  updateProgress(batchId: string, processed: number, artifactIds: string[], errors: Array<{ index: number; message: string }>): Promise<void>
  complete(batchId: string, status: 'completed' | 'failed' | 'partial'): Promise<void>
}
