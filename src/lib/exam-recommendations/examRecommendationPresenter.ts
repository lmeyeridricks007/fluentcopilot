/**
 * Map recommendations → feedback NextBestAction + UI helpers.
 */
import type { NextBestAction } from '@/lib/schemas/exam/feedbackBlock.schema'
import type { ExamRecommendation, ExamRecommendationBundle } from '@/lib/exam-recommendations/types'

export type ExamRecommendationCardVm = {
  id: string
  kind: ExamRecommendation['kind']
  title: string
  reason: string
  rationaleSource: string
  priority: number
  estimatedMinutes?: number
  href: string
  ctaLabel: string
  badge: string
}

function nextBestKind(
  r: ExamRecommendation
): 'practice_scenario' | 'skill_track' | 'lesson' | 'review_session' | 'exam_exercise' {
  switch (r.kind) {
    case 'scenario':
      return 'practice_scenario'
    case 'drill':
      return r.targetId.startsWith('kmn-') ? 'exam_exercise' : 'skill_track'
    case 'lesson':
      return 'lesson'
    case 'review':
      return 'review_session'
    default:
      return 'skill_track'
  }
}

/** Persist exam routing in NextBestAction.metadata for href resolution + analytics. */
export function examRecommendationsToNextBestActions(
  bundle: ExamRecommendationBundle,
  ctx: { source: string }
): NextBestAction[] {
  return bundle.recommendations.map((r) => ({
    id: `exam-rec-${r.priority}-${r.rationaleSource}`.replace(/[^a-zA-Z0-9-_]/g, '-'),
    kind: nextBestKind(r),
    targetId: r.targetId,
    label: r.title,
    rationale: r.reason,
    metadata: {
      href: r.href,
      examRecKind: r.kind,
      rationaleSource: r.rationaleSource,
      priority: r.priority,
      estimatedMinutes: r.estimatedMinutes,
      ctaLabel: r.ctaLabel,
      scoreBand: bundle.scoreBand,
      source: ctx.source,
    },
  }))
}

export function presentExamRecommendations(bundle: ExamRecommendationBundle): ExamRecommendationCardVm[] {
  const kindBadge: Record<ExamRecommendation['kind'], string> = {
    scenario: 'Scenario',
    drill: 'Drill',
    lesson: 'Lesson',
    review: 'Review',
  }
  return bundle.recommendations.map((r) => ({
    id: `exam-card-${r.priority}-${r.targetId}`,
    kind: r.kind,
    title: r.title,
    reason: r.reason,
    rationaleSource: r.rationaleSource,
    priority: r.priority,
    estimatedMinutes: r.estimatedMinutes,
    href: r.href,
    ctaLabel: r.ctaLabel,
    badge: kindBadge[r.kind],
  }))
}
