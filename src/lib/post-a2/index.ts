export type {
  B1ReadinessLevel,
  PostA2NextOptionId,
  ReadinessEvaluation,
  PostA2TransitionViewModel,
  PostA2OptionCardModel,
  MasteryPathPresentation,
  ExamPrepPathPresentation,
} from '@/lib/post-a2/types'
export {
  getRegisteredA2LessonIds,
  isA2CurriculumComplete,
  isA2PathCompleteMerged,
  isRegisteredA2Lesson,
} from '@/lib/post-a2/a2PathCompletion'
export { evaluateReadinessForB1 } from '@/lib/post-a2/readinessEvaluator'
export type { AbilityBandCounts, ReadinessEvaluatorInput } from '@/lib/post-a2/readinessEvaluator'
export { recommendedPostA2Option } from '@/lib/post-a2/postA2RecommendationBuilder'
export { POST_A2_TRANSITION_HREF, POST_A2_PATH_HREFS } from '@/lib/post-a2/postA2PathRouter'
export { buildMasteryPathPresentation } from '@/lib/post-a2/masteryPathBuilder'
export { buildExamPrepPathPresentation } from '@/lib/post-a2/examPrepPathBuilder'
export { buildPostA2TransitionViewModel } from '@/lib/post-a2/postA2TransitionModel'
export { buildAbilityBandCounts } from '@/lib/post-a2/postA2Signals'
export { weakAbilityTitlesForReadiness } from '@/lib/post-a2/readinessWeakTitles'
