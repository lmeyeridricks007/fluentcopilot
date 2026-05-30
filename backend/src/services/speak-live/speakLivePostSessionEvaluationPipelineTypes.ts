/**
 * Types for durable / queued post-session evaluation (future: Service Bus, storage queue, Durable Functions).
 * Today the worker is the API host: `runLiveSessionEvaluation` updates DB status while the client polls.
 */
import type { SpeakLiveScenarioMetadata, SpeakLiveSessionEnvelopeMetadata, SpeakLiveLevelMetadata } from './speakLiveNormalizedConversation'

export type SpeakLivePostSessionEvaluationWorkItemV1 = {
  version: 1
  threadId: string
  externalUserId: string
  scenario: SpeakLiveScenarioMetadata
  level: SpeakLiveLevelMetadata
  session: SpeakLiveSessionEnvelopeMetadata
  /** Correlation for learning-memory / skill pipelines. */
  correlationId: string
}

export function buildSpeakLivePostSessionWorkItemStub(params: {
  threadId: string
  externalUserId: string
  scenario: SpeakLiveScenarioMetadata
  level: SpeakLiveLevelMetadata
  session: SpeakLiveSessionEnvelopeMetadata
}): SpeakLivePostSessionEvaluationWorkItemV1 {
  return {
    version: 1,
    threadId: params.threadId,
    externalUserId: params.externalUserId,
    scenario: params.scenario,
    level: params.level,
    session: params.session,
    correlationId: `${params.threadId}:${Date.now()}`,
  }
}
