/**
 * Global “next best action” model — surfaces across Talk, Coach, Exam, Library.
 */

export type NextActionSource =
  | 'talk'
  | 'coach'
  | 'exam'
  | 'library'
  | 'system'
  | 'recap'

export type NextActionKind =
  | 'continue_conversation'
  | 'fix_mistake'
  | 'exam_step'
  | 'reading_aloud'
  | 'recap'
  | 'library_activation'
  | 'speaking_drill'
  | 'generic'

export type NextActionPriority = 'low' | 'normal' | 'high' | 'urgent'

export type NextActionRecommendation = {
  id: string
  kind: NextActionKind
  source: NextActionSource
  title: string
  subtitle: string
  ctaLabel: string
  href: string
  priority: NextActionPriority
  /** For analytics / debugging */
  reason?: string
}
