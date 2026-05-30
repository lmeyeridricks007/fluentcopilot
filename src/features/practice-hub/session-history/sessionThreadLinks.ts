import type { ApiConversationThread } from '@/lib/api/apiTypes'
import { appSpeakLiveSessionEvaluation, appSpeakLiveThreadRecap, appTalkThreadRecap } from '@/lib/routing/appRoutes'

/** Recap / narrative wrap-up URL (chat or speak). */
export function threadRecapHref(t: ApiConversationThread): string {
  if (t.conversationSurface === 'speak_live') {
    return appSpeakLiveThreadRecap(t.id)
  }
  return appTalkThreadRecap(t.id)
}

/**
 * Voice coaching report when evaluation finished; chat recap when text thread completed.
 * Returns null when no report surface should be advertised (avoid empty placeholders).
 */
export function threadReportHref(t: ApiConversationThread): string | null {
  if (t.conversationSurface === 'speak_live') {
    if (t.speakLivePostSessionPhase === 'evaluated') {
      return appSpeakLiveSessionEvaluation(t.id)
    }
    return null
  }
  if (t.status === 'completed') {
    return appTalkThreadRecap(t.id)
  }
  return null
}
