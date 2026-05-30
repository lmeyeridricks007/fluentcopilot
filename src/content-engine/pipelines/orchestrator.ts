/**
 * Content engine — pipeline orchestrator interface and stub.
 * Runs: request formation → source load → prompt select → render → invoke → parse → normalize → validate → score → review route → persist.
 */

import type { GenerationRequest } from '../types/requests.js'
import type { PipelineResult } from '../types/pipeline.js'

export interface PipelineContext {
  locale: string
  batch_id?: string
  model_id?: string
}

export interface IGenerationPipeline {
  run(request: GenerationRequest, context?: PipelineContext): Promise<PipelineResult>
}

/**
 * Stub implementation: validates request, returns success with empty artifacts.
 * Real implementation wires: prompt registry, provider, validators, repositories.
 */
export class StubGenerationPipeline implements IGenerationPipeline {
  async run(request: GenerationRequest, _context?: PipelineContext): Promise<PipelineResult> {
    if (!request.locale || !request.artifact_type) {
      return {
        success: false,
        errors: ['Missing required request fields: locale, artifact_type'],
      }
    }
    return {
      success: true,
      stored_artifacts: [],
      validation_reports: [],
    }
  }
}

export interface RunBatchOptions {
  batch_id: string
  requests: GenerationRequest[]
  concurrency?: number
  onProgress?: (processed: number, total: number, lastError?: string) => void
}

export interface IBatchRunner {
  runBatch(options: RunBatchOptions): Promise<{
    success_count: number
    error_count: number
    artifact_ids: string[]
    errors: Array<{ request_index: number; error_message: string }>
  }>
}
