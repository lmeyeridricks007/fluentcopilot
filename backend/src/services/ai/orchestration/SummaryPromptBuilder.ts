import type { ConversationMessage } from '../../../models/contracts'
import { buildRecapSystemMessage, buildRecapUserPayload } from '../../../prompts/buildRecapMessages'
import type { AiEndSummaryRequest } from '../contracts/AiEndSummaryRequest'

/**
 * End-of-conversation recap prompts — delegates to shared recap copy in `prompts/`.
 */
export function buildSummaryChatPayload(request: AiEndSummaryRequest): {
  system: string
  user: string
} {
  const ctx = request.recapContext
  return {
    system: buildRecapSystemMessage(ctx),
    user: buildRecapUserPayload(request.messages, request.feedbackNotes, ctx),
  }
}

export function buildRecapUserContent(
  messages: ConversationMessage[],
  feedbackNotes: string,
  recapContext?: AiEndSummaryRequest['recapContext']
): string {
  return buildRecapUserPayload(messages, feedbackNotes, recapContext)
}
