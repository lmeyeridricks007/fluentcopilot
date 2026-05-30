import type { AiConversationTurnRequest } from './AiConversationTurnRequest'

/** Stage B input — same turn context plus the assistant line already committed. */
export type AiTurnEnrichmentRequest = AiConversationTurnRequest & {
  assistantReply: string
}
