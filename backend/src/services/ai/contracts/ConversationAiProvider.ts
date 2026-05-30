import type {
  AIResponseEnvelope,
  AssistantReplyEnvelope,
  ConversationSummary,
  TurnEnrichmentEnvelope,
} from '../../../models/contracts'

/** NDJSON / Speak Live: stream Dutch from reply-only JSON before the full object is complete. */
export type AssistantReplyStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'complete'; envelope: AssistantReplyEnvelope; raw: string; streamMetrics?: StreamMetrics }

export type StreamMetrics = {
  firstTokenMs: number
  totalMs: number
  promptChars: number
  estimatedInputTokens: number
  responseChars: number
  estimatedOutputTokens: number
  model: string
}
import type { AiConversationTurnRequest } from './AiConversationTurnRequest'
import type { AiEndSummaryRequest } from './AiEndSummaryRequest'
import type { AiTurnEnrichmentRequest } from './AiTurnEnrichmentRequest'

/**
 * Conversation-scoped LLM operations. Implementations: OpenAI direct, Azure OpenAI, mock.
 * Other product areas (speaking, exams) can add parallel provider interfaces later.
 */
export interface ConversationAiProvider {
  /** Stable id for logs and health (`openai` | `azure-openai` | `mock`). */
  readonly id: string

  /** Model or deployment name used for this call path (logging only). */
  readonly turnModelLabel: string

  /** Legacy single-call turn (tests / tooling); prefer staged methods for production latency. */
  generateTurn(request: AiConversationTurnRequest): Promise<AIResponseEnvelope>

  /** Stage A — fast persona reply (small JSON). */
  generateAssistantReplyOnly(request: AiConversationTurnRequest): Promise<AssistantReplyEnvelope>

  /** Stage B — coach + save candidates + rolling summary. */
  generateTurnEnrichment(request: AiTurnEnrichmentRequest): Promise<TurnEnrichmentEnvelope>

  /**
   * Stage A streaming — plain Dutch assistant line, chunk by chunk.
   * Implementations that cannot stream MAY yield the full text once.
   */
  streamAssistantPlainText(request: AiConversationTurnRequest): AsyncIterable<string>

  /**
   * Stage A streaming — same contract as {@link generateAssistantReplyOnly} (JSON object),
   * but emits {@link AssistantReplyStreamEvent} `delta` chunks as `assistantReply` grows.
   */
  streamAssistantReplyOnly(request: AiConversationTurnRequest): AsyncIterable<AssistantReplyStreamEvent>

  generateEndSummary(request: AiEndSummaryRequest): Promise<ConversationSummary>
}
