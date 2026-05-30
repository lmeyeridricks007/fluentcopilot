/**
 * Admin — mock review queue and artifact data.
 */

import type { ReviewQueueItem, ArtifactDetail, ValidationResult, Provenance } from '../types/artifacts'

export const MOCK_QUEUE_ITEMS: ReviewQueueItem[] = [
  {
    id: 'rq-1',
    artifact_type: 'Dialogue',
    artifact_id: 'art-d1',
    title: 'Café ordering – A1',
    scenario: 'cafe',
    cefr_level: 'A1',
    target_language: 'nl',
    validation_status: 'pass',
    validation_score: 92,
    review_status: 'pending_review',
    publish_status: 'draft',
    batch_id: 'batch-1',
    prompt_template_code: 'dialogue_cafe',
    prompt_version: 2,
    created_at: '2025-03-10T10:00:00Z',
    updated_at: '2025-03-10T10:00:00Z',
  },
  {
    id: 'rq-2',
    artifact_type: 'VocabularyItem',
    artifact_id: 'art-v1',
    title: 'Supermarket phrases – A2',
    scenario: 'supermarket_shop',
    cefr_level: 'A2',
    target_language: 'nl',
    validation_status: 'warning',
    validation_score: 78,
    review_status: 'in_review',
    publish_status: 'draft',
    batch_id: 'batch-1',
    prompt_template_code: 'vocab_scenario',
    prompt_version: 1,
    created_at: '2025-03-10T09:30:00Z',
    updated_at: '2025-03-10T11:00:00Z',
    assigned_to: 'reviewer@example.com',
  },
  {
    id: 'rq-3',
    artifact_type: 'LessonBlueprint',
    artifact_id: 'art-l1',
    title: 'Doctor visit – symptoms',
    scenario: 'doctor_visit',
    cefr_level: 'B1',
    target_language: 'nl',
    validation_status: 'fail',
    validation_score: 45,
    review_status: 'pending_review',
    publish_status: 'draft',
    batch_id: 'batch-2',
    created_at: '2025-03-09T14:00:00Z',
    updated_at: '2025-03-09T14:00:00Z',
  },
  {
    id: 'rq-4',
    artifact_type: 'PhraseItem',
    artifact_id: 'art-p1',
    title: 'Office introductions',
    scenario: 'office_introduction',
    cefr_level: 'A2',
    target_language: 'nl',
    validation_status: 'pass',
    validation_score: 88,
    review_status: 'completed',
    publish_status: 'approved',
    batch_id: 'batch-1',
    decided_at: '2025-03-10T12:00:00Z',
    decision: 'approve',
    created_at: '2025-03-10T08:00:00Z',
    updated_at: '2025-03-10T12:00:00Z',
  },
  {
    id: 'rq-5',
    artifact_type: 'ExamTask',
    artifact_id: 'art-e1',
    title: 'B1 Speaking – opinion',
    scenario: 'exam_speaking',
    cefr_level: 'B1',
    target_language: 'nl',
    validation_status: 'pass',
    validation_score: 95,
    review_status: 'pending_review',
    publish_status: 'draft',
    created_at: '2025-03-11T09:00:00Z',
    updated_at: '2025-03-11T09:00:00Z',
  },
]

const validationPass: ValidationResult = {
  passed: true,
  score: 92,
  checks: [
    { name: 'schema', passed: true },
    { name: 'length', passed: true },
    { name: 'safety', passed: true },
  ],
  severity: 'info',
}

const validationWarning: ValidationResult = {
  passed: false,
  score: 78,
  checks: [
    { name: 'schema', passed: true },
    { name: 'length', passed: false, message: 'Phrase list shorter than recommended' },
    { name: 'safety', passed: true },
  ],
  severity: 'warning',
}

const provenance: Provenance = {
  prompt_template_code: 'dialogue_cafe',
  prompt_version: 2,
  model_provider: 'openai',
  model_id: 'gpt-4o-mini',
  generated_at: '2025-03-10T10:00:00Z',
  source_inputs: { scenario_id: 'cafe', cefr_level: 'A1', locale: 'nl' },
}

export function getMockArtifactDetail(id: string): ArtifactDetail | null {
  const queueItem = MOCK_QUEUE_ITEMS.find((q) => q.artifact_id === id || q.id === id)
  if (!queueItem) return null
  const validation =
    queueItem.validation_status === 'pass'
      ? validationPass
      : queueItem.validation_status === 'warning'
        ? validationWarning
        : {
            passed: false,
            score: 45,
            checks: [
              { name: 'schema', passed: false, message: 'Missing required field: dialogue_turns' },
              { name: 'length', passed: true },
              { name: 'safety', passed: true },
            ],
            severity: 'error' as const,
          }
  return {
    ...queueItem,
    content:
      queueItem.artifact_type === 'Dialogue'
        ? {
            title_nl: 'Bestellen in het café',
            title_en: 'Ordering at the café',
            turns: [
              { role: 'learner', text_nl: 'Goedemiddag. Mag ik een koffie alstublieft?' },
              { role: 'assistant', text_nl: 'Natuurlijk. Wilt u er iets bij? Dat is €2,50.' },
            ],
          }
        : queueItem.artifact_type === 'VocabularyItem'
          ? { terms: [{ lemma: 'melk', translation: 'milk', example: 'Waar is de melk?' }] }
          : { title: queueItem.title, body: 'Mock content for ' + queueItem.artifact_type },
    validation_report: validation,
    provenance,
    scenario_context: { name: queueItem.scenario, goal: 'Practice real-life conversation' },
    version_history: [
      { version: 1, created_at: queueItem.created_at, status: 'draft', summary: 'Initial generation' },
    ],
  }
}
