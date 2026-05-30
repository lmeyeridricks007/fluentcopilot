/**
 * Merges step-level feedbackConfig with engine defaults for learner-facing copy.
 */
import type { FeedbackConfig } from '@/lib/schemas/feedback.schema'

export type FeedbackTone = 'idle' | 'correct' | 'incorrect' | 'hint'

export function mergeStepFeedback(
  config: FeedbackConfig | undefined,
  tone: FeedbackTone
): { title?: string; body: string; errorTags?: string[] } {
  const tags = config?.errorTags
  switch (tone) {
    case 'correct':
      return {
        body: config?.correctFeedback ?? 'Goed zo — precies goed.',
        errorTags: tags,
      }
    case 'incorrect':
      return {
        body: config?.incorrectFeedback ?? 'Bijna — probeer het nog een keer.',
        errorTags: tags,
      }
    case 'hint':
      return {
        body: config?.hint ?? 'Tip: lees de zin hardop in je hoofd.',
        errorTags: tags,
      }
    default:
      return { body: '', errorTags: tags }
  }
}
