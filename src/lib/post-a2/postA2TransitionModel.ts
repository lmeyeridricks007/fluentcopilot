import { evaluateReadinessForB1 } from '@/lib/post-a2/readinessEvaluator'
import { buildPostA2RecommendedOption } from '@/lib/post-a2-pathways/postA2RecommendationEngine'
import { buildMasteryPathPresentation } from '@/lib/post-a2/masteryPathBuilder'
import { buildExamPrepPathPresentation } from '@/lib/post-a2/examPrepPathBuilder'
import { POST_A2_PATH_HREFS } from '@/lib/post-a2/postA2PathRouter'
import type { PostA2TransitionViewModel } from '@/lib/post-a2/types'
import type { AbilityBandCounts } from '@/lib/post-a2/readinessEvaluator'

const JOURNEY_TITLE = 'Your next chapter after A2'
const JOURNEY_SUBTITLE =
  'You finished A2. Choose B1, A2 Mastery, or Exam preparation — or switch later from Progress.'

export function buildPostA2TransitionViewModel(input: {
  bands: AbilityBandCounts
  weakTagsCount: number
  weakAbilityTitles?: string[]
  recentExamAttemptCount: number
  examHabitStreakDays: number
}): PostA2TransitionViewModel {
  const readiness = evaluateReadinessForB1({
    bands: input.bands,
    weakTagsCount: input.weakTagsCount,
    weakAbilityTitles: input.weakAbilityTitles,
  })
  const recommendedId = buildPostA2RecommendedOption({
    readinessLevel: readiness.level,
    recentExamAttemptCount: input.recentExamAttemptCount,
    examHabitStreakDays: input.examHabitStreakDays,
  })
  const masteryPath = buildMasteryPathPresentation()
  const examPrepPath = buildExamPrepPathPresentation()

  const options: PostA2TransitionViewModel['options'] = [
    {
      id: 'continue_b1',
      eyebrow: 'Option A',
      title: 'Start B1',
      body: 'Move into more advanced Dutch when you want the next curriculum chapter.',
      href: POST_A2_PATH_HREFS.continueB1,
      ctaLabel: 'Start B1',
      variant: 'secondary',
      recommended: recommendedId === 'continue_b1',
    },
    {
      id: 'a2_mastery',
      eyebrow: 'Option B',
      title: 'A2 Mastery',
      body: 'Strengthen confidence in real-life Dutch before moving on — scenarios, skill tracks, weaknesses, and your mastery map.',
      href: POST_A2_PATH_HREFS.a2Mastery,
      ctaLabel: masteryPath.primaryCtaLabel,
      variant: 'featured',
      recommended: recommendedId === 'a2_mastery',
    },
    {
      id: 'exam_preparation',
      eyebrow: 'Option C',
      title: 'Exam preparation',
      body: 'Train for the Dutch A2 exam and inburgering — speaking, writing, listening, reading, KNM, and practice exams.',
      href: POST_A2_PATH_HREFS.examPreparation,
      ctaLabel: examPrepPath.primaryCtaLabel,
      variant: 'primary',
      recommended: recommendedId === 'exam_preparation',
    },
  ]

  return {
    journeyTitle: JOURNEY_TITLE,
    journeySubtitle: JOURNEY_SUBTITLE,
    completionHeadline: 'You finished A2',
    completionBody:
      'You can handle many everyday Dutch situations. What matters next is your goal: the next level, real-life confidence, or passing the exam.',
    readiness,
    recommendedId,
    options,
    masteryPath,
    examPrepPath,
    recommendationContext: {
      recentExamAttemptCount: input.recentExamAttemptCount,
      examHabitStreakDays: input.examHabitStreakDays,
    },
  }
}
