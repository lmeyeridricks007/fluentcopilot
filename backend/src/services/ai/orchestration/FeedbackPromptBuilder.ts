import type { FeedbackMode } from '../../../models/contracts'
import { feedbackPolicyPartial } from '../../../prompts/partials/feedbackPolicy'

/** Feedback timing policy (per-turn vs end) for turn system prompts. */
export function buildFeedbackPolicyBlock(feedbackMode: FeedbackMode): string {
  return feedbackPolicyPartial(feedbackMode)
}
