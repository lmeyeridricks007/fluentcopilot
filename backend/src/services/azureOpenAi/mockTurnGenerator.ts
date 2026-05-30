/**
 * @deprecated Use `MockConversationAiProvider` or `mockTurnLogic` for new code.
 */
import { buildMockRecapJsonString, computeMockTurnEnvelope } from '../ai/providers/mockTurnLogic'

export function generateMockTurn(params: { userText: string; priorSummary: string | null }) {
  return computeMockTurnEnvelope(params)
}

export function generateMockRecap(): string {
  return buildMockRecapJsonString()
}
