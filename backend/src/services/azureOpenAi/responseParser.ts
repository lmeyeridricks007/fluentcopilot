/**
 * @deprecated Import from `services/ai/orchestration/ResponseValidator` or `ResponseMapper` instead.
 * Shims preserved for any external imports of these symbols.
 */
import type { AIResponseEnvelope, ConversationSummary } from '../../models/contracts'
import { mapRecapModelOutput, mapTurnModelOutput } from '../ai/orchestration/ResponseMapper'

export {
  TurnEnvelopeZ,
  fallbackRecapSummary,
  validateAndMapRecapJson,
  validateAndMapTurnJson,
} from '../ai/orchestration/ResponseValidator'

export function parseTurnEnvelope(raw: string): AIResponseEnvelope {
  return mapTurnModelOutput(raw)
}

export function parseRecapEnvelope(raw: string, threadId: string): ConversationSummary {
  return mapRecapModelOutput(raw, threadId)
}
