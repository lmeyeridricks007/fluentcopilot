import type { ConversationAiProvider } from '../contracts/ConversationAiProvider'
import { assertProviderConfigReady, getResolvedAiProviderId } from '../config/aiProviderConfig'
import { AzureOpenAiConversationAiProvider } from '../providers/AzureOpenAiConversationAiProvider'
import { MockConversationAiProvider } from '../providers/MockConversationAiProvider'
import { OpenAiConversationAiProvider } from '../providers/OpenAiConversationAiProvider'

let cached: ConversationAiProvider | null = null

/**
 * Single entry point for Feature 1 conversation LLM. Resolves implementation from `AI_PROVIDER` / env.
 * Process-wide singleton suitable for Azure Functions (reuse HTTP client where applicable).
 */
export function createConversationAiProvider(): ConversationAiProvider {
  if (cached) return cached
  const id = getResolvedAiProviderId()
  assertProviderConfigReady(id)
  if (id === 'mock') {
    cached = new MockConversationAiProvider()
  } else if (id === 'azure-openai') {
    cached = new AzureOpenAiConversationAiProvider()
  } else {
    cached = new OpenAiConversationAiProvider()
  }
  return cached
}

/** Tests only — reset cached provider between cases. */
export function resetConversationAiProviderForTests(): void {
  cached = null
}
