/**
 * Canonical task-type overlay weights (merged with profile blueprint + per-task dimensions).
 * Shared dimensions live in profile.coreWeights; overlays add task-specific emphasis.
 */
import type { ExamScoringDimension, ExamTaskType } from './types'

export const CANONICAL_TASK_OVERLAYS: Partial<
  Record<ExamTaskType, Partial<Record<ExamScoringDimension, number>>>
> = {
  practical_request: {
    directness: 0.95,
    politeness: 1.05,
    completion: 0.9,
    clarity: 0.85,
  },
  give_opinion: {
    stance: 1.1,
    reason: 1.1,
    structure: 0.75,
    natural_wording: 0.55,
  },
  follow_up_response: {
    responsiveness: 1.15,
    relevance: 1.05,
    continuation: 1.05,
  },
  storytelling: {
    sequence: 1,
    tense_flow: 0.85,
    clarity: 0.9,
  },
  explain_process: {
    sequence: 1.05,
    completeness: 1,
    clarity: 0.95,
  },
  compare_options: {
    structure: 0.75,
    clarity: 0.85,
    stance: 0.55,
  },
  knowledge_mcq: {
    task_completion: 1.2,
    relevance: 1.05,
    listening_accuracy: 0.85,
  },
  listening_mcq_exam: {
    task_completion: 1.15,
    relevance: 1,
    listening_accuracy: 1.15,
  },
  justify_reason: {
    reason: 1.15,
    structure: 0.7,
    clarity: 0.6,
  },
  roleplay: {
    responsiveness: 0.85,
    politeness: 0.75,
    natural_wording: 0.55,
  },
}
