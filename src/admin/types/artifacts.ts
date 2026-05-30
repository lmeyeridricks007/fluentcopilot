/**
 * Admin — artifact and review queue types.
 */

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
  | 'PromptTemplate'

export type ReviewStatus = 'pending_review' | 'in_review' | 'completed'
export type PublishStatus = 'draft' | 'approved' | 'published' | 'archived'
export type ReviewDecision = 'approve' | 'reject' | 'edit_and_approve' | 'send_for_regeneration'

export interface ValidationResult {
  passed: boolean
  score: number | null
  checks: Array<{ name: string; passed: boolean; message?: string }>
  severity: 'error' | 'warning' | 'info'
}

export interface Provenance {
  prompt_template_code: string
  prompt_version: number
  model_provider?: string
  model_id?: string
  generated_at: string
  source_inputs?: Record<string, unknown>
}

export interface ReviewQueueItem {
  id: string
  artifact_type: ArtifactType
  artifact_id: string
  title: string
  scenario?: string
  cefr_level?: string
  target_language: string
  validation_status: 'pass' | 'fail' | 'warning'
  validation_score: number | null
  review_status: ReviewStatus
  publish_status: PublishStatus
  batch_id?: string
  prompt_template_code?: string
  prompt_version?: number
  created_at: string
  updated_at: string
  assigned_to?: string
  decided_at?: string
  decision?: ReviewDecision
}

export interface ArtifactDetail extends ReviewQueueItem {
  content: Record<string, unknown>
  validation_report: ValidationResult
  provenance?: Provenance
  scenario_context?: Record<string, unknown>
  version_history?: VersionEntry[]
  reviewer_notes?: string
}

export interface VersionEntry {
  version: number
  created_at: string
  created_by?: string
  status: PublishStatus
  summary?: string
}

export interface ReviewDecisionPayload {
  decision: ReviewDecision
  decided_by: string
  notes?: string
  edited_snapshot?: Record<string, unknown>
  reject_reason?: string
  regeneration_intent?: string
}
