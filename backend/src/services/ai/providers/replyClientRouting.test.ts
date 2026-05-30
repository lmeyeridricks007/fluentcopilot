import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { AiConversationTurnRequest } from '../contracts/AiConversationTurnRequest'
import type { ScenarioConfig } from '../../../models/contracts'
import type { SpeakLivePersistedState } from '../../../domain/speakLive/speakLiveFsm'
import { selectReplyClientTier } from './replyClientRouting'
import {
  getSpeakLiveCoachReplyRequestTimeoutMs,
  getSpeakLiveCoachReplyMaxRetries,
  getOpenAiLanguageCoachReplyModel,
  getAzureOpenAiLanguageCoachReplyDeployment,
  replyStageAMaxOutputTokensForRequest,
} from '../config/aiProviderConfig'

function scenario(slug: string): ScenarioConfig {
  return {
    id: `s-${slug}`,
    slug,
    title: slug,
    description: '',
    userRole: 'learner',
    goals: [],
    starterSuggestions: [],
    difficultyBand: 'A2',
    tags: [],
    allowedModes: [],
    openingMessage: null,
  }
}

function reqLike(opts: {
  speakLive: boolean
  slug: string
}): Pick<AiConversationTurnRequest, 'speakLive' | 'scenario'> {
  const sl = opts.speakLive
    ? {
        state: { goalIndex: 0 } as unknown as SpeakLivePersistedState,
        goalTitles: [] as string[],
        scenarioTitle: opts.slug,
      }
    : null
  return {
    speakLive: sl,
    scenario: scenario(opts.slug),
  }
}

describe('selectReplyClientTier', () => {
  it('returns "ultra" when liveUltra=true (irrespective of scenario)', () => {
    expect(selectReplyClientTier(reqLike({ speakLive: true, slug: 'ordering_food' }), true)).toBe('ultra')
    expect(selectReplyClientTier(reqLike({ speakLive: true, slug: 'language_coach' }), true)).toBe('ultra')
  })

  it('returns "coach" for live language_coach turns when liveUltra=false', () => {
    expect(selectReplyClientTier(reqLike({ speakLive: true, slug: 'language_coach' }), false)).toBe('coach')
  })

  it('returns "standard" for non-live language_coach (e.g. text recap or non-speak-live)', () => {
    expect(selectReplyClientTier(reqLike({ speakLive: false, slug: 'language_coach' }), false)).toBe('standard')
  })

  it('returns "standard" for live non-coach scenarios when liveUltra=false', () => {
    /** Defensive: with current config such turns ARE always ultra-lean, but the helper still routes safely. */
    expect(selectReplyClientTier(reqLike({ speakLive: true, slug: 'ordering_food' }), false)).toBe('standard')
  })

  it('returns "standard" for plain text turns', () => {
    expect(selectReplyClientTier(reqLike({ speakLive: false, slug: 'cafe_chat' }), false)).toBe('standard')
  })
})

describe('coach reply config defaults + env range', () => {
  const ENV_KEYS = ['SPEAK_LIVE_COACH_REPLY_TIMEOUT_MS', 'SPEAK_LIVE_COACH_REPLY_MAX_RETRIES'] as const
  let saved: Record<string, string | undefined> = {}
  beforeEach(() => {
    saved = {}
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k]
      delete process.env[k]
    }
  })
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  it('default coach timeout is 25s — generous enough for the bigger coach prompt, far below the 120s heavy default', () => {
    expect(getSpeakLiveCoachReplyRequestTimeoutMs()).toBe(25_000)
  })

  it('honors env override within the supported 5s..45s range', () => {
    process.env.SPEAK_LIVE_COACH_REPLY_TIMEOUT_MS = '12000'
    expect(getSpeakLiveCoachReplyRequestTimeoutMs()).toBe(12_000)
    process.env.SPEAK_LIVE_COACH_REPLY_TIMEOUT_MS = '40000'
    expect(getSpeakLiveCoachReplyRequestTimeoutMs()).toBe(40_000)
  })

  it('falls back to default when env value is out of range or non-numeric', () => {
    process.env.SPEAK_LIVE_COACH_REPLY_TIMEOUT_MS = '999' // < 5s
    expect(getSpeakLiveCoachReplyRequestTimeoutMs()).toBe(25_000)
    process.env.SPEAK_LIVE_COACH_REPLY_TIMEOUT_MS = '900000' // > 45s
    expect(getSpeakLiveCoachReplyRequestTimeoutMs()).toBe(25_000)
    process.env.SPEAK_LIVE_COACH_REPLY_TIMEOUT_MS = 'banana'
    expect(getSpeakLiveCoachReplyRequestTimeoutMs()).toBe(25_000)
  })

  it('default coach max retries is 0 — fail-fast principle for live UX', () => {
    expect(getSpeakLiveCoachReplyMaxRetries()).toBe(0)
  })

  it('coach max retries env clamped to {0,1}', () => {
    process.env.SPEAK_LIVE_COACH_REPLY_MAX_RETRIES = '1'
    expect(getSpeakLiveCoachReplyMaxRetries()).toBe(1)
    process.env.SPEAK_LIVE_COACH_REPLY_MAX_RETRIES = '5'
    expect(getSpeakLiveCoachReplyMaxRetries()).toBe(0)
    process.env.SPEAK_LIVE_COACH_REPLY_MAX_RETRIES = '-1'
    expect(getSpeakLiveCoachReplyMaxRetries()).toBe(0)
  })
})

/**
 * Bug 2026-05-16: the language-coach `max_tokens` was 240 — too small for the JSON envelope
 * + 2-3 sentence Dutch teaching reply, causing OpenAI to truncate mid-string and surface as
 * `AiValidationError → "Quick reconnect"`. Default lifted to 600.
 */
describe('replyStageAMaxOutputTokensForRequest — language coach budget', () => {
  const ENV_KEY = 'AI_CONVERSATION_LANGUAGE_COACH_REPLY_MAX_OUTPUT_TOKENS'
  let saved: string | undefined
  beforeEach(() => {
    saved = process.env[ENV_KEY]
    delete process.env[ENV_KEY]
  })
  afterEach(() => {
    if (saved === undefined) delete process.env[ENV_KEY]
    else process.env[ENV_KEY] = saved
  })

  function coachLiveRequest() {
    return {
      speakLive: { state: {} as unknown as SpeakLivePersistedState, goalTitles: [], scenarioTitle: 'lc' },
      scenario: { slug: 'language_coach' },
    }
  }

  it('default language coach budget is 600 — fits a 2-3 sentence Dutch teaching reply with envelope headroom', () => {
    expect(replyStageAMaxOutputTokensForRequest(coachLiveRequest())).toBe(600)
  })

  it('honors env override within the supported 120..1200 range', () => {
    process.env[ENV_KEY] = '400'
    expect(replyStageAMaxOutputTokensForRequest(coachLiveRequest())).toBe(400)
    process.env[ENV_KEY] = '1200'
    expect(replyStageAMaxOutputTokensForRequest(coachLiveRequest())).toBe(1200)
  })

  it('falls back to default when env value is out of range or non-numeric', () => {
    process.env[ENV_KEY] = '50' // < 120 lower bound
    expect(replyStageAMaxOutputTokensForRequest(coachLiveRequest())).toBe(600)
    process.env[ENV_KEY] = '9999' // > 1200 upper bound
    expect(replyStageAMaxOutputTokensForRequest(coachLiveRequest())).toBe(600)
    process.env[ENV_KEY] = 'banana'
    expect(replyStageAMaxOutputTokensForRequest(coachLiveRequest())).toBe(600)
  })

  it('does not affect non-coach speak-live requests (ultra-lean budget stays small)', () => {
    const ultraLeanRequest = {
      speakLive: { state: {} as unknown as SpeakLivePersistedState, goalTitles: [], scenarioTitle: 'food' },
      scenario: { slug: 'ordering_food' },
    }
    /** Default ultra-lean SpeakLive cap is 80; the coach lift must not touch this path. */
    expect(replyStageAMaxOutputTokensForRequest(ultraLeanRequest)).toBe(80)
  })
})

/**
 * Bug 2026-05-16 follow-up: with the 600-token coach budget, `gpt-4o-mini` was streaming
 * ~6-8s per coach turn. Default coach reply model switched to `gpt-4.1-mini` (materially
 * faster per-token at comparable quality) so the same teaching reply finishes well within
 * the live budget.
 */
describe('language-coach reply model selection', () => {
  const OPENAI_ENV = 'LANGUAGE_COACH_REPLY_MODEL'
  const AZURE_ENV = 'AZURE_OPENAI_DEPLOYMENT_LANGUAGE_COACH_REPLY'
  const AZURE_DEFAULT_ENV = 'AZURE_OPENAI_DEPLOYMENT_CHAT'

  let savedOpenAi: string | undefined
  let savedAzure: string | undefined
  let savedAzureDefault: string | undefined

  beforeEach(() => {
    savedOpenAi = process.env[OPENAI_ENV]
    savedAzure = process.env[AZURE_ENV]
    savedAzureDefault = process.env[AZURE_DEFAULT_ENV]
    delete process.env[OPENAI_ENV]
    delete process.env[AZURE_ENV]
  })

  afterEach(() => {
    if (savedOpenAi === undefined) delete process.env[OPENAI_ENV]
    else process.env[OPENAI_ENV] = savedOpenAi
    if (savedAzure === undefined) delete process.env[AZURE_ENV]
    else process.env[AZURE_ENV] = savedAzure
    if (savedAzureDefault === undefined) delete process.env[AZURE_DEFAULT_ENV]
    else process.env[AZURE_DEFAULT_ENV] = savedAzureDefault
  })

  it('OpenAI default coach reply model is gpt-4.1-mini', () => {
    expect(getOpenAiLanguageCoachReplyModel()).toBe('gpt-4.1-mini')
  })

  it('OpenAI coach reply model honors LANGUAGE_COACH_REPLY_MODEL override', () => {
    process.env[OPENAI_ENV] = 'gpt-4o-mini'
    expect(getOpenAiLanguageCoachReplyModel()).toBe('gpt-4o-mini')
  })

  it('Azure coach deployment falls back to the standard chat deployment when no override set', () => {
    process.env[AZURE_DEFAULT_ENV] = 'chat-deploy-A'
    expect(getAzureOpenAiLanguageCoachReplyDeployment()).toBe('chat-deploy-A')
  })

  it('Azure coach deployment honors AZURE_OPENAI_DEPLOYMENT_LANGUAGE_COACH_REPLY override', () => {
    process.env[AZURE_DEFAULT_ENV] = 'chat-deploy-A'
    process.env[AZURE_ENV] = 'coach-fast-deploy'
    expect(getAzureOpenAiLanguageCoachReplyDeployment()).toBe('coach-fast-deploy')
  })
})
