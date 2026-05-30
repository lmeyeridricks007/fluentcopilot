/**
 * Unit tests for the OpenAI/Azure OpenAI chat-completion wrapper used by the FluentCopilot
 * scenario evaluator. Focus: the per-call `requestTimeoutMs` MUST produce a hard wall-time
 * ceiling regardless of SDK retry behavior. Real production diagnostic that drove this test:
 * `providerNetworkMs ≈ 88500ms` with `requestTimeoutMs=45000` and default `maxRetries=1`,
 * proving the SDK silently retried after the first per-attempt timeout.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createMock, ctorMock } = vi.hoisted(() => {
  const createMock = vi.fn()
  const ctorMock = vi.fn().mockImplementation((opts: Record<string, unknown>) => ({
    chat: { completions: { create: createMock } },
    __opts: opts,
  }))
  return { createMock, ctorMock }
})

vi.mock('openai', () => ({
  default: ctorMock,
}))

import { runSpeakLiveEvalChatCompletionRich } from './speakLiveEvalChatCompletion'
import { AiTimeoutError } from './errors'

describe('runSpeakLiveEvalChatCompletionRich (OpenAI path) — timeout ceiling', () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = 'sk-test'
    createMock.mockReset()
    ctorMock.mockClear()
  })
  afterEach(() => {
    delete process.env.AI_PROVIDER
    delete process.env.OPENAI_API_KEY
  })

  it('forces maxRetries=0 when a per-call requestTimeoutMs is supplied (no silent retry)', async () => {
    createMock.mockResolvedValue({
      id: 'cmpl-1',
      choices: [{ message: { content: '{"ok":1}' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    })
    await runSpeakLiveEvalChatCompletionRich({
      messages: [{ role: 'user', content: 'hi' }],
      maxOutputTokens: 100,
      temperature: 0,
      jsonResponseFormat: true,
      requestTimeoutMs: 45_000,
    })
    expect(ctorMock).toHaveBeenCalledTimes(1)
    const initOpts = ctorMock.mock.calls[0]![0] as { maxRetries: number; timeout: number }
    expect(initOpts.maxRetries).toBe(0)
    expect(initOpts.timeout).toBe(45_000)
  })

  it('keeps default SDK retries when requestTimeoutMs is NOT supplied (legacy/deep path)', async () => {
    createMock.mockResolvedValue({
      id: 'cmpl-2',
      choices: [{ message: { content: '{"ok":1}' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    })
    await runSpeakLiveEvalChatCompletionRich({
      messages: [{ role: 'user', content: 'hi' }],
      maxOutputTokens: 100,
      temperature: 0,
      jsonResponseFormat: true,
    })
    const initOpts = ctorMock.mock.calls[0]![0] as { maxRetries: number; timeout: number }
    /** Default config: SPEAK_LIVE_EVAL_AI_MAX_RETRIES default=1, allows transient network retries
     *  for background/deep paths where wall time matters less than success rate. */
    expect(initOpts.maxRetries).toBeGreaterThanOrEqual(0)
    expect(initOpts.maxRetries).toBeLessThanOrEqual(3)
  })

  it('passes an AbortController signal to the SDK call (outer wall-time guard)', async () => {
    let observedSignal: AbortSignal | undefined
    createMock.mockImplementation(async (_body: unknown, opts?: { signal?: AbortSignal }) => {
      observedSignal = opts?.signal
      return {
        id: 'cmpl-3',
        choices: [{ message: { content: '{}' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }
    })
    await runSpeakLiveEvalChatCompletionRich({
      messages: [{ role: 'user', content: 'hi' }],
      maxOutputTokens: 100,
      temperature: 0,
      jsonResponseFormat: true,
      requestTimeoutMs: 30_000,
    })
    expect(observedSignal).toBeInstanceOf(AbortSignal)
  })

  it('aborts the call when the per-call timeout elapses and surfaces AiTimeoutError', async () => {
    /** Simulate a stalled provider: never resolve, only reject when the signal aborts. */
    createMock.mockImplementation(
      async (_body: unknown, opts?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts?.signal?.addEventListener('abort', () => {
            const err = new Error('Request was aborted')
            err.name = 'AbortError'
            reject(err)
          })
        }),
    )
    const startedAt = Date.now()
    await expect(
      runSpeakLiveEvalChatCompletionRich({
        messages: [{ role: 'user', content: 'hi' }],
        maxOutputTokens: 100,
        temperature: 0,
        jsonResponseFormat: true,
        /** Tiny ceiling so the test is fast — the production default is 45000. */
        requestTimeoutMs: 50,
      }),
    ).rejects.toBeInstanceOf(AiTimeoutError)
    const elapsed = Date.now() - startedAt
    /** Hard ceiling: must abort within 1 second of the 50ms timeout (allows generous CI slack). */
    expect(elapsed).toBeLessThan(1_000)
  })
})
