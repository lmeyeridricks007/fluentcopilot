import type { BatchRun } from '../types/batches'

export const MOCK_BATCHES: BatchRun[] = [
  {
    id: 'batch-1',
    name: 'Café & supermarket A1–A2',
    status: 'completed',
    started_at: '2025-03-10T08:00:00Z',
    completed_at: '2025-03-10T10:30:00Z',
    artifact_type: 'Dialogue',
    scenario_id: 'cafe',
    cefr_level: 'A1',
    counts: {
      total: 12,
      generated: 12,
      failed_validation: 0,
      pending_review: 8,
      approved: 3,
      rejected: 1,
      published: 2,
    },
  },
  {
    id: 'batch-2',
    name: 'Doctor & office B1',
    status: 'partial',
    started_at: '2025-03-09T14:00:00Z',
    completed_at: '2025-03-09T15:00:00Z',
    artifact_type: 'LessonBlueprint',
    scenario_id: 'doctor_visit',
    cefr_level: 'B1',
    counts: {
      total: 10,
      generated: 9,
      failed_validation: 2,
      pending_review: 5,
      approved: 2,
      rejected: 0,
      published: 0,
    },
  },
]
