/**
 * AI Conversation Engine — provider abstraction types.
 */

export interface GenerateResponseInput {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  max_tokens?: number
  temperature?: number
  model_id?: string
}

export interface GenerateResponseResult {
  content: string
  model_id: string
  usage?: { input_tokens: number; output_tokens: number }
  finish_reason?: string
}
