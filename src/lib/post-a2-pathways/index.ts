export type { PostA2PathwayChoice } from '@/lib/post-a2-pathways/postA2PathwayState'
export {
  META_POST_A2_PATHWAY_AT,
  META_POST_A2_PATHWAY_CHOICE,
  META_POST_A2_LAST_RECOMMENDED,
  parsePostA2PathwayChoice,
  readPostA2PathwayState,
  withPostA2PathwayCommitted,
} from '@/lib/post-a2-pathways/postA2PathwayState'
export {
  buildPostA2RecommendedOption,
  type PostA2RecommendationSignals,
} from '@/lib/post-a2-pathways/postA2RecommendationEngine'
export { postA2PathwayHomeBanner, postA2PathwayShortLabel } from '@/lib/post-a2-pathways/postA2PathwayPresenter'
