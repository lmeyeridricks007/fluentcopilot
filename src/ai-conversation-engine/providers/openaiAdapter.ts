/**
 * AI Conversation Engine — OpenAI adapter (stub).
 * Implement with openai package: new OpenAI({ apiKey }).chat.completions.create()
 */

import type { IConversationProvider } from './types.js'
import type { GenerateResponseInput, GenerateResponseResult } from '../types/provider.js'

export class OpenAIConversationProvider implements IConversationProvider {
  readonly name = 'openai'

  async generateResponse(_input: GenerateResponseInput): Promise<GenerateResponseResult> {
    // TODO: const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    // const completion = await openai.chat.completions.create({
    //   model: input.model_id ?? 'gpt-4o-mini',
    //   messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    //   max_tokens: input.max_tokens ?? 512,
    //   temperature: input.temperature ?? 0.7,
    // })
    // return { content: completion.choices[0]?.message?.content ?? '', model_id: completion.model, ... }
    throw new Error('OpenAI adapter not implemented: set up openai SDK and env')
  }
}
