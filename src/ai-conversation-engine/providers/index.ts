/**
 * AI Conversation Engine — provider registry and factory.
 */

import type { IConversationProvider } from './types.js'
import { MockConversationProvider } from './mockProvider.js'

const providers = new Map<string, IConversationProvider>([
  ['mock', new MockConversationProvider()],
])

export function registerProvider(name: string, provider: IConversationProvider): void {
  providers.set(name, provider)
}

export function getProvider(name: string): IConversationProvider | null {
  return providers.get(name) ?? null
}

export { MockConversationProvider }
export type { IConversationProvider }
