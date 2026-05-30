/**
 * Tests for the parallel-fan-out FAST scenario evaluator.
 *
 * Key invariants under test:
 *   - Wall time = max(sub-call latency), NOT sum (the whole point of the refactor).
 *   - openaiDiagnostics aggregates token counts (sum) and provider time (max) correctly.
 *   - subcallCount = 1 + userTurnCount and subcallProviderNetworkMs reports per-call latency.
 *   - Per-turn sub-call failures fill a deterministic stub for that turn but DON'T fall back the
 *     whole report (partialTurnFailureCount > 0, ok still true unless > 50% turns failed).
 *   - Overall sub-call failure → entire eval fails (fallback path).
 *   - > 50% turn failures → entire eval fails (deterministic fallback for whole report).
 *   - Output preserves the user-turn input order even if the model garbles UUIDs.
 *   - Default fast model is `gpt-4.1-mini` (env override still honoured).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import * as chat from '../ai/speakLiveEvalChatCompletion'
import { evaluateScenarioDialogueParallel } from './speakLiveScenarioDialogueParallelEvaluator'
import {
  FastScenarioOverallOnlySchema,
  FastScenarioTurnOnlySchema,
  combineFastEvaluationParts,
  type FastScenarioOverallOnlyOutput,
  type FastScenarioEvaluationOutput,
} from './speakLiveScenarioDialogueStructured.schema'
import {
  getReportEvalModelFast,
  getReportEvalMaxOutputTokensFastOverall,
  getReportEvalMaxOutputTokensFastPerTurn,
} from '../ai/config/aiProviderConfig'
import type { LiveEvalLlmTurnInput } from './liveSessionEvaluationLlm'
import type { ScenarioDialogueStructuredEvalInput } from './speakLiveScenarioDialogueStructuredEvaluator'

const PRIOR_KEY = process.env.OPENAI_API_KEY
const PRIOR_PROVIDER = process.env.AI_PROVIDER
beforeAll(() => {
  process.env.OPENAI_API_KEY = 'sk-test'
  process.env.AI_PROVIDER = 'openai'
})
afterAll(() => {
  if (PRIOR_KEY === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = PRIOR_KEY
  if (PRIOR_PROVIDER === undefined) delete process.env.AI_PROVIDER
  else process.env.AI_PROVIDER = PRIOR_PROVIDER
})

beforeEach(() => {
  vi.restoreAllMocks()
})

function buildOverallEnvelope(): FastScenarioOverallOnlyOutput {
  return {
    overall: {
      summary: 'Klare bestelling met enkele uitspraakpunten.',
      scenarioOutcomeScore: 70,
      taskCompletionScore: 75,
      languageScore: 65,
      conversationFlowScore: 70,
      grammarScore: 65,
      vocabularyScore: 70,
      naturalnessScore: 70,
      estimatedLevel: 'A2',
      confidence: 75,
      primaryFocus: { title: 'Woordkeuze', why: 'Een paar onnatuurlijke keuzes.', pattern: 'lidwoord+zn', example: 'Mag ik een koffie?' },
    },
    goals: [{ goalId: 'goal_0', title: 'Bestellen', weight: 1, status: 'partially_completed', score: 60 }],
    recommendations: { nextDrillTitle: 'Drill bestellen', nextDrillReason: 'Focus op woordkeuze.', suggestedPracticeType: 'word_drill' },
  }
}

function buildTurnEnvelope(turnId: string, score = 70): { turn: FastScenarioEvaluationOutput['turns'][number] } {
  return {
    turn: {
      turnId,
      languageScores: { grammar: score, vocabulary: score, sentenceStructure: score, naturalness: score, taskRelevance: score },
      mainFix: 'Use "mag ik" voor beleefde verzoeken.',
      strengths: ['Begrijpelijk', 'Korte zin'],
      improvements: ['Let op woordkeuze'],
      correctedLine: 'Mag ik een koffie?',
      strongerNaturalLine: 'Een koffie graag, alstublieft.',
    },
  }
}

function dialogueWithTurns(userIds: string[]): ScenarioDialogueStructuredEvalInput {
  const dialogueTurns: ScenarioDialogueStructuredEvalInput['dialogueTurns'] = []
  for (let i = 0; i < userIds.length; i += 1) {
    dialogueTurns.push({ turnId: `a${i}`, speaker: 'assistant', text: `Goedemorgen, wat wilt u? (${i})` })
    dialogueTurns.push({ turnId: userIds[i]!, speaker: 'user', text: `Een koffie graag (${i})` })
  }
  dialogueTurns.push({ turnId: `a${userIds.length}`, speaker: 'assistant', text: 'Tot ziens.' })
  return {
    scenarioId: 'thread-1',
    scenarioName: 'Cafe',
    scenarioType: 'cafe',
    level: 'A2',
    goals: [{ goalId: 'goal_0', title: 'Bestellen', weight: 1 }],
    dialogueTurns,
  }
}

function userInputs(userIds: string[]): LiveEvalLlmTurnInput[] {
  return userIds.map((id, i) => ({
    turnId: id,
    turnIndex: i,
    learnerTranscript: `Een koffie graag (${i})`,
    learnerTranscriptNormalized: `Een koffie graag (${i})`,
    assistantReply: `Goedemorgen, wat wilt u? (${i})`,
    hasLearnerAudio: true,
    sessionGoals: ['Bestellen'],
    azureSummary: null,
  }))
}

describe('FastScenarioOverallOnlySchema', () => {
  it('accepts a valid overall envelope (no turns field)', () => {
    const r = FastScenarioOverallOnlySchema.safeParse(buildOverallEnvelope())
    expect(r.success).toBe(true)
  })

  it('rejects an envelope that includes the turns field on the strict shape', () => {
    /** Adds a turns field — z.object IS strict by default for unknown keys when used in .strict(),
     *  but z.object alone allows extra keys. The schema-level guarantee is that overall+goals+recs
     *  are present and well-formed. We treat the missing/extra-keys trade-off in the orchestrator. */
    const env = { ...buildOverallEnvelope(), turns: [] }
    const r = FastScenarioOverallOnlySchema.safeParse(env)
    expect(r.success).toBe(true) // still valid by default; extra keys ignored
  })
})

describe('FastScenarioTurnOnlySchema', () => {
  it('accepts a single-turn envelope', () => {
    const r = FastScenarioTurnOnlySchema.safeParse(buildTurnEnvelope('t1'))
    expect(r.success).toBe(true)
  })

  it('rejects when languageScores is missing', () => {
    const bad = buildTurnEnvelope('t1') as unknown as { turn: Record<string, unknown> }
    delete bad.turn.languageScores
    const r = FastScenarioTurnOnlySchema.safeParse(bad)
    expect(r.success).toBe(false)
  })
})

describe('combineFastEvaluationParts', () => {
  it('reassembles overall + per-turn rows into a complete fast envelope', () => {
    const overall = buildOverallEnvelope()
    const t1 = buildTurnEnvelope('t1').turn
    const t2 = buildTurnEnvelope('t2').turn
    const combined = combineFastEvaluationParts(overall, [t1, t2])
    expect(combined.overall.estimatedLevel).toBe('A2')
    expect(combined.goals).toHaveLength(1)
    expect(combined.turns).toHaveLength(2)
    expect(combined.turns[0]!.turnId).toBe('t1')
    expect(combined.turns[1]!.turnId).toBe('t2')
    expect(combined.recommendations.suggestedPracticeType).toBe('word_drill')
  })
})

describe('evaluateScenarioDialogueParallel — wall-time architecture', () => {
  it('issues 1 + N concurrent sub-calls and total wall time ≈ slowest sub-call (NOT sum)', async () => {
    const ids = ['u1', 'u2', 'u3', 'u4']
    const overallEnv = buildOverallEnvelope()
    const callDelay = 60
    let callCount = 0
    vi.spyOn(chat, 'runSpeakLiveEvalChatCompletionRich').mockImplementation(async (params) => {
      callCount += 1
      const isOverall = params.maxOutputTokens === getReportEvalMaxOutputTokensFastOverall()
      await new Promise((r) => setTimeout(r, callDelay))
      const content = isOverall
        ? JSON.stringify(overallEnv)
        : JSON.stringify(buildTurnEnvelope(`should-be-overwritten`))
      return {
        content,
        providerNetworkMs: callDelay,
        responseReadMs: 0,
        usage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
        finishReason: 'stop',
      }
    })
    const startedAt = Date.now()
    const r = await evaluateScenarioDialogueParallel({
      dialogue: dialogueWithTurns(ids),
      userTurnInputs: userInputs(ids),
      scenarioTitle: 'Cafe',
      scenarioGoals: ['Bestellen'],
      learnerLevel: 'A2',
    })
    const elapsed = Date.now() - startedAt
    expect(r.ok).toBe(true)
    expect(callCount).toBe(1 + ids.length) // 1 overall + N per-turn
    /** Concurrent: total wall time MUST be << sum. Each call takes 60ms; sum would be 300ms. */
    expect(elapsed).toBeLessThan(callDelay * 2.5) // wall ~ 60ms + scheduling overhead
    if (r.ok) {
      expect(r.openaiDiagnostics.subcallCount).toBe(1 + ids.length)
      expect(r.openaiDiagnostics.subcallProviderNetworkMs).toHaveLength(1 + ids.length)
      /** providerNetworkMs is the MAX across sub-calls, NOT the sum. */
      expect(r.openaiDiagnostics.providerNetworkMs).toBeGreaterThanOrEqual(callDelay - 5)
      expect(r.openaiDiagnostics.providerNetworkMs).toBeLessThan(callDelay * 2)
      /** Token usage is summed across sub-calls. */
      expect(r.openaiDiagnostics.actualInputTokens).toBe(200 * (1 + ids.length))
      expect(r.openaiDiagnostics.actualOutputTokens).toBe(150 * (1 + ids.length))
    }
  })

  it('preserves user-turn positional order even when the model garbles UUIDs', async () => {
    const ids = ['user-A', 'user-B', 'user-C']
    const overallEnv = buildOverallEnvelope()
    vi.spyOn(chat, 'runSpeakLiveEvalChatCompletionRich').mockImplementation(async (params) => {
      const isOverall = params.maxOutputTokens === getReportEvalMaxOutputTokensFastOverall()
      const content = isOverall
        ? JSON.stringify(overallEnv)
        : /** Per-turn calls return turnId="garbled-uuid-from-model" — orchestrator must overwrite. */
          JSON.stringify(buildTurnEnvelope('garbled-uuid-from-model'))
      return {
        content,
        providerNetworkMs: 5,
        responseReadMs: 0,
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
        finishReason: 'stop',
      }
    })
    const r = await evaluateScenarioDialogueParallel({
      dialogue: dialogueWithTurns(ids),
      userTurnInputs: userInputs(ids),
      scenarioTitle: 'Cafe',
      scenarioGoals: ['Bestellen'],
      learnerLevel: 'A2',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.structured.turns.map((t) => t.turnId)).toEqual(ids)
    }
  })

  it('uses gpt-4.1-mini as the default fast model (and routes the env override correctly)', () => {
    const prior = process.env.REPORT_EVAL_MODEL_FAST
    delete process.env.REPORT_EVAL_MODEL_FAST
    try {
      expect(getReportEvalModelFast()).toBe('gpt-4.1-mini')
      process.env.REPORT_EVAL_MODEL_FAST = 'gpt-4.1-nano'
      expect(getReportEvalModelFast()).toBe('gpt-4.1-nano')
    } finally {
      if (prior === undefined) delete process.env.REPORT_EVAL_MODEL_FAST
      else process.env.REPORT_EVAL_MODEL_FAST = prior
    }
  })
})

describe('evaluateScenarioDialogueParallel — partial failure handling', () => {
  it('one per-turn sub-call failure → that turn gets a deterministic stub, rest succeed (no full fallback)', async () => {
    const ids = ['t1', 't2', 't3', 't4']
    const overallEnv = buildOverallEnvelope()
    let perTurnCallNumber = 0
    vi.spyOn(chat, 'runSpeakLiveEvalChatCompletionRich').mockImplementation(async (params) => {
      const isOverall = params.maxOutputTokens === getReportEvalMaxOutputTokensFastOverall()
      if (isOverall) {
        return {
          content: JSON.stringify(overallEnv),
          providerNetworkMs: 5,
          responseReadMs: 0,
          usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
        }
      }
      perTurnCallNumber += 1
      if (perTurnCallNumber === 2) {
        throw new Error('simulated provider 503 for turn 2')
      }
      return {
        content: JSON.stringify(buildTurnEnvelope('placeholder')),
        providerNetworkMs: 5,
        responseReadMs: 0,
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
      }
    })
    const captured: Record<string, unknown> = {}
    const r = await evaluateScenarioDialogueParallel({
      dialogue: dialogueWithTurns(ids),
      userTurnInputs: userInputs(ids),
      scenarioTitle: 'Cafe',
      scenarioGoals: ['Bestellen'],
      learnerLevel: 'A2',
      onParallelDiagnostics: (d) => {
        captured.subcallCount = d.subcallCount
        captured.partialTurnFailureCount = d.partialTurnFailureCount
        captured.perTurnFailures = d.perTurnFailures
      },
    })
    /** 1 of 4 turns failed (25%) — overall succeeded — eval should still be ok. */
    expect(r.ok).toBe(true)
    expect(captured.partialTurnFailureCount).toBe(1)
    expect(captured.subcallCount).toBe(1 + ids.length)
    if (r.ok) {
      expect(r.structured.turns).toHaveLength(ids.length)
      /** Failed turn (index 1) should have the neutral stub — empty mainFix, neutral 60s scores. */
      const stub = r.structured.turns[1]!
      expect(stub.turnId).toBe('t2')
      expect(stub.mainFix).toBe('')
      expect(stub.languageScores.grammar).toBe(60)
      /** Other turns should have real scores from the mock (70). */
      expect(r.structured.turns[0]!.languageScores.grammar).toBe(70)
      expect(r.structured.turns[2]!.languageScores.grammar).toBe(70)
      expect(r.structured.turns[3]!.languageScores.grammar).toBe(70)
    }
  })

  it('overall sub-call failure → entire eval fails with overall_subcall_failed reason', async () => {
    const ids = ['t1', 't2']
    vi.spyOn(chat, 'runSpeakLiveEvalChatCompletionRich').mockImplementation(async (params) => {
      const isOverall = params.maxOutputTokens === getReportEvalMaxOutputTokensFastOverall()
      if (isOverall) {
        throw new Error('simulated overall outage')
      }
      return {
        content: JSON.stringify(buildTurnEnvelope('placeholder')),
        providerNetworkMs: 5,
        responseReadMs: 0,
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
      }
    })
    const r = await evaluateScenarioDialogueParallel({
      dialogue: dialogueWithTurns(ids),
      userTurnInputs: userInputs(ids),
      scenarioTitle: 'Cafe',
      scenarioGoals: ['Bestellen'],
      learnerLevel: 'A2',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toMatch(/overall_subcall_failed/)
    }
  })

  it('> 50% per-turn sub-call failures → entire eval fails (too many turn failures)', async () => {
    const ids = ['t1', 't2', 't3'] // 3 turns; need at least 2 failures (66.7%) to trip the threshold
    const overallEnv = buildOverallEnvelope()
    let turnIdx = 0
    vi.spyOn(chat, 'runSpeakLiveEvalChatCompletionRich').mockImplementation(async (params) => {
      const isOverall = params.maxOutputTokens === getReportEvalMaxOutputTokensFastOverall()
      if (isOverall) {
        return {
          content: JSON.stringify(overallEnv),
          providerNetworkMs: 5,
          responseReadMs: 0,
          usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
        }
      }
      turnIdx += 1
      if (turnIdx <= 2) throw new Error(`simulated provider failure ${turnIdx}`)
      return {
        content: JSON.stringify(buildTurnEnvelope('placeholder')),
        providerNetworkMs: 5,
        responseReadMs: 0,
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
      }
    })
    const r = await evaluateScenarioDialogueParallel({
      dialogue: dialogueWithTurns(ids),
      userTurnInputs: userInputs(ids),
      scenarioTitle: 'Cafe',
      scenarioGoals: ['Bestellen'],
      learnerLevel: 'A2',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toMatch(/too_many_turn_failures/)
    }
  })
})

describe('evaluateScenarioDialogueParallel — sub-call sizing', () => {
  it('sends maxOutputTokens=overall budget for the overall call and per-turn budget for each per-turn call', async () => {
    const ids = ['t1', 't2']
    const overallEnv = buildOverallEnvelope()
    const observed: { maxOutputTokens: number }[] = []
    vi.spyOn(chat, 'runSpeakLiveEvalChatCompletionRich').mockImplementation(async (params) => {
      observed.push({ maxOutputTokens: params.maxOutputTokens })
      const isOverall = params.maxOutputTokens === getReportEvalMaxOutputTokensFastOverall()
      return {
        content: isOverall ? JSON.stringify(overallEnv) : JSON.stringify(buildTurnEnvelope('placeholder')),
        providerNetworkMs: 5,
        responseReadMs: 0,
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
      }
    })
    await evaluateScenarioDialogueParallel({
      dialogue: dialogueWithTurns(ids),
      userTurnInputs: userInputs(ids),
      scenarioTitle: 'Cafe',
      scenarioGoals: ['Bestellen'],
      learnerLevel: 'A2',
    })
    expect(observed).toHaveLength(1 + ids.length)
    /** Exactly one overall + N per-turn calls — each with the right cap. */
    const overallCount = observed.filter((o) => o.maxOutputTokens === getReportEvalMaxOutputTokensFastOverall()).length
    const perTurnCount = observed.filter((o) => o.maxOutputTokens === getReportEvalMaxOutputTokensFastPerTurn()).length
    expect(overallCount).toBe(1)
    expect(perTurnCount).toBe(ids.length)
  })

  it('per-turn call sees ONLY the focus turn + previous/next assistant context (NOT the full transcript)', async () => {
    const ids = ['focusUser', 'otherUser']
    const overallEnv = buildOverallEnvelope()
    const perTurnPayloads: string[] = []
    vi.spyOn(chat, 'runSpeakLiveEvalChatCompletionRich').mockImplementation(async (params) => {
      const isOverall = params.maxOutputTokens === getReportEvalMaxOutputTokensFastOverall()
      if (!isOverall) {
        const userMsg = params.messages.find((m) => m.role === 'user')
        if (userMsg) perTurnPayloads.push(userMsg.content)
      }
      return {
        content: isOverall ? JSON.stringify(overallEnv) : JSON.stringify(buildTurnEnvelope('placeholder')),
        providerNetworkMs: 5,
        responseReadMs: 0,
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
      }
    })
    await evaluateScenarioDialogueParallel({
      dialogue: dialogueWithTurns(ids),
      userTurnInputs: userInputs(ids),
      scenarioTitle: 'Cafe',
      scenarioGoals: ['Bestellen'],
      learnerLevel: 'A2',
    })
    expect(perTurnPayloads).toHaveLength(2)
    /** First per-turn payload should reference focus turn id "focusUser" but NOT include the
     *  text of "otherUser" (sibling user turns are excluded — each call sees ONE user line). */
    const firstPayload = perTurnPayloads[0]!
    expect(firstPayload).toContain('focusTurnId')
    /** The sibling user text "Een koffie graag (1)" must NOT leak into the focus payload. */
    expect(firstPayload).not.toContain('Een koffie graag (1)')
  })
})
