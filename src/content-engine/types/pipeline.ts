/**
 * Content engine — pipeline and prompt execution types.
 */

import type { NormalizedArtifact } from './artifacts.js'
import type { ValidationReport } from './validation.js'

export interface PromptTemplateRef {
  code: string
  version: number
  template_body: string
  input_schema: Record<string, unknown>
  output_schema: Record<string, unknown>
  constraints: { max_tokens?: number; temperature?: number }
  safety_requirements?: Record<string, unknown>
}

export interface InvokeRequest {
  prompt: string
  system_prompt?: string
  max_tokens: number
  temperature: number
  model_id?: string
  stop_sequences?: string[]
}

export interface InvokeResult {
  raw_response: string
  model_id: string
  usage: { input_tokens: number; output_tokens: number }
  finish_reason?: string
}

export interface ParsedOutput<T> {
  success: true
  data: T
}

export interface ParseError {
  success: false
  message: string
  partial?: unknown
}

export type ParseResult<T> = ParsedOutput<T> | ParseError

export interface PipelineResult {
  success: boolean
  stored_artifacts?: Array<{ artifact_type: string; id: string; client_generated_id?: string; version: number }>
  errors?: string[]
  validation_reports?: ValidationReport[]
}

export interface ReviewQueueItem {
  id: string
  artifact_type: string
  artifact_id?: string
  artifact_snapshot: NormalizedArtifact
  source_inputs: Record<string, unknown>
  prompt_template_code: string
  prompt_version: number
  validation_report: ValidationReport
  quality_score?: number
  status: 'pending_review' | 'in_review' | 'completed'
  assigned_to?: string
  assigned_at?: string
  decided_at?: string
  decision?: ReviewDecision
  created_at: string
}

export type ReviewDecisionType = 'approve' | 'reject' | 'edit_and_approve' | 'send_for_regeneration'

export interface ReviewDecision {
  decision: ReviewDecisionType
  decided_by: string
  decided_at: string
  notes?: string
  edited_artifact_snapshot?: unknown
}

export interface PublishRecord {
  artifact_type: string
  artifact_id: string
  content_version_id?: string
  published_at: string
  published_by: string
  release_batch_id?: string
  targeting_rules?: Record<string, unknown>
}
