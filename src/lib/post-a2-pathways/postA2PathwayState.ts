import type { PostA2NextOptionId } from '@/lib/post-a2/types'
import type { RetentionProfile } from '@/lib/retention/types'

export type PostA2PathwayChoice = PostA2NextOptionId

const VALID: ReadonlySet<string> = new Set(['continue_b1', 'a2_mastery', 'exam_preparation'])

export const META_POST_A2_PATHWAY_CHOICE = 'postA2PathwayChoice' as const
export const META_POST_A2_PATHWAY_AT = 'postA2PathwayChosenAt' as const
export const META_POST_A2_LAST_RECOMMENDED = 'postA2LastRecommendedId' as const

export function parsePostA2PathwayChoice(raw: unknown): PostA2PathwayChoice | null {
  if (typeof raw === 'string' && VALID.has(raw)) return raw as PostA2PathwayChoice
  return null
}

export function readPostA2PathwayState(profile: RetentionProfile | null): {
  choice: PostA2PathwayChoice | null
  chosenAt: string | null
  lastRecommendedId: PostA2PathwayChoice | null
} {
  if (!profile) {
    return { choice: null, chosenAt: null, lastRecommendedId: null }
  }
  const meta = profile.metadata
  return {
    choice: parsePostA2PathwayChoice(meta[META_POST_A2_PATHWAY_CHOICE]),
    chosenAt: typeof meta[META_POST_A2_PATHWAY_AT] === 'string' ? (meta[META_POST_A2_PATHWAY_AT] as string) : null,
    lastRecommendedId: parsePostA2PathwayChoice(meta[META_POST_A2_LAST_RECOMMENDED]),
  }
}

export function withPostA2PathwayCommitted(
  profile: RetentionProfile,
  choice: PostA2PathwayChoice,
  recommendedId?: PostA2NextOptionId
): RetentionProfile {
  const nextMeta: Record<string, unknown> = {
    ...profile.metadata,
    [META_POST_A2_PATHWAY_CHOICE]: choice,
    [META_POST_A2_PATHWAY_AT]: new Date().toISOString(),
  }
  if (recommendedId) {
    nextMeta[META_POST_A2_LAST_RECOMMENDED] = recommendedId
  }
  return { ...profile, metadata: nextMeta }
}
