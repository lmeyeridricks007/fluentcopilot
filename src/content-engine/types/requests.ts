/**
 * Content engine — generation request and batch types.
 */

import type { ArtifactType } from './artifacts.js'

export interface GenerationRequest {
  id?: string
  artifact_type: ArtifactType
  locale: string
  params: Record<string, unknown>
  batch_id?: string
  priority?: number
}

export interface BatchOptions {
  chunk_size?: number
  concurrency?: number
  rate_limit_rpm?: number
  max_cost_usd?: number
  resume_from_checkpoint?: boolean
  stop_on_first_failure?: boolean
}

export interface BatchJob {
  batch_id: string
  job_type: string
  requests: GenerationRequest[]
  options: BatchOptions
}

export type BatchStatus = 'running' | 'completed' | 'failed' | 'partial'

export interface BatchResult {
  batch_id: string
  status: BatchStatus
  success_count: number
  error_count: number
  artifact_ids: string[]
  errors: Array<{ request_index: number; error_message: string }>
  total_estimated_cost?: number
}
