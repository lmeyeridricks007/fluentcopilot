import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LiveEvalLlmTurnInput } from './liveSessionEvaluationLlm'
import {
  buildScenarioDialogueStructuredEvalInputFromMessages,
  evaluateScenarioDialogueStructured,
  normalizeGoalStatus,
  normalizeScenarioDialogueStructuredJsonRoot,
  normalizeSuggestedPracticeType,
  processScenarioDialogueRawLlmResponse,
  salvageTruncatedJson,
  type ScenarioDialogueStructuredEvalInput,
} from './speakLiveScenarioDialogueStructuredEvaluator'
import {
  FastScenarioEvaluationSchema,
  liftFastToDeepScenarioEvaluation,
  type FastScenarioEvaluationOutput,
} from './speakLiveScenarioDialogueStructured.schema'
import * as chat from '../ai/speakLiveEvalChatCompletion'
import {
  mergeDeepEnrichmentIntoEvaluation,
  scheduleDeepEnrichmentBackground,
} from './speakLiveDeepReportEnrichment'
import type { LiveSessionEvaluation } from './liveVoiceEvaluationTypes'

function fastTurnRow(turnId: string, opts?: Partial<FastScenarioEvaluationOutput['turns'][number]>): FastScenarioEvaluationOutput['turns'][number] {
  return {
    turnId,
    languageScores: {
      grammar: 70,
      vocabulary: 70,
      sentenceStructure: 70,
      naturalness: 70,
      taskRelevance: 70,
    },
    mainFix: 'Korte concrete tip.',
    strengths: ['Begrijpelijk'],
    improvements: ['Let op woordkeuze'],
    correctedLine: 'Een koffie graag.',
    strongerNaturalLine: 'Mag ik een koffie?',
    ...opts,
  }
}

function minimalFastJson(userTurnIds: string[]): FastScenarioEvaluationOutput {
  return {
    overall: {
      summary: 'Korte coachsamenvatting.',
      scenarioOutcomeScore: 60,
      taskCompletionScore: 60,
      languageScore: 60,
      conversationFlowScore: 60,
      grammarScore: 60,
      vocabularyScore: 60,
      naturalnessScore: 60,
      estimatedLevel: 'A2',
      confidence: 70,
      primaryFocus: {
        title: 'Woordkeuze',
        why: 'Een paar onnatuurlijke keuzes.',
        pattern: 'lidwoord + zelfstandig naamwoord',
        example: 'Mag ik een koffie?',
      },
    },
    goals: [
      {
        goalId: 'goal_0',
        title: 'Bestellen',
        weight: 1,
        status: 'partially_completed',
        score: 55,
      },
    ],
    turns: userTurnIds.map((id) => fastTurnRow(id)),
    recommendations: {
      nextDrillTitle: 'Woorden cafe',
      nextDrillReason: 'Focus op bestellen.',
      suggestedPracticeType: 'word_drill',
    },
  }
}

function baseDialogue(userId: string, assistantId: string): ScenarioDialogueStructuredEvalInput {
  return {
    scenarioId: 'thread-1',
    scenarioName: 'Cafe',
    scenarioType: 'cafe',
    level: 'A2',
    goals: [{ goalId: 'goal_0', title: 'Bestellen', weight: 1 }],
    dialogueTurns: [
      { turnId: assistantId, speaker: 'assistant', text: 'Goedemorgen, wat wilt u?' },
      { turnId: userId, speaker: 'user', text: 'Koffie graag' },
    ],
  }
}

function userInputs(turnId: string): LiveEvalLlmTurnInput[] {
  return [
    {
      turnId,
      turnIndex: 0,
      learnerTranscript: 'Koffie graag',
      learnerTranscriptNormalized: 'Koffie graag',
      assistantReply: 'Goedemorgen',
      hasLearnerAudio: true,
      sessionGoals: ['Bestellen'],
      azureSummary: null,
    },
  ]
}

describe('FastScenarioEvaluationSchema', () => {
  it('caps strengths and improvements arrays at 2 entries', () => {
    const id = crypto.randomUUID()
    const payload = minimalFastJson([id])
    payload.turns[0]!.strengths = ['a', 'b', 'c'] as unknown as string[]
    const r = FastScenarioEvaluationSchema.safeParse(payload)
    expect(r.success).toBe(false)
  })

  it('coerces string scores and accepts the compact fast envelope', () => {
    const id = crypto.randomUUID()
    const payload = minimalFastJson([id]) as Record<string, unknown>
    ;(payload.overall as Record<string, unknown>).grammarScore = '88'
    const r = FastScenarioEvaluationSchema.safeParse(payload)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.overall.grammarScore).toBe(88)
    }
  })

  it('liftFastToDeepScenarioEvaluation produces a deep envelope mappable to the legacy session shape', () => {
    const id = crypto.randomUUID()
    const fast = minimalFastJson([id])
    const deep = liftFastToDeepScenarioEvaluation(fast)
    expect(deep.turns).toHaveLength(1)
    expect(deep.turns[0]!.whatLanded.length).toBeLessThanOrEqual(2)
    expect(deep.turns[0]!.tightenNext.length).toBeLessThanOrEqual(2)
    expect(deep.turns[0]!.weakPatterns).toEqual([])
    expect(deep.recommendations.suggestedScenarioId).toBeNull()
  })
})

describe('processScenarioDialogueRawLlmResponse with schema=fast', () => {
  it('parses a fast envelope and validates it', () => {
    const uid = crypto.randomUUID()
    const dialogue = baseDialogue(uid, crypto.randomUUID())
    const r = processScenarioDialogueRawLlmResponse({
      raw: JSON.stringify(minimalFastJson([uid])),
      scenarioTitle: 'Cafe',
      scenarioGoals: ['Bestellen'],
      learnerLevel: 'A2',
      userTurnInputs: userInputs(uid),
      dialogue,
      schema: 'fast',
    })
    expect(r.ok).toBe(true)
  })

  it('rejects a deep envelope when the fast schema is requested', () => {
    const uid = crypto.randomUUID()
    const dialogue = baseDialogue(uid, crypto.randomUUID())
    /** Deep envelopes carry whatLanded/tightenNext arrays that the fast schema does not allow. */
    const deepShaped = {
      ...minimalFastJson([uid]),
      turns: [
        {
          turnId: uid,
          languageScores: {
            grammar: 70,
            vocabulary: 70,
            sentenceStructure: 70,
            naturalness: 70,
            taskRelevance: 70,
          },
          mainFix: 'fix',
          /** Legacy deep-only fields — should violate fast's strict cap on `strengths` (max 2). */
          strengths: ['a', 'b', 'c', 'd'],
          improvements: [],
          correctedLine: '',
          strongerNaturalLine: '',
        },
      ],
    }
    const r = processScenarioDialogueRawLlmResponse({
      raw: JSON.stringify(deepShaped),
      scenarioTitle: 'Cafe',
      scenarioGoals: ['Bestellen'],
      learnerLevel: 'A2',
      userTurnInputs: userInputs(uid),
      dialogue,
      schema: 'fast',
    })
    expect(r.ok).toBe(false)
  })
})

describe('evaluateScenarioDialogueStructured (fast mode end-to-end with mocked provider)', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test'
    process.env.AI_PROVIDER = 'openai'
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('runs fast mode by default, decomposes openaiDiagnostics into build/network/parse/validate', async () => {
    const uid = crypto.randomUUID()
    const fastJson = JSON.stringify(minimalFastJson([uid]))
    const richSpy = vi.spyOn(chat, 'runSpeakLiveEvalChatCompletionRich').mockImplementation(async () => {
      /** Sleep so providerNetworkMs is observably > 0 even on fast machines. */
      await new Promise((r) => setTimeout(r, 12))
      return {
        content: fastJson,
        providerNetworkMs: 12,
        responseReadMs: 1,
        requestId: 'req-test-1',
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 320, totalTokens: 420 },
      }
    })
    const dialogue = baseDialogue(uid, crypto.randomUUID())
    let openaiDiag: { schemaName: string; providerNetworkMs: number; jsonParseMs: number; schemaValidationMs: number; requestBuildMs: number } | undefined
    const r = await evaluateScenarioDialogueStructured(
      {
        dialogue,
        userTurnInputs: userInputs(uid),
        scenarioTitle: 'Cafe',
        scenarioGoals: ['Bestellen'],
        learnerLevel: 'A2',
      },
      {
        attemptJsonRepair: false,
        onOpenAiDiagnostics: (d) => {
          openaiDiag = d as typeof openaiDiag
        },
      },
    )
    expect(richSpy).toHaveBeenCalledTimes(1)
    expect(r.ok).toBe(true)
    expect(r.schemaName).toBe('fast')
    expect(openaiDiag?.schemaName).toBe('fast')
    expect(openaiDiag?.providerNetworkMs).toBeGreaterThanOrEqual(10)
    expect(openaiDiag?.requestBuildMs).toBeGreaterThanOrEqual(0)
    expect(openaiDiag?.jsonParseMs).toBeGreaterThanOrEqual(0)
    expect(openaiDiag?.schemaValidationMs).toBeGreaterThanOrEqual(0)
    if (r.ok) {
      expect(r.openaiDiagnostics.requestId).toBe('req-test-1')
      expect(r.openaiDiagnostics.finishReason).toBe('stop')
      expect(r.openaiDiagnostics.actualOutputTokens).toBe(320)
      expect(r.openaiDiagnostics.totalTokens).toBe(420)
      /** structuredLlmMs MUST equal providerNetworkMs (+ repairMs when repair runs) only. */
      expect(r.diagnostics.structuredLlmMs).toBe(r.chatMs)
    }
  })

  it('compresses prompt: assistant turns are trimmed shorter than user turns', () => {
    const uid = 'user-id'
    const aid = 'asst-id'
    const longAssistant = 'A'.repeat(1500)
    const longUser = 'B'.repeat(2400)
    const dialogue = buildScenarioDialogueStructuredEvalInputFromMessages({
      threadId: 't',
      scenarioTitle: 'Cafe',
      scenarioSlug: 'cafe',
      scenarioGoals: ['g1'],
      learnerLevel: 'A2',
      messages: [
        { id: aid, threadId: 't', sender: 'assistant', messageType: 'text', content: longAssistant, metadata: null, createdAt: '2026-05-01T10:00:00.000Z' },
        { id: uid, threadId: 't', sender: 'user', messageType: 'text', content: longUser, metadata: null, createdAt: '2026-05-01T10:00:01.000Z' },
      ],
      recapGoalsCompleted: [],
      recapGoalsMissed: [],
      recapWhatWentWell: [],
      recapWhatToImprove: [],
    })
    const assistantText = dialogue.dialogueTurns.find((t) => t.turnId === aid)!.text
    const userText = dialogue.dialogueTurns.find((t) => t.turnId === uid)!.text
    expect(assistantText.length).toBeLessThanOrEqual(260)
    expect(userText.length).toBeGreaterThan(assistantText.length)
  })

  it('uses fast model + token cap (smaller than legacy 4096)', async () => {
    const uid = crypto.randomUUID()
    let observedMaxTokens = 0
    vi.spyOn(chat, 'runSpeakLiveEvalChatCompletionRich').mockImplementation(async (params) => {
      observedMaxTokens = params.maxOutputTokens
      return {
        content: JSON.stringify(minimalFastJson([uid])),
        providerNetworkMs: 1,
        responseReadMs: 0,
      }
    })
    const r = await evaluateScenarioDialogueStructured(
      {
        dialogue: baseDialogue(uid, crypto.randomUUID()),
        userTurnInputs: userInputs(uid),
        scenarioTitle: 'Cafe',
        scenarioGoals: ['Bestellen'],
        learnerLevel: 'A2',
      },
      { attemptJsonRepair: false },
    )
    expect(r.ok).toBe(true)
    /** New default fast cap is 1100 (clamped to [600, 2400]); turn-aware compute keeps it modest. */
    expect(observedMaxTokens).toBeGreaterThanOrEqual(600)
    expect(observedMaxTokens).toBeLessThanOrEqual(2400)
    /** Still well below the legacy 4096 token deep budget. */
    expect(observedMaxTokens).toBeLessThan(4096)
  })

  it('passes a per-call requestTimeoutMs to the provider (FAST sync path tightens this)', async () => {
    const uid = crypto.randomUUID()
    let observedTimeout: number | undefined
    vi.spyOn(chat, 'runSpeakLiveEvalChatCompletionRich').mockImplementation(async (params) => {
      observedTimeout = params.requestTimeoutMs
      return {
        content: JSON.stringify(minimalFastJson([uid])),
        providerNetworkMs: 1,
        responseReadMs: 0,
      }
    })
    const r = await evaluateScenarioDialogueStructured(
      {
        dialogue: baseDialogue(uid, crypto.randomUUID()),
        userTurnInputs: userInputs(uid),
        scenarioTitle: 'Cafe',
        scenarioGoals: ['Bestellen'],
        learnerLevel: 'A2',
      },
      { mode: 'fast', attemptJsonRepair: false },
    )
    expect(r.ok).toBe(true)
    expect(observedTimeout).toBeDefined()
    /** Default tightening is 45s; clamped to [8000, 60000]. */
    expect(observedTimeout!).toBeGreaterThanOrEqual(8_000)
    expect(observedTimeout!).toBeLessThanOrEqual(60_000)
    if (r.ok) {
      expect(r.openaiDiagnostics.requestTimeoutMs).toBe(observedTimeout)
      expect(r.openaiDiagnostics.maxOutputTokensRequested).toBeGreaterThan(0)
    }
  })

  it('does NOT tighten the timeout for DEEP mode (background enrichment may take longer)', async () => {
    const uid = crypto.randomUUID()
    let observedTimeout: number | undefined
    vi.spyOn(chat, 'runSpeakLiveEvalChatCompletionRich').mockImplementation(async (params) => {
      observedTimeout = params.requestTimeoutMs
      return {
        content: JSON.stringify(minimalFastJson([uid])),
        providerNetworkMs: 1,
        responseReadMs: 0,
      }
    })
    await evaluateScenarioDialogueStructured(
      {
        dialogue: baseDialogue(uid, crypto.randomUUID()),
        userTurnInputs: userInputs(uid),
        scenarioTitle: 'Cafe',
        scenarioGoals: ['Bestellen'],
        learnerLevel: 'A2',
      },
      { mode: 'deep', attemptJsonRepair: false },
    )
    /** DEEP path does not pass a per-call timeout — falls back to the global 120s default. */
    expect(observedTimeout).toBeUndefined()
  })

  it('injects a dynamic per-turn budget into the FAST system prompt (helps the model self-pace)', async () => {
    const uids = Array.from({ length: 7 }, () => crypto.randomUUID())
    let observedSystemPrompt = ''
    vi.spyOn(chat, 'runSpeakLiveEvalChatCompletionRich').mockImplementation(async (params) => {
      const sys = params.messages.find((m) => m.role === 'system')
      observedSystemPrompt = sys?.content ?? ''
      return {
        content: JSON.stringify(minimalFastJson(uids)),
        providerNetworkMs: 1,
        responseReadMs: 0,
      }
    })
    const turns: LiveEvalLlmTurnInput[] = uids.map((id, i) => ({
      turnId: id,
      turnIndex: i,
      learnerTranscript: 'x',
      learnerTranscriptNormalized: 'x',
      assistantReply: 'y',
      hasLearnerAudio: true,
      sessionGoals: ['Bestellen'],
      azureSummary: null,
    }))
    const dialogue: ScenarioDialogueStructuredEvalInput = {
      ...baseDialogue(uids[0]!, crypto.randomUUID()),
      dialogueTurns: uids.map((id) => ({ turnId: id, speaker: 'user' as const, text: 'hoi' })),
    }
    await evaluateScenarioDialogueStructured(
      {
        dialogue,
        userTurnInputs: turns,
        scenarioTitle: 'Cafe',
        scenarioGoals: ['Bestellen'],
        learnerLevel: 'A2',
      },
      { mode: 'fast', attemptJsonRepair: false },
    )
    /** The dynamic budget reminder must call out the user-turn count + total token budget. */
    expect(observedSystemPrompt).toMatch(/Output budget for THIS session/)
    expect(observedSystemPrompt).toMatch(/7 user turns/)
    expect(observedSystemPrompt).toMatch(/Per-turn target/)
  })

  it('scales the FAST output budget with user turn count (more turns → more headroom)', async () => {
    const uids = Array.from({ length: 8 }, () => crypto.randomUUID())
    const fastJson = JSON.stringify({
      ...minimalFastJson(uids),
    })
    let observedMaxTokens = 0
    vi.spyOn(chat, 'runSpeakLiveEvalChatCompletionRich').mockImplementation(async (params) => {
      observedMaxTokens = params.maxOutputTokens
      return { content: fastJson, providerNetworkMs: 1, responseReadMs: 0 }
    })
    const turns: LiveEvalLlmTurnInput[] = uids.map((id, i) => ({
      turnId: id,
      turnIndex: i,
      learnerTranscript: 'x',
      learnerTranscriptNormalized: 'x',
      assistantReply: 'y',
      hasLearnerAudio: true,
      sessionGoals: ['Bestellen'],
      azureSummary: null,
    }))
    const dialogue: ScenarioDialogueStructuredEvalInput = {
      ...baseDialogue(uids[0]!, crypto.randomUUID()),
      dialogueTurns: uids.map((id) => ({ turnId: id, speaker: 'user' as const, text: 'hoi' })),
    }
    const r = await evaluateScenarioDialogueStructured(
      {
        dialogue,
        userTurnInputs: turns,
        scenarioTitle: 'Cafe',
        scenarioGoals: ['Bestellen'],
        learnerLevel: 'A2',
      },
      { attemptJsonRepair: false },
    )
    expect(r.ok).toBe(true)
    /** 8 turns → 520 + 210*8 = 2200 → still within the 2400 absolute ceiling. */
    expect(observedMaxTokens).toBeGreaterThanOrEqual(2000)
    expect(observedMaxTokens).toBeLessThanOrEqual(2400)
  })

  it('salvages a finishReason="length" truncated JSON without a repair LLM call', async () => {
    const uid = crypto.randomUUID()
    const fullJson = JSON.stringify(minimalFastJson([uid]))
    /** Simulate the model running out of output tokens mid-string (real-world repro). */
    const truncated = fullJson.slice(0, fullJson.length - 80) + '"unterm'
    const richSpy = vi
      .spyOn(chat, 'runSpeakLiveEvalChatCompletionRich')
      .mockResolvedValueOnce({
        content: truncated,
        providerNetworkMs: 5,
        responseReadMs: 0,
        finishReason: 'length',
      })
    const r = await evaluateScenarioDialogueStructured(
      {
        dialogue: baseDialogue(uid, crypto.randomUUID()),
        userTurnInputs: userInputs(uid),
        scenarioTitle: 'Cafe',
        scenarioGoals: ['Bestellen'],
        learnerLevel: 'A2',
      },
      { attemptJsonRepair: false },
    )
    /** Salvage runs purely locally — exactly ONE provider call total. */
    expect(richSpy).toHaveBeenCalledTimes(1)
    expect(r.openaiDiagnostics.lengthSalvageAttempted).toBe(true)
    /** Whether `lengthSalvageOk` ends true depends on whether enough fields survived; the
     *  contract here is just that we attempted salvage and never made an extra LLM call. */
    if (r.ok) {
      expect(r.openaiDiagnostics.lengthSalvageOk).toBe(true)
    }
  })

  it('does not run repair LLM call when attemptJsonRepair=false (sync flow contract)', async () => {
    const uid = crypto.randomUUID()
    /** Provider returns broken JSON — repair would normally retry, but fast-sync disables it. */
    const richSpy = vi.spyOn(chat, 'runSpeakLiveEvalChatCompletionRich').mockResolvedValue({
      content: '{ "broken":',
      providerNetworkMs: 5,
      responseReadMs: 0,
    })
    const r = await evaluateScenarioDialogueStructured(
      {
        dialogue: baseDialogue(uid, crypto.randomUUID()),
        userTurnInputs: userInputs(uid),
        scenarioTitle: 'Cafe',
        scenarioGoals: ['Bestellen'],
        learnerLevel: 'A2',
      },
      { attemptJsonRepair: false },
    )
    expect(richSpy).toHaveBeenCalledTimes(1)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.repairAttempted).toBe(false)
      expect(r.openaiDiagnostics.retryCount).toBe(0)
    }
  })
})

describe('Deep enrichment scheduler (off by default)', () => {
  beforeEach(() => {
    delete process.env.REPORT_ENABLE_DEEP_REPORT_ENRICHMENT
  })
  afterEach(() => {
    delete process.env.REPORT_ENABLE_DEEP_REPORT_ENRICHMENT
    vi.restoreAllMocks()
  })

  it('does not schedule when REPORT_ENABLE_DEEP_REPORT_ENRICHMENT is not set', () => {
    const persist = vi.fn()
    const r = scheduleDeepEnrichmentBackground({
      input: {
        threadId: 't',
        scenarioTitle: 'Cafe',
        scenarioSlug: 'cafe',
        scenarioGoals: ['g'],
        learnerLevel: 'A2',
        recapGoalsCompleted: [],
        recapGoalsMissed: [],
        recapWhatWentWell: [],
        recapWhatToImprove: [],
        messages: [],
        userTurnInputs: [],
      },
      persist,
    })
    expect(r.scheduled).toBe(false)
    expect(persist).not.toHaveBeenCalled()
  })

  it('schedules and merges into evaluation when explicitly enabled', async () => {
    const uid = crypto.randomUUID()
    vi.spyOn(chat, 'runSpeakLiveEvalChatCompletionRich').mockResolvedValue({
      content: JSON.stringify(minimalFastJson([uid])),
      providerNetworkMs: 1,
      responseReadMs: 0,
    })
    process.env.OPENAI_API_KEY = 'sk-test'
    process.env.AI_PROVIDER = 'openai'
    let persisted: unknown
    const r = scheduleDeepEnrichmentBackground({
      enabled: true,
      input: {
        threadId: 'th',
        scenarioTitle: 'Cafe',
        scenarioSlug: 'cafe',
        scenarioGoals: ['Bestellen'],
        learnerLevel: 'A2',
        recapGoalsCompleted: [],
        recapGoalsMissed: [],
        recapWhatWentWell: [],
        recapWhatToImprove: [],
        messages: [
          { id: crypto.randomUUID(), threadId: 'th', sender: 'assistant', messageType: 'text', content: 'Goedemorgen', metadata: null, createdAt: '2026-05-01T10:00:00.000Z' },
          { id: uid, threadId: 'th', sender: 'user', messageType: 'text', content: 'Koffie graag', metadata: null, createdAt: '2026-05-01T10:00:01.000Z' },
        ],
        userTurnInputs: userInputs(uid),
      },
      persist: async (deep) => {
        persisted = deep
      },
    })
    expect(r.scheduled).toBe(true)
    /** Wait one microtask so the background promise resolves. */
    await new Promise((res) => setTimeout(res, 30))
    expect(persisted).toBeTruthy()
  })

  it('mergeDeepEnrichmentIntoEvaluation never overwrites a populated coachSummary with a shorter one', () => {
    const evalRecord = {
      overallSummary: { coachSummary: 'A long coach summary that is already populated.', fluencyRhythmSummary: '', pronunciationSummary: '', whatToTryNext: [] },
      turnEvaluations: [],
    } as unknown as LiveSessionEvaluation
    const original = evalRecord.overallSummary?.coachSummary
    mergeDeepEnrichmentIntoEvaluation({
      evaluation: evalRecord,
      deep: {
        overall: {
          summary: 'short',
          scenarioOutcomeScore: 50,
          taskCompletionScore: 50,
          languageScore: 50,
          conversationFlowScore: 50,
          grammarScore: 50,
          vocabularyScore: 50,
          naturalnessScore: 50,
          estimatedLevel: 'A2',
          confidence: 50,
          primaryFocus: { title: '', why: '', pattern: '', example: '' },
        },
        goals: [],
        turns: [],
        recommendations: { nextDrillTitle: '', nextDrillReason: '', suggestedScenarioId: null, suggestedPracticeType: 'coach' },
      },
    })
    expect(evalRecord.overallSummary?.coachSummary).toBe(original)
  })
})

describe('Azure live invariant', () => {
  it('SPEAK_LIVE_AZURE_REQUIRED_MODE is "live" — strict-live contract for the FluentCopilot report', async () => {
    const m = await import('./liveVoiceEvaluationTypes')
    expect(m.SPEAK_LIVE_AZURE_REQUIRED_MODE).toBe('live')
  })
})

describe('salvageTruncatedJson', () => {
  it('returns null for non-JSON input', () => {
    expect(salvageTruncatedJson('')).toBeNull()
    expect(salvageTruncatedJson('not json at all')).toBeNull()
  })

  it('closes a truncated object with an unterminated trailing string', () => {
    const truncated = '{"a": 1, "b": "hello", "c": "unterm'
    const repaired = salvageTruncatedJson(truncated)
    expect(repaired).not.toBeNull()
    const parsed = JSON.parse(repaired!) as Record<string, unknown>
    expect(parsed.a).toBe(1)
    expect(parsed.b).toBe('hello')
    expect('c' in parsed).toBe(false)
  })

  it('closes a truncated nested array+object structure', () => {
    const truncated = '{"turns":[{"id":"x","scores":{"g":1,"v":2}},{"id":"y","scores":{"g":3,"v":'
    const repaired = salvageTruncatedJson(truncated)
    expect(repaired).not.toBeNull()
    const parsed = JSON.parse(repaired!) as { turns: Array<{ id: string; scores: Record<string, number> }> }
    expect(Array.isArray(parsed.turns)).toBe(true)
    /** Salvager keeps both turns; the unfinished `"v":<value>` field is dropped from the 2nd. */
    expect(parsed.turns).toHaveLength(2)
    expect(parsed.turns[0]).toEqual({ id: 'x', scores: { g: 1, v: 2 } })
    expect(parsed.turns[1]!.id).toBe('y')
    expect(parsed.turns[1]!.scores.g).toBe(3)
    expect('v' in parsed.turns[1]!.scores).toBe(false)
  })

  it('strips dangling commas before closing', () => {
    const truncated = '{"a":1,"b":2,'
    const repaired = salvageTruncatedJson(truncated)
    expect(repaired).not.toBeNull()
    expect(JSON.parse(repaired!)).toEqual({ a: 1, b: 2 })
  })

  it('returns null when nothing safe survives', () => {
    expect(salvageTruncatedJson('{"x"')).toBeNull()
  })
})

describe('Enum synonym normalization (no-LLM coercion before Zod)', () => {
  it('normalizeGoalStatus maps the common LLM synonyms to the strict enum', () => {
    expect(normalizeGoalStatus('achieved')).toBe('completed')
    expect(normalizeGoalStatus('Achieved.')).toBe('completed')
    expect(normalizeGoalStatus('done')).toBe('completed')
    expect(normalizeGoalStatus('success')).toBe('completed')
    expect(normalizeGoalStatus('completed')).toBe('completed')
    expect(normalizeGoalStatus('not achieved')).toBe('missed')
    expect(normalizeGoalStatus('Not Achieved')).toBe('missed')
    expect(normalizeGoalStatus('failed')).toBe('missed')
    expect(normalizeGoalStatus('incomplete')).toBe('missed')
    expect(normalizeGoalStatus('unmet')).toBe('missed')
    expect(normalizeGoalStatus('partial')).toBe('partially_completed')
    expect(normalizeGoalStatus('partially')).toBe('partially_completed')
    expect(normalizeGoalStatus('partially_completed')).toBe('partially_completed')
    expect(normalizeGoalStatus('in progress')).toBe('partially_completed')
    expect(normalizeGoalStatus('halfway')).toBe('partially_completed')
    expect(normalizeGoalStatus('something weird')).toBeNull()
    expect(normalizeGoalStatus(null)).toBeNull()
    expect(normalizeGoalStatus(123)).toBeNull()
  })

  it('normalizeSuggestedPracticeType maps free-text descriptions to the enum keyword', () => {
    expect(normalizeSuggestedPracticeType('word_drill')).toBe('word_drill')
    expect(normalizeSuggestedPracticeType('Word drill: question words')).toBe('word_drill')
    expect(normalizeSuggestedPracticeType('Vocabulary practice')).toBe('word_drill')
    expect(normalizeSuggestedPracticeType('Try the scenario again with shorter sentences.')).toBe('scenario_retry')
    expect(normalizeSuggestedPracticeType('Run it back')).toBe('scenario_retry')
    expect(normalizeSuggestedPracticeType('Listening practice with audio.')).toBe('listening')
    expect(normalizeSuggestedPracticeType('read aloud')).toBe('read_aloud')
    expect(normalizeSuggestedPracticeType('Chat with the coach for guided practice.')).toBe('coach')
    /** Real-world repro from the diagnostics report. */
    expect(normalizeSuggestedPracticeType('Interactive exercises on question formation.')).toBe('sentence_drill')
    expect(normalizeSuggestedPracticeType('Sentence pattern drill')).toBe('sentence_drill')
    expect(normalizeSuggestedPracticeType('something completely off-topic 12345')).toBeNull()
    expect(normalizeSuggestedPracticeType(null)).toBeNull()
  })

  it('normalizeScenarioDialogueStructuredJsonRoot rewrites status synonyms in goals before Zod sees them', () => {
    const value = {
      overall: { primaryFocus: { title: 't', why: 'w', pattern: 'p', example: 'e' } },
      goals: [
        { goalId: 'g0', title: 'a', weight: 0.5, status: 'achieved', score: 80 },
        { goalId: 'g1', title: 'b', weight: 0.5, status: 'not achieved', score: 30 },
      ],
      recommendations: { suggestedPracticeType: 'Interactive exercises on question formation.' },
    }
    const out = normalizeScenarioDialogueStructuredJsonRoot(value) as {
      goals: Array<{ status: string }>
      recommendations: { suggestedPracticeType: string; nextDrillReason?: string }
    }
    expect(out.goals[0]!.status).toBe('completed')
    expect(out.goals[1]!.status).toBe('missed')
    expect(out.recommendations.suggestedPracticeType).toBe('sentence_drill')
    /** Original free-text reason is preserved into nextDrillReason when that field was empty. */
    expect(out.recommendations.nextDrillReason).toContain('Interactive exercises')
  })

  it('end-to-end: processScenarioDialogueRawLlmResponse accepts an envelope with synonym statuses (matches the real failure mode)', () => {
    const uid = crypto.randomUUID()
    const dialogue = baseDialogue(uid, crypto.randomUUID())
    const env = minimalFastJson([uid]) as unknown as Record<string, unknown>
    /** Inject the EXACT enum violations seen in the production diagnostics. */
    ;(env.goals as Array<Record<string, unknown>>)[0]!.status = 'achieved'
    ;(env.recommendations as Record<string, unknown>).suggestedPracticeType = 'Interactive exercises on question formation.'
    const r = processScenarioDialogueRawLlmResponse({
      raw: JSON.stringify(env),
      scenarioTitle: 'Cafe',
      scenarioGoals: ['Bestellen'],
      learnerLevel: 'A2',
      userTurnInputs: userInputs(uid),
      dialogue,
      schema: 'fast',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.structured.goals[0]!.status).toBe('completed')
      expect(r.structured.recommendations.suggestedPracticeType).toBe('sentence_drill')
    }
  })
})

describe('Live Azure prep timings (post-session reuse)', () => {
  /**
   * The first `await import('./liveTurnVoicePrepService')` here triggers a cold-cache transform
   * of the module + its dependency closure. Under full-suite contention this occasionally exceeds
   * vitest's 5s default; bump to 15s for hermetic CI while keeping isolated runs near-instant.
   */
  it('readLiveTurnVoicePrep synthesizes azureProviderRequestMs=0 for legacy prep payloads', { timeout: 15_000 }, async () => {
    const { readLiveTurnVoicePrep } = await import('./liveTurnVoicePrepService')
    const legacy = {
      liveTurnVoicePrepV1: {
        version: 1,
        source: 'background_live',
        preparedAt: '2026-05-01T10:00:00.000Z',
        referenceForPa: 'hoi',
        transcriptNormalized: 'hoi',
        hasAudio: true,
        assessment: null,
        caveats: [],
        timing: { pauseCount: 0, hesitationMoments: [], rushedEnding: false },
        audioScores: { pronunciation: 80, fluency: 80, rhythm: 80, completeness: 80, clarity: 80 },
        azureSummary: null,
        audioFindings: [],
        weakWordList: [],
        rhythmLabel: null,
        audioDiagnostics: { blobPath: 'p', downloadOk: true, bufSize: 100, assessmentOk: true, assessmentCaveats: [] },
        // azureProviderRequestMs intentionally absent (older prep payload)
      },
    }
    const r = readLiveTurnVoicePrep(legacy)
    expect(r).not.toBeNull()
    expect(r!.azureProviderRequestMs).toBe(0)
  })

  it('prepareLiveTurnVoicePrep records non-zero azureProviderRequestMs when audio is scored live', { timeout: 15_000 }, async () => {
    /**
     * Mock the Azure call so the test never makes a real network request — but ensure it has a
     * measurable wall time so we can assert the captured timing is propagated.
     */
    const mod = await import('./voiceEvaluationService')
    vi.spyOn(mod, 'assessLearnerAudioForPostSession').mockImplementation(async () => {
      await new Promise((res) => setTimeout(res, 10))
      return {
        assessment: null,
        caveats: [],
        provider: { id: 'azure' as const, mode: 'azure' as const },
        summaryFeedback: null,
        recommendedNextStep: null,
      }
    })
    const { prepareLiveTurnVoicePrep } = await import('./liveTurnVoicePrepService')
    const buf = Buffer.alloc(64, 1)
    const prep = await prepareLiveTurnVoicePrep({
      audio: buf,
      mimeType: 'audio/webm',
      transcriptRaw: 'hoi',
      referenceForPa: 'hoi',
      blobPath: 'p',
      source: 'background_live',
      downloadOk: true,
      locale: 'nl-NL',
    })
    expect(prep.azureProviderRequestMs).toBeGreaterThanOrEqual(8)
  })
})
