import type { AIResponseEnvelope, AssistantReplyEnvelope, TurnEnrichmentEnvelope } from '../../../models/contracts'

export function mergeReplyAndEnrichment(
  reply: AssistantReplyEnvelope,
  enrichment: TurnEnrichmentEnvelope
): AIResponseEnvelope {
  return {
    assistantReply: reply.assistantReply,
    feedback: enrichment.feedback,
    saveWordCandidates: enrichment.saveWordCandidates,
    scenarioProgress: enrichment.scenarioProgress ?? reply.scenarioProgress,
    shouldConversationEnd: reply.shouldConversationEnd,
    updatedSummary: enrichment.updatedSummary,
  }
}
