/**
 * AI Conversation Engine — provider interface.
 */

import type { GenerateResponseInput, GenerateResponseResult } from '../types/provider.js'

export interface IConversationProvider {
  readonly name: string
  generateResponse(input: GenerateResponseInput): Promise<GenerateResponseResult>
}
