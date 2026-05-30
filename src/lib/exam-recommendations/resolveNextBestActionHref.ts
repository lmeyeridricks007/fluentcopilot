/**
 * Resolve navigation href for exam / practice next-step actions.
 */
import type { NextBestAction } from '@/lib/schemas/exam/feedbackBlock.schema'

export function resolveNextBestActionHref(a: NextBestAction): string {
  const m = a.metadata as Record<string, unknown> | undefined
  if (m && typeof m.href === 'string' && m.href.length > 0) return m.href

  switch (a.kind) {
    case 'skill_track':
      return `/app/practice/tracks/${encodeURIComponent(a.targetId)}`
    case 'practice_scenario':
      return `/app/practice/guided/${encodeURIComponent(a.targetId)}`
    case 'lesson':
      return `/app/learn/schema/${encodeURIComponent(a.targetId)}`
    case 'review_session':
      if (a.targetId === 'daily') return '/app/review/daily'
      if (a.targetId === 'mistakes') return '/app/review/mistakes'
      return '/app/library?tab=review'
    case 'exam_exercise':
      return '/app/exam-prep'
    default:
      return '/app/talk'
  }
}
