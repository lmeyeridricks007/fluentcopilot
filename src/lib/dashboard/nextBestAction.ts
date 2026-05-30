/**
 * Picks the single highest-priority “what now” action for dashboard surfaces.
 */
import type { PracticeHubViewModel } from '@/features/practice-hub/types'
import type { PostA2NextOptionId } from '@/lib/post-a2/types'
import { NEXT_BEST_CTA } from '@/lib/dashboard/nextBestActionCtas'
import { APP_TALK_HUB } from '@/lib/routing/appRoutes'

export type NextBestActionKind =
  | 'daily_mission'
  | 'weak_area_fix'
  | 'continue_practice'
  | 'recommended_scenario'
  | 'lesson'
  | 'practice_hub'
  | 'post_a2_b1'
  | 'post_a2_mastery'
  | 'post_a2_exam'

export type NextBestActionVm = {
  kind: NextBestActionKind
  eyebrow: string
  title: string
  subline: string
  ctaLabel: string
  href: string
  /** When kind is daily_mission */
  missionProgress?: { current: number; target: number }
  xpHint?: number
}

function missionSublineWithWeak(
  missionDescription: string,
  weakHeadline: string | undefined
): string {
  if (!weakHeadline) return missionDescription
  return `${missionDescription} Nudge: ${weakHeadline}.`
}

export function buildNextBestAction(input: {
  practice: PracticeHubViewModel
  /** When no practice CTA wins, fall back to first “continue” lesson */
  lessonFallback: { title: string; href: string } | null
  /** When set (A2 complete + learner chose a path), hero spotlights that commitment. */
  postA2PathwayFocus?: PostA2NextOptionId | null
}): NextBestActionVm {
  const { practice, lessonFallback, postA2PathwayFocus } = input

  if (postA2PathwayFocus === 'continue_b1') {
    return {
      kind: 'post_a2_b1',
      eyebrow: 'Your chosen path',
      title: 'Start B1',
      subline: 'Structured lessons at the next level — Practice and Exam Prep stay one tap away.',
      ctaLabel: NEXT_BEST_CTA.openB1,
      href: '/app/learn/b1',
    }
  }
  if (postA2PathwayFocus === 'a2_mastery') {
    return {
      kind: 'post_a2_mastery',
      eyebrow: 'Your chosen path',
      title: 'A2 Mastery',
      subline: 'Scenarios, missions, skill tracks, and your mastery map — build calm real-life Dutch.',
      ctaLabel: NEXT_BEST_CTA.openPractice,
      href: APP_TALK_HUB,
    }
  }
  if (postA2PathwayFocus === 'exam_preparation') {
    return {
      kind: 'post_a2_exam',
      eyebrow: 'Your chosen path',
      title: 'Exam preparation',
      subline: 'Speaking, writing, listening, reading, KNM — plus practice exams and readiness.',
      ctaLabel: NEXT_BEST_CTA.openExamPrep,
      href: '/app/exam-prep',
    }
  }

  const m = practice.dailyMission
  const topWeak = practice.weakAreas[0]

  if (!m.completed && m.progressCurrent < m.progressTarget) {
    return {
      kind: 'daily_mission',
      eyebrow: 'Today',
      title: m.title,
      subline: missionSublineWithWeak(m.description, topWeak?.headline ?? topWeak?.label),
      ctaLabel: NEXT_BEST_CTA.practiceNow,
      href: m.href,
      missionProgress: { current: m.progressCurrent, target: m.progressTarget },
      xpHint: m.xpReward,
    }
  }

  if (topWeak) {
    const sub = [topWeak.whyItMatters, topWeak.basedOn].filter(Boolean).join(' ')
    return {
      kind: 'weak_area_fix',
      eyebrow: 'Focus',
      title: topWeak.headline ?? topWeak.label,
      subline: sub || 'A quick rep here closes the loop from recent practice.',
      ctaLabel: NEXT_BEST_CTA.practiceNow,
      href: topWeak.href,
    }
  }

  const cont = practice.continueItem ?? practice.fallbackPrimary
  if (cont) {
    return {
      kind: 'continue_practice',
      eyebrow: 'Keep going',
      title: cont.title,
      subline: cont.summary,
      ctaLabel: NEXT_BEST_CTA.continue,
      href: cont.href,
    }
  }

  const rec = practice.recommendations[0]
  if (rec) {
    return {
      kind: 'recommended_scenario',
      eyebrow: 'Suggested',
      title: rec.title,
      subline: rec.reason,
      ctaLabel: NEXT_BEST_CTA.practiceNow,
      href: rec.href,
    }
  }

  if (lessonFallback) {
    return {
      kind: 'lesson',
      eyebrow: 'Your path',
      title: lessonFallback.title,
      subline: 'Lessons bridge the gap between drills and real conversations.',
      ctaLabel: NEXT_BEST_CTA.openLearn,
      href: lessonFallback.href,
    }
  }

  return {
    kind: 'practice_hub',
    eyebrow: 'Practice',
    title: 'Practice hub',
    subline: 'Scenarios, tracks, and missions — tuned to where you are.',
    ctaLabel: NEXT_BEST_CTA.openPractice,
    href: APP_TALK_HUB,
  }
}
