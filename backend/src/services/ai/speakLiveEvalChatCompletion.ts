/**
 * Non-streaming chat completions for Speak Live **post-session** JSON evaluators.
 * Routes to Azure OpenAI (`AI_PROVIDER=azure-openai`) or direct OpenAI (`AI_PROVIDER=openai`) so
 * deployment names and API keys match the active conversation provider.
 */
import OpenAI from 'openai'
import {
  getAzureOpenAiConversationConfig,
  getAzureOpenAiSpeakLiveStructuredEvalDeployment,
  getOpenAiDirectConfig,
  getResolvedAiProviderId,
  getSpeakLiveEvaluationAiMaxRetries,
  getSpeakLiveEvaluationAiRequestTimeoutMs,
  getSpeakLiveStructuredTranscriptEvalModel,
} from './config/aiProviderConfig'
import { AiProviderError, AiTimeoutError } from './errors'

export type SpeakLiveEvalChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export type RunSpeakLiveEvalChatCompletionParams = {
  messages: SpeakLiveEvalChatMessage[]
  maxOutputTokens: number
  temperature: number
  jsonResponseFormat: boolean
  /**
   * Direct OpenAI `model` parameter. Defaults to {@link getSpeakLiveStructuredTranscriptEvalModel}
   * when omitted (structured dialogue / transcript paths).
   */
  openAiModel?: string
  /**
   * Azure deployment id in the URL path. Defaults to {@link getAzureOpenAiSpeakLiveStructuredEvalDeployment}.
   */
  azureDeployment?: string
  /**
   * Optional per-call timeout (ms) for THIS request only. When set, overrides
   * {@link getSpeakLiveEvaluationAiRequestTimeoutMs}. Used by the synchronous FAST scenario report
   * path so a degraded provider cannot hold the user's report past the report-time budget.
   */
  requestTimeoutMs?: number
}

/**
 * Rich result for the FluentCopilot fast/deep evaluator: separates **provider network wall time**
 * (`providerNetworkMs`) from **response body read time** (`responseReadMs`) and surfaces real OpenAI
 * usage / request id / finish reason when available. JSON parse, schema validation, and prompt build
 * timings are measured by the caller — they are explicitly NOT included here.
 */
export type RunSpeakLiveEvalChatCompletionResult = {
  content: string
  /** Wall time waiting for the provider to respond (response headers received). */
  providerNetworkMs: number
  /** Wall time reading the response body / parsing JSON envelope from the provider. */
  responseReadMs: number
  /** Provider-side request id from headers / response when available. */
  requestId?: string
  /** OpenAI `finish_reason` (`stop`, `length`, etc.) when available. */
  finishReason?: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

async function runAzureSpeakLiveEvalChatRich(
  params: RunSpeakLiveEvalChatCompletionParams,
): Promise<RunSpeakLiveEvalChatCompletionResult> {
  const { endpoint, apiKey, apiVersion } = getAzureOpenAiConversationConfig()
  if (!endpoint || !apiKey) {
    throw new AiProviderError('Azure OpenAI endpoint or API key missing for Speak Live evaluation')
  }
  const deployment = params.azureDeployment ?? getAzureOpenAiSpeakLiveStructuredEvalDeployment()
  const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`
  const controller = new AbortController()
  const timeoutMs = params.requestTimeoutMs ?? getSpeakLiveEvaluationAiRequestTimeoutMs()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const networkStarted = Date.now()
  try {
    const body: Record<string, unknown> = {
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxOutputTokens,
    }
    if (params.jsonResponseFormat) {
      body.response_format = { type: 'json_object' }
    }
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    })
    const providerNetworkMs = Date.now() - networkStarted
    const readStarted = Date.now()
    const data = (await res.json()) as {
      id?: string
      choices?: { message?: { content?: string | null }; finish_reason?: string }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
      error?: { message?: string }
    }
    const responseReadMs = Date.now() - readStarted
    if (!res.ok) {
      throw new AiProviderError(data.error?.message ?? `Azure OpenAI HTTP ${res.status}`, res.status)
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new AiProviderError('Empty Azure OpenAI completion content for Speak Live evaluation')
    return {
      content: content.trim(),
      providerNetworkMs,
      responseReadMs,
      requestId:
        res.headers.get('apim-request-id') ??
        res.headers.get('x-ms-request-id') ??
        res.headers.get('x-request-id') ??
        data.id ??
        undefined,
      finishReason: data.choices?.[0]?.finish_reason,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new AiTimeoutError('Azure OpenAI Speak Live evaluation request timed out')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Rich entry-point used by the FluentCopilot fast/deep evaluators. Splits provider network wall time
 * from response body read time so that {@link openaiDiagnostics} can surface them separately.
 */
export async function runSpeakLiveEvalChatCompletionRich(
  params: RunSpeakLiveEvalChatCompletionParams,
): Promise<RunSpeakLiveEvalChatCompletionResult> {
  const id = getResolvedAiProviderId()
  if (id === 'azure-openai') {
    return runAzureSpeakLiveEvalChatRich(params)
  }
  const cfg = getOpenAiDirectConfig()
  if (!cfg.apiKey?.trim()) {
    throw new AiProviderError('OPENAI_API_KEY is not configured for Speak Live evaluation')
  }
  /**
   * Per-call requestTimeoutMs is used by the **FAST sync** scenario report path to guarantee
   * a hard wall-time ceiling. When supplied, we MUST also disable SDK retries — otherwise the
   * SDK silently retries on the timed-out attempt (each retry is also bounded by the same per-attempt
   * timeout), which doubles or triples the wall time and defeats the entire purpose of the timeout.
   * Real diagnostic that exposed this: providerNetworkMs ≈ 88.5s with requestTimeoutMs=45000 and
   * default maxRetries=1 → 45s timeout + 43s retry. After this fix: maxRetries=0 → ~45s ceiling.
   */
  const hasTightCeiling = typeof params.requestTimeoutMs === 'number'
  const effectiveTimeoutMs = params.requestTimeoutMs ?? getSpeakLiveEvaluationAiRequestTimeoutMs()
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    organization: cfg.organization,
    project: cfg.project,
    maxRetries: hasTightCeiling ? 0 : getSpeakLiveEvaluationAiMaxRetries(),
    timeout: effectiveTimeoutMs,
  })
  const model = params.openAiModel ?? getSpeakLiveStructuredTranscriptEvalModel()
  /**
   * Belt-and-braces: an outer AbortController guarantees the request is aborted at the wall-time
   * ceiling even if the SDK's own timeout misbehaves (server-sent connection that never closes,
   * keep-alive proxy, etc.). The per-call abort signal is forwarded through the SDK's request options.
   */
  const outerController = new AbortController()
  const outerTimer = setTimeout(() => outerController.abort(), effectiveTimeoutMs)
  const networkStarted = Date.now()
  try {
    const completion = await client.chat.completions.create(
      {
        model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.maxOutputTokens,
        ...(params.jsonResponseFormat ? { response_format: { type: 'json_object' as const } } : {}),
      },
      { signal: outerController.signal },
    )
    const providerNetworkMs = Date.now() - networkStarted
    return {
      content: (completion.choices[0]?.message?.content ?? '').trim(),
      providerNetworkMs,
      responseReadMs: 0,
      requestId: (completion as { id?: string }).id,
      finishReason: completion.choices[0]?.finish_reason,
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
    }
  } catch (e) {
    /** Map abort/timeout to AiTimeoutError so the evaluator records `reason: timeout` and the
     *  deterministic fallback renders cleanly instead of bubbling a raw AbortError. */
    if (
      e instanceof Error &&
      (e.name === 'AbortError' ||
        /aborted|timeout|timed out/i.test(e.message ?? ''))
    ) {
      throw new AiTimeoutError(
        `OpenAI Speak Live evaluation aborted after ${effectiveTimeoutMs}ms (provider too slow / connection stalled)`,
      )
    }
    throw e
  } finally {
    clearTimeout(outerTimer)
  }
}

/**
 * Backwards-compat shim returning only the response content. Prefer {@link runSpeakLiveEvalChatCompletionRich}
 * for new code paths so detailed openaiDiagnostics can be reported.
 */
export async function runSpeakLiveEvalChatCompletion(params: RunSpeakLiveEvalChatCompletionParams): Promise<string> {
  const r = await runSpeakLiveEvalChatCompletionRich(params)
  return r.content
}
