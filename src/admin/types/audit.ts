/**
 * Admin — audit log types.
 */

export type AuditAction =
  | 'artifact_created'
  | 'artifact_updated'
  | 'review_decided'
  | 'artifact_published'
  | 'artifact_archived'
  | 'prompt_updated'
  | 'scenario_updated'

export interface AuditEvent {
  id: string
  timestamp: string
  actor_id: string
  actor_name: string
  action: AuditAction
  artifact_type?: string
  artifact_id?: string
  details?: Record<string, unknown>
}
