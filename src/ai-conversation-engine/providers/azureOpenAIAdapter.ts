/**
 * AI Conversation Engine — Azure OpenAI adapter (stub).
 * Implement with @azure/openai or openai with baseURL + apiKey.
 */

import type { IConversationProvider } from './types.js'
import type { GenerateResponseInput, GenerateResponseResult } from '../types/provider.js'

export class AzureOpenAIConversationProvider implements IConversationProvider {
  readonly name = 'azure-openai'

  async generateResponse(_input: GenerateResponseInput): Promise<GenerateResponseResult> {
    // TODO: Use Azure OpenAI endpoint and deployment name from config/env
    // Same message shape as OpenAI; return { content, model_id, usage?, finish_reason? }
    throw new Error('Azure OpenAI adapter not implemented: set up client and env')
  }
}
