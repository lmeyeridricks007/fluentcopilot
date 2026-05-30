/**
 * Top-level exam → practice recommendation entry point.
 */
import { scenarioCandidatesForExam } from '@/lib/exam-recommendations/examToScenarioMapper'
import { drillCandidatesForExam } from '@/lib/exam-recommendations/examToDrillMapper'
import { lessonCandidatesForExam } from '@/lib/exam-recommendations/examToLessonMapper'
import { reviewCandidatesForExam } from '@/lib/exam-recommendations/examToReviewMapper'
import { rankExamRecommendationCandidates } from '@/lib/exam-recommendations/examRecommendationRanker'
import type { ExamRecommendationBundle, ExamRecommendationInput } from '@/lib/exam-recommendations/types'

export function buildExamRecommendations(input: ExamRecommendationInput): ExamRecommendationBundle {
  const candidates = [
    ...scenarioCandidatesForExam(input),
    ...drillCandidatesForExam(input),
    ...lessonCandidatesForExam(input),
    ...reviewCandidatesForExam(input),
  ]
  const { recommendations, scoreBand } = rankExamRecommendationCandidates(input, candidates)
  return { input, recommendations, scoreBand }
}
