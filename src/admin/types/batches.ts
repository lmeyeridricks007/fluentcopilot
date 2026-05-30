/**
 * Admin — batch and generation run types.
 */

export type BatchStatus = 'running' | 'completed' | 'partial' | 'failed'

export interface BatchRun {
  id: string
  name: string
  status: BatchStatus
  started_at: string
  completed_at?: string
  artifact_type: string
  scenario_id?: string
  cefr_level?: string
  counts: {
    total: number
    generated: number
    failed_validation: number
    pending_review: number
    approved: number
    rejected: number
    published: number
  }
}
