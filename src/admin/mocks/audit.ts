import type { AuditEvent } from '../types/audit'

export const MOCK_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'aud-1',
    timestamp: '2025-03-10T12:00:00Z',
    actor_id: 'u1',
    actor_name: 'reviewer@example.com',
    action: 'review_decided',
    artifact_type: 'PhraseItem',
    artifact_id: 'art-p1',
    details: { decision: 'approve' },
  },
  {
    id: 'aud-2',
    timestamp: '2025-03-10T10:00:00Z',
    actor_id: 'system',
    actor_name: 'Generation Pipeline',
    action: 'artifact_created',
    artifact_type: 'Dialogue',
    artifact_id: 'art-d1',
    details: { batch_id: 'batch-1' },
  },
]
