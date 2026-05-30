/**
 * AI Conversation Engine — mock provider for development without external AI.
 */

import type { IConversationProvider } from './types.js'
import type { GenerateResponseInput, GenerateResponseResult } from '../types/provider.js'

const MOCK_REPLIES: Record<string, string> = {
  cafe: 'Graag! Dat is €2,50. Wilt u er iets bij?',
  doctor: 'Ik begrijp het. Hoe lang heeft u deze klachten al?',
  supermarket: 'Natuurlijk, de melk staat daar achter. Wilt u nog iets anders?',
  default: 'Goed zo! Kunt u dat nog eens zeggen?',
}

export class MockConversationProvider implements IConversationProvider {
  readonly name = 'mock'

  async generateResponse(input: GenerateResponseInput): Promise<GenerateResponseResult> {
    const lastUser = input.messages.filter((m) => m.role === 'user').pop()?.content ?? ''
    const scenarioHint = lastUser.toLowerCase().includes('koffie') ? 'cafe' : 'default'
    const reply = MOCK_REPLIES[scenarioHint] ?? MOCK_REPLIES.default
    const correction = lastUser.length > 0 && lastUser.length < 5 ? 'Probeer een volledige zin, bijvoorbeeld: "Mag ik een koffie alstublieft?"' : undefined
    const content = correction ? `${reply}\n[CORRECTION: ${correction}]` : reply
    return {
      content,
      model_id: 'mock',
      usage: { input_tokens: 10, output_tokens: 20 },
      finish_reason: 'stop',
    }
  }
}
