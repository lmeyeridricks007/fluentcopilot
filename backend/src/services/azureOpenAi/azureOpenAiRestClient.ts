/**
 * @deprecated Use `AzureOpenAiConversationAiProvider` (`services/ai/providers`) for new code.
 * Kept for ad-hoc scripts or legacy callers.
 */
import { getAzureOpenAiConfig } from '../../config/env'
import type { ChatMessage } from '../../prompts/buildTurnMessages'

type ChatCompletionResponse = {
  choices?: { message?: { content?: string | null } }[]
  error?: { message?: string }
}

export async function azureOpenAiChatCompletionJson(
  messages: ChatMessage[],
  options?: { maxTokens?: number },
): Promise<string> {
  const { endpoint, apiKey, apiVersion, deployment } = getAzureOpenAiConfig()
  if (!endpoint || !apiKey || !deployment) {
    throw new Error('Azure OpenAI not configured (endpoint, api key, deployment)')
  }
  const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages,
      temperature: 0.35,
      max_tokens: options?.maxTokens ?? 1200,
      response_format: { type: 'json_object' },
    }),
  })
  const data = (await res.json()) as ChatCompletionResponse
  if (!res.ok) {
    throw new Error(data.error?.message ?? `OpenAI HTTP ${res.status}`)
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty completion content')
  return content
}
