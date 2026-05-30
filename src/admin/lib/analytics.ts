/**
 * Admin — analytics event scaffolding (no provider wired).
 */

export const ADMIN_EVENTS = {
  review_queue_viewed: 'admin_review_queue_viewed',
  artifact_opened: 'admin_artifact_opened',
  artifact_approved: 'admin_artifact_approved',
  artifact_rejected: 'admin_artifact_rejected',
  artifact_edit_approve: 'admin_artifact_edit_approve',
  artifact_send_regeneration: 'admin_artifact_send_regeneration',
  batch_viewed: 'admin_batch_viewed',
  prompt_viewed: 'admin_prompt_viewed',
  audit_viewed: 'admin_audit_viewed',
  publish_clicked: 'admin_publish_clicked',
} as const

export function trackAdmin(event: string, payload?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && (window as unknown as { __adminTrack?: (e: string, p?: Record<string, unknown>) => void }).__adminTrack) {
    (window as unknown as { __adminTrack: (e: string, p?: Record<string, unknown>) => void }).__adminTrack(event, payload)
  }
}
