import { describe, expect, it } from 'vitest'
import { LiveEvalLlmSessionSchema } from './liveSessionEvaluationLlm'
import type { LiveEvalLlmTurnInput } from './liveSessionEvaluationLlm'
import { mapStructuredTranscriptEvalToLiveEvalLlmSession } from './speakLiveStructuredTranscriptEvalMapper'
import type { SpeakLiveStructuredTranscriptEvalRoot } from './speakLiveStructuredTranscriptEvalSchema'

describe('mapStructuredTranscriptEvalToLiveEvalLlmSession', () => {
  it('maps structured JSON into a valid LiveEvalLlmSession envelope', () => {
    const turnId = '11111111-1111-4111-8111-111111111111'
    const turnsIn: LiveEvalLlmTurnInput[] = [
      {
        turnId,
        turnIndex: 0,
        learnerTranscript: 'Ik wil een koffie',
        learnerTranscriptNormalized: 'Ik wil een koffie',
        assistantReply: 'Natuurlijk.',
        hasLearnerAudio: true,
        sessionGoals: ['Order politely'],
        azureSummary: null,
      },
    ]
    const structured: SpeakLiveStructuredTranscriptEvalRoot = {
      turns: [
        {
          turnId,
          grammarScore: 78,
          vocabularyScore: 80,
          naturalnessScore: 76,
          sentenceStructureScore: 74,
          feedback: ['Clear intent', 'Polite opener'],
          corrections: [{ from: 'een koffie', to: 'een koffie', note: 'ok' }],
          strongerAlternative: 'Ik wil graag een koffie, alstublieft.',
          weakPatterns: ['word order in subclause'],
        },
      ],
      overall: {
        conversationFlow: 72,
        taskCompletion: 70,
        followUpQuality: 68,
        confidence: 75,
        grammarOverall: 76,
        vocabularyOverall: 78,
        naturalnessOverall: 77,
        estimatedCEFR: 'A2',
        strengths: ['Clear intent'],
        weaknesses: ['Rhythm'],
        coachingPriorities: ['Drill polite order phrases', 'Short shadowing reps'],
      },
    }
    const mapped = mapStructuredTranscriptEvalToLiveEvalLlmSession({
      structured,
      scenarioTitle: 'Café',
      scenarioGoals: ['Order politely'],
      learnerLevel: 'A2',
      turns: turnsIn,
    })
    const v = LiveEvalLlmSessionSchema.safeParse(mapped)
    expect(v.success, v.success ? '' : JSON.stringify(v.error.issues.slice(0, 5))).toBe(true)
  })
})
