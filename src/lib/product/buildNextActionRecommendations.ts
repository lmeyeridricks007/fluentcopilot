/**
 * Composes prioritized next actions for Coach / Talk / cross-sell surfaces.
 */
import type { PracticeHubViewModel } from '@/features/practice-hub/types'
import { buildNextBestAction } from '@/lib/dashboard/nextBestAction'
import type { PostA2NextOptionId } from '@/lib/post-a2/types'
import { APP_EXAM_HUB, APP_LIBRARY_HUB, APP_TALK_HUB } from '@/lib/routing/appRoutes'
import type { NextActionRecommendation } from './nextActionTypes'

export function buildNextActionRecommendations(input: {
  practice: PracticeHubViewModel
  lessonFallback: { title: string; href: string } | null
  postA2PathwayFocus?: PostA2NextOptionId | null
}): NextActionRecommendation[] {
  const primary = buildNextBestAction(input)
  const list: NextActionRecommendation[] = [
    {
      id: `nba-${primary.kind}`,
      kind:
        primary.kind === 'weak_area_fix'
          ? 'fix_mistake'
          : primary.kind === 'daily_mission'
            ? 'continue_conversation'
            : 'generic',
      source: 'system',
      title: primary.title,
      subtitle: primary.subline,
      ctaLabel: primary.ctaLabel,
      href: primary.href,
      priority: primary.kind === 'weak_area_fix' ? 'high' : 'normal',
      reason: primary.eyebrow,
    },
  ]

  list.push({
    id: 'exam-readiness-nudge',
    kind: 'exam_step',
    source: 'exam',
    title: 'Check A2 / B1 readiness',
    subtitle: 'Tie practice to exam tasks — see what still costs points.',
    ctaLabel: 'Open Exam',
    href: APP_EXAM_HUB,
    priority: 'normal',
  })

  list.push({
    id: 'library-activation',
    kind: 'library_activation',
    source: 'library',
    title: 'Use your saved words',
    subtitle: 'Pull vocabulary into the next conversation or reading-aloud rep.',
    ctaLabel: 'Open Library',
    href: APP_LIBRARY_HUB,
    priority: 'low',
  })

  list.push({
    id: 'talk-hub',
    kind: 'continue_conversation',
    source: 'talk',
    title: 'Back to Talk',
    subtitle: 'Continue messaging or voice practice where you left off.',
    ctaLabel: 'Go to Talk',
    href: APP_TALK_HUB,
    priority: 'low',
  })

  return list
}
