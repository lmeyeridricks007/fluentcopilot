import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import type { LiveEvalLlmTurnInput } from './liveSessionEvaluationLlm'
import type { ScenarioDialogueStructuredEvalInput } from './speakLiveScenarioDialogueStructuredEvaluator'
import {
  buildScenarioDialogueStructuredEvalInputFromMessages,
  estimateApproximateTokensFromChars,
  processScenarioDialogueRawLlmResponse,
} from './speakLiveScenarioDialogueStructuredEvaluator'
import { repairScenarioDialogueStructuredJson } from './speakLiveScenarioDialogueStructuredRepair'
import type { ConversationMessage } from '../../models/contracts'

function turnEvalRow(turnId: string) {
  return {
    turnId,
    languageScores: {
      grammar: 70,
      vocabulary: 71,
      sentenceStructure: 72,
      naturalness: 73,
      taskRelevance: 74,
    },
    mainFix: 'Korte tip.',
    whatLanded: ['Duidelijk'],
    tightenNext: ['Let op woordkeuze'],
    correctedLine: 'Gecorrigeerd.',
    strongerNaturalLine: 'Natuurlijker.',
    weakPatterns: ['calque'],
    saveablePhrase: null,
    practiceNext: 'Herhaal de zin.',
  }
}

function minimalStructuredJson(userTurnIds: string[]) {
  return {
    overall: {
      summary: 'Kort overzicht.',
      scenarioOutcomeScore: 62,
      taskCompletionScore: 60,
      languageScore: 58,
      conversationFlowScore: 55,
      grammarScore: 57,
      vocabularyScore: 59,
      naturalnessScore: 56,
      estimatedLevel: 'A2',
      confidence: 70,
      primaryFocus: {
        title: 'Woordkeuze',
        why: 'Enkele onnatuurlijke keuzes.',
        pattern: 'zelfstandig naamwoord + lidwoord',
        example: 'Voorbeeldzin.',
      },
    },
    goals: [
      {
        goalId: 'goal_0',
        title: 'Bestellen',
        weight: 1,
        status: 'partially_completed',
        score: 55,
        evidenceTurnIds: userTurnIds.slice(0, 1),
      },
    ],
    turns: userTurnIds.map((id) => turnEvalRow(id)),
    recommendations: {
      nextDrillTitle: 'Woordjes cafe',
      nextDrillReason: 'Focus op bestellen.',
      suggestedScenarioId: null,
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
      { turnId: assistantId, speaker: 'assistant' as const, text: 'Goedemorgen, wat wilt u?' },
      { turnId: userId, speaker: 'user' as const, text: 'Koffie graag' },
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

describe('speakLiveScenarioDialogueStructuredEvaluator', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test-key-for-vitest'
    process.env.AI_PROVIDER = 'openai'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('estimateApproximateTokensFromChars rounds char/4', () => {
    expect(estimateApproximateTokensFromChars(400)).toBe(100)
    expect(estimateApproximateTokensFromChars(0)).toBe(0)
  })

  it('processScenarioDialogueRawLlmResponse rejects assistant turnIds in turns[]', () => {
    const uid = crypto.randomUUID()
    const aid = crypto.randomUUID()
    const dialogue = baseDialogue(uid, aid)
    const bad = minimalStructuredJson([aid])
    const r = processScenarioDialogueRawLlmResponse({
      raw: JSON.stringify(bad),
      scenarioTitle: 'Cafe',
      scenarioGoals: ['Bestellen'],
      learnerLevel: 'A2',
      userTurnInputs: userInputs(uid),
      dialogue,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.validationErrors.some((e: string) => e.includes('assistant'))).toBe(true)
    }
  })

  it('processScenarioDialogueRawLlmResponse requires one row per user turn', () => {
    const u1 = crypto.randomUUID()
    const u2 = crypto.randomUUID()
    const aid = crypto.randomUUID()
    const dialogue: ScenarioDialogueStructuredEvalInput = {
      scenarioId: 'thread-1',
      scenarioName: 'Cafe',
      scenarioType: 'cafe',
      level: 'A2',
      goals: [{ goalId: 'goal_0', title: 'Bestellen', weight: 1 }],
      dialogueTurns: [
        { turnId: aid, speaker: 'assistant', text: 'Hoi' },
        { turnId: u1, speaker: 'user', text: 'Een' },
        { turnId: u2, speaker: 'user', text: 'Twee' },
      ],
    }
    const inputs: LiveEvalLlmTurnInput[] = [
      ...userInputs(u1),
      {
        turnId: u2,
        turnIndex: 1,
        learnerTranscript: 'Twee',
        learnerTranscriptNormalized: 'Twee',
        assistantReply: '',
        hasLearnerAudio: false,
        sessionGoals: ['Bestellen'],
        azureSummary: null,
      },
    ]
    const onlyOne = minimalStructuredJson([u1])
    const r = processScenarioDialogueRawLlmResponse({
      raw: JSON.stringify(onlyOne),
      scenarioTitle: 'Cafe',
      scenarioGoals: ['Bestellen'],
      learnerLevel: 'A2',
      userTurnInputs: inputs,
      dialogue,
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.validationErrors.some((e: string) => e.includes('length'))).toBe(true)
    }
  })

  it('invalid JSON triggers parse failure', () => {
    const uid = crypto.randomUUID()
    const r = processScenarioDialogueRawLlmResponse({
      raw: '{',
      scenarioTitle: 'Cafe',
      scenarioGoals: ['g'],
      learnerLevel: 'A2',
      userTurnInputs: userInputs(uid),
      dialogue: baseDialogue(uid, crypto.randomUUID()),
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe('parse_error')
    }
  })

  it('coerces string scores and accepts missing optional goal fields', () => {
    const uid = crypto.randomUUID()
    const payload = minimalStructuredJson([uid])
    payload.overall.scenarioOutcomeScore = '88' as unknown as number
    delete (payload.goals[0] as { evidenceQuote?: string }).evidenceQuote
    delete (payload.goals[0] as { tryNext?: string }).tryNext
    const r = processScenarioDialogueRawLlmResponse({
      raw: JSON.stringify(payload),
      scenarioTitle: 'Cafe',
      scenarioGoals: ['Bestellen'],
      learnerLevel: 'A2',
      userTurnInputs: userInputs(uid),
      dialogue: baseDialogue(uid, crypto.randomUUID()),
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.overallCoachSummary.length).toBeGreaterThan(0)
      expect(r.structured.overall.scenarioOutcomeScore).toBe(88)
      for (const t of r.data.turns) {
        const te = t.turnLanguageEvaluation
        expect(te?.grammarScore).toBeGreaterThanOrEqual(0)
        expect(te?.grammarScore).toBeLessThanOrEqual(100)
      }
    }
  })

  it('replaces generic mainFix with intent-grounded line guidance', () => {
    const uid = crypto.randomUUID()
    const payload = minimalStructuredJson([uid])
    payload.turns[0]!.mainFix = 'Cover this scenario goal.'
    payload.turns[0]!.correctedLine = 'Nee, wat is de prijs van de kaart naar Amsterdam?'
    payload.turns[0]!.strongerNaturalLine = ''
    const r = processScenarioDialogueRawLlmResponse({
      raw: JSON.stringify(payload),
      scenarioTitle: 'Openbaar vervoer',
      scenarioGoals: ['Vraag prijs'],
      learnerLevel: 'A2',
      userTurnInputs: userInputs(uid),
      dialogue: baseDialogue(uid, crypto.randomUUID()),
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      const line = r.data.turns[0]!.turnLanguageEvaluation?.learnerFacingGrammarLine ?? ''
      expect(line.toLowerCase()).not.toContain('cover this scenario goal')
      expect(line).toContain('Use this clearer Dutch line')
      expect(line).toContain('kaart naar Amsterdam')
    }
  })

  it('repairScenarioDialogueStructuredJson returns null when OPENAI_API_KEY is unset', async () => {
    const prevKey = process.env.OPENAI_API_KEY
    const prevAi = process.env.AI_PROVIDER
    delete process.env.OPENAI_API_KEY
    try {
      const ret = await repairScenarioDialogueStructuredJson({
        failedJsonSnippet: '{',
        validationIssues: 'parse',
        userTurnIdsOrdered: [crypto.randomUUID()],
      })
      expect(ret).toBeNull()
    } finally {
      if (prevKey !== undefined) process.env.OPENAI_API_KEY = prevKey
      else delete process.env.OPENAI_API_KEY
      if (prevAi !== undefined) process.env.AI_PROVIDER = prevAi
      else delete process.env.AI_PROVIDER
    }
  })

  it('post-repair validation path: fixed JSON passes processScenarioDialogueRawLlmResponse after a broken payload', () => {
    const uid = crypto.randomUUID()
    const dialogue = baseDialogue(uid, crypto.randomUUID())
    const inputs = userInputs(uid)
    const brokenTurns = { ...minimalStructuredJson([uid]), turns: [] }
    const bad = processScenarioDialogueRawLlmResponse({
      raw: JSON.stringify(brokenTurns),
      scenarioTitle: 'Cafe',
      scenarioGoals: ['Bestellen'],
      learnerLevel: 'A2',
      userTurnInputs: inputs,
      dialogue,
    })
    expect(bad.ok).toBe(false)
    const good = processScenarioDialogueRawLlmResponse({
      raw: JSON.stringify(minimalStructuredJson([uid])),
      scenarioTitle: 'Cafe',
      scenarioGoals: ['Bestellen'],
      learnerLevel: 'A2',
      userTurnInputs: inputs,
      dialogue,
    })
    expect(good.ok).toBe(true)
  })

  it('buildScenarioDialogueStructuredEvalInputFromMessages orders by createdAt and maps senders', () => {
    const m: ConversationMessage[] = [
      {
        id: 'm2',
        threadId: 't',
        sender: 'user',
        messageType: 'text',
        content: 'Later',
        metadata: null,
        createdAt: '2026-05-01T10:00:02.000Z',
      },
      {
        id: 'm1',
        threadId: 't',
        sender: 'assistant',
        messageType: 'text',
        content: 'Eerst',
        metadata: null,
        createdAt: '2026-05-01T10:00:01.000Z',
      },
    ]
    const d = buildScenarioDialogueStructuredEvalInputFromMessages({
      threadId: 'th',
      scenarioTitle: 'X',
      scenarioSlug: 'x-y',
      scenarioGoals: ['a', 'b'],
      learnerLevel: 'A2',
      messages: m,
      recapGoalsCompleted: [],
      recapGoalsMissed: [],
      recapWhatWentWell: [],
      recapWhatToImprove: [],
    })
    expect(d.dialogueTurns[0]?.turnId).toBe('m1')
    expect(d.dialogueTurns[0]?.speaker).toBe('assistant')
    expect(d.dialogueTurns[1]?.turnId).toBe('m2')
    expect(d.goals).toHaveLength(2)
    expect(d.goals[0]!.weight + d.goals[1]!.weight).toBeCloseTo(1, 5)
  })
})
