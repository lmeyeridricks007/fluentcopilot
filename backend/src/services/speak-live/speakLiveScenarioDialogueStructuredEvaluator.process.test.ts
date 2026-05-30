import { describe, expect, it } from 'vitest'
import { processScenarioDialogueRawLlmResponse } from './speakLiveScenarioDialogueStructuredEvaluator'
import type { LiveEvalLlmTurnInput } from './liveSessionEvaluationLlm'
import type { ScenarioDialogueStructuredEvalInput } from './speakLiveScenarioDialogueStructuredEvaluator'

const CANON_USER_TURN_ID = '185ACD92-F6D6-480A-AC3D-2D3D254F35AE'
const MALFORMED_USER_TURN_ID = '185ACD92-F6D6-480A-AC3D254F35AE'
const ASSISTANT_TURN_ID = '00000000-0000-0000-0000-00000000AAAA'

function minimalStructuredJson(turnId: string): string {
  return JSON.stringify({
    overall: {
      summary: 'Test summary',
      scenarioOutcomeScore: 80,
      taskCompletionScore: 80,
      languageScore: 70,
      conversationFlowScore: 75,
      grammarScore: 72,
      vocabularyScore: 70,
      naturalnessScore: 68,
      estimatedLevel: 'A2',
      confidence: 80,
      primaryFocus: {
        title: 'Focus',
        why: 'Because',
        pattern: 'pattern',
        example: 'example',
      },
    },
    goals: [
      {
        goalId: 'goal_0',
        title: 'Goal',
        weight: 1,
        status: 'completed',
        score: 90,
        evidenceTurnIds: [],
        evidenceQuote: '',
        tryNext: '',
      },
    ],
    turns: [
      {
        turnId,
        languageScores: {
          grammar: 70,
          vocabulary: 70,
          sentenceStructure: 70,
          naturalness: 70,
          taskRelevance: 80,
        },
        mainFix: '',
        whatLanded: [],
        tightenNext: [],
        correctedLine: '',
        strongerNaturalLine: '',
        weakPatterns: [],
        saveablePhrase: null,
        practiceNext: '',
      },
    ],
    recommendations: {
      nextDrillTitle: 'Drill',
      nextDrillReason: 'Reason',
      suggestedScenarioId: null,
      suggestedPracticeType: 'scenario_retry',
    },
  })
}

const baseUserTurnInput: LiveEvalLlmTurnInput = {
  turnId: CANON_USER_TURN_ID,
  turnIndex: 0,
  learnerTranscript: 'Hallo',
  learnerTranscriptNormalized: 'Hallo',
  assistantReply: 'Ja',
  hasLearnerAudio: true,
  sessionGoals: ['Goal'],
  azureSummary: null,
}

const baseDialogue: ScenarioDialogueStructuredEvalInput = {
  scenarioId: 'thread',
  scenarioName: 'Scenario',
  scenarioType: 'public_transport',
  level: 'A2',
  goals: [{ goalId: 'goal_0', title: 'Goal', weight: 1 }],
  dialogueTurns: [
    { turnId: CANON_USER_TURN_ID, speaker: 'user', text: 'Hallo' },
    { turnId: ASSISTANT_TURN_ID, speaker: 'assistant', text: 'Ja' },
  ],
}

describe('processScenarioDialogueRawLlmResponse', () => {
  it('accepts malformed model UUIDs when row order matches user turns (positional turnId fix)', () => {
    const raw = minimalStructuredJson(MALFORMED_USER_TURN_ID)
    const out = processScenarioDialogueRawLlmResponse({
      raw,
      scenarioTitle: 'Openbaar vervoer',
      scenarioGoals: ['Goal'],
      learnerLevel: 'A2',
      userTurnInputs: [baseUserTurnInput],
      dialogue: baseDialogue,
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.structured.turns[0]!.turnId).toBe(CANON_USER_TURN_ID)
    }
  })

  it('coerces string overall.primaryFocus into the required object shape', () => {
    const payload = JSON.parse(minimalStructuredJson(CANON_USER_TURN_ID)) as Record<string, unknown>
    const ov = payload.overall as Record<string, unknown>
    ov.primaryFocus =
      'Je spraak is duidelijk. Let op natuurlijkere zinnen bij de balie. Oefen korte vraagzinnen voor prijzen en vertrektijden.'
    const raw = JSON.stringify(payload)
    const out = processScenarioDialogueRawLlmResponse({
      raw,
      scenarioTitle: 'Openbaar vervoer',
      scenarioGoals: ['Goal'],
      learnerLevel: 'A2',
      userTurnInputs: [baseUserTurnInput],
      dialogue: baseDialogue,
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(typeof out.structured.overall.primaryFocus).toBe('object')
      expect(out.structured.overall.primaryFocus.title.length).toBeGreaterThan(0)
      expect(out.structured.overall.primaryFocus.why.length).toBeGreaterThan(0)
    }
  })

  it('normalizes null turn text fields used by structured evaluator output', () => {
    const payload = JSON.parse(minimalStructuredJson(CANON_USER_TURN_ID)) as Record<string, unknown>
    const turns = payload.turns as Array<Record<string, unknown>>
    turns[0]!.correctedLine = null
    turns[0]!.strongerNaturalLine = null
    const raw = JSON.stringify(payload)
    const out = processScenarioDialogueRawLlmResponse({
      raw,
      scenarioTitle: 'Openbaar vervoer',
      scenarioGoals: ['Goal'],
      learnerLevel: 'A2',
      userTurnInputs: [baseUserTurnInput],
      dialogue: baseDialogue,
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.structured.turns[0]!.correctedLine).toBe('')
      expect(out.structured.turns[0]!.strongerNaturalLine).toBe('')
    }
  })

  it('rejects when a user row echoes an assistant turnId', () => {
    const raw = minimalStructuredJson(ASSISTANT_TURN_ID)
    const out = processScenarioDialogueRawLlmResponse({
      raw,
      scenarioTitle: 'Openbaar vervoer',
      scenarioGoals: ['Goal'],
      learnerLevel: 'A2',
      userTurnInputs: [baseUserTurnInput],
      dialogue: baseDialogue,
    })
    expect(out.ok).toBe(false)
    if (!out.ok) {
      expect(out.validationErrors.some((e) => e.includes('assistant turnId'))).toBe(true)
    }
  })
})
