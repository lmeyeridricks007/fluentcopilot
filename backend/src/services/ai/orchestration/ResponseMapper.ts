import type { AIResponseEnvelope, ConversationSummary } from '../../../models/contracts'
import type { AiConversationTurnRequest } from '../contracts/AiConversationTurnRequest'
import {
  fallbackRecapSummary,
  validateAndMapEnrichmentJson,
  validateAndMapLiveSpeakReplyJson,
  validateAndMapRecapJson,
  validateAndMapReplyOnlyJson,
  validateAndMapTurnJson,
} from './ResponseValidator'

/**
 * Maps raw model strings to domain contracts with optional soft fallback for recap only.
 */
export function mapTurnModelOutput(rawContent: string): AIResponseEnvelope {
  return validateAndMapTurnJson(rawContent)
}

export function mapReplyOnlyModelOutput(rawContent: string) {
  return validateAndMapReplyOnlyJson(rawContent)
}

export function mapLiveSpeakReplyModelOutput(rawContent: string, request: AiConversationTurnRequest) {
  const idx = request.speakLive?.state.goalIndex ?? 0
  return validateAndMapLiveSpeakReplyJson(rawContent, { activeGoalIndex: idx })
}

export function mapEnrichmentModelOutput(rawContent: string) {
  return validateAndMapEnrichmentJson(rawContent)
}

export function mapRecapModelOutput(rawContent: string, threadId: string): ConversationSummary {
  try {
    return validateAndMapRecapJson(rawContent, threadId)
  } catch {
    return fallbackRecapSummary(threadId)
  }
}
