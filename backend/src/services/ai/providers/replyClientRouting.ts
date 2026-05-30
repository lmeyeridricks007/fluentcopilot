import type { AiConversationTurnRequest } from '../contracts/AiConversationTurnRequest'
import { isLanguageCoachScenarioSlug } from '../config/aiProviderConfig'

/**
 * Reply-client tier selector shared by {@link OpenAiConversationAiProvider} and
 * {@link AzureOpenAiConversationAiProvider}.
 *
 * The conversation reply path has THREE distinct latency / retry budgets:
 *
 *  - `ultra` — speak-live ultra-lean micro turns (15s, 0 retries). Tightest budget; the
 *    micro JSON contract emits ≤1 sentence so a long wait almost always means the model
 *    is wedged.
 *  - `coach` — language-coach live turns (25s, 0 retries). Coach mode uses the FULL
 *    reply-only JSON contract (it teaches + corrects), so it needs more headroom than
 *    ultra-lean. But it's still a live conversational turn — silently retrying through
 *    `120s × 2` (the heavy text default) hangs the learner on "Shaping a reply…" for
 *    minutes and surfaces as the harsh "Small hiccup" banner.
 *  - `standard` — non-live text replies + recap + enrichment. Full 120s budget with the
 *    SDK's default retries; safe for chat threads where the user is not waiting on a
 *    voice-clock UX.
 *
 * Pure function so it can be unit-tested without instantiating an OpenAI client.
 */
export type ReplyClientTier = 'ultra' | 'coach' | 'standard'

export function selectReplyClientTier(
  request: Pick<AiConversationTurnRequest, 'speakLive' | 'scenario'>,
  liveUltra: boolean
): ReplyClientTier {
  if (liveUltra) return 'ultra'
  if (request.speakLive && isLanguageCoachScenarioSlug(request.scenario.slug)) return 'coach'
  return 'standard'
}
