import type { UserProfileDocumentV1 } from '@/lib/profile/profileTypes'

/** Drives home secondary card ordering and emphasis (keep branching shallow). */
export type HomeLearnerIntent = 'exam_focused' | 'practical_focused' | 'lesson_first'

/**
 * Uses durable profile signals only (selected path, primary goal, learning reason).
 * Defaults to lesson_first when signals are missing or ambiguous.
 */
export function resolveHomeLearnerIntent(
  doc: Pick<
    UserProfileDocumentV1,
    'selectedPath' | 'primaryGoalId' | 'learningReasonId'
  > | null
): HomeLearnerIntent {
  if (!doc) return 'lesson_first'

  if (doc.selectedPath === 'exam_prep') return 'exam_focused'
  if (doc.selectedPath === 'a2_mastery') return 'practical_focused'

  if (doc.primaryGoalId === 'exam_inburgering') return 'exam_focused'
  if (
    doc.primaryGoalId === 'everyday_dutch' ||
    doc.primaryGoalId === 'speaking_more' ||
    doc.primaryGoalId === 'work_life_nl'
  ) {
    return 'practical_focused'
  }

  if (doc.learningReasonId === 'exam_visa') return 'exam_focused'

  return 'lesson_first'
}
