import type { PronunciationAssessmentApiResponse } from '@/lib/speech/audioPronunciationTypes'
import type { UserMessageInputMeta } from '@/lib/conversation/userMessageInputMeta'

/** Result of `consumeInputMetaForSend()` — passed to `StickyChatComposer` `onSend`. */
export type ComposerSendPayload = {
  inputMeta?: UserMessageInputMeta
  /** Azure pronunciation assessment from the clip (only when sending from speech review). */
  voiceQuality?: PronunciationAssessmentApiResponse
}
