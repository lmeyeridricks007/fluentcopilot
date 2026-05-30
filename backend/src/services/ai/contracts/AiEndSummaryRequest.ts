import type { ConversationMessage, ConversationRecapGenerationContext } from '../../../models/contracts'

/** Provider-agnostic recap / end-summary generation. */
export type AiEndSummaryRequest = {
  correlationId?: string
  threadId: string
  messages: ConversationMessage[]
  /** Pre-formatted coaching notes from persisted feedback rows */
  feedbackNotes: string
  recapContext?: ConversationRecapGenerationContext
}
