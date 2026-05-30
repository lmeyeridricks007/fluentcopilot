import { describe, expect, it } from 'vitest'
import {
  applyRecommendationVerifyPatchesToCoach,
  maybeStripCrossPhraseWordPairs,
  stripUnsafeCrossPhraseWordPairs,
} from './liveSessionRecommendationVerifyLlm'
import type { LiveEvalLlmTurn } from './liveSessionEvaluationLlm'

function baseCoach(overrides: Partial<LiveEvalLlmTurn>): LiveEvalLlmTurn {
  return {
    turnId: '00000000-0000-4000-8000-000000000001',
    referenceSentence: 'Mag ik een tas?',
    referenceKind: 'reference_pronunciation',
    referenceSentenceReason: 'Clear customer ask.',
    scenarioGoalFit: {
      summary: 'ok',
      alignmentScore: 80,
      relevantGoals: [],
    },
    languageScores: {
      naturalness: 70,
      contextualFit: 70,
      registerFit: 70,
      grammaticalStability: 70,
    },
    keyStrengths: [],
    keyProblems: [],
    chunkingRhythmSuggestion: '',
    focusWords: [],
    dutchLikenessNarrative: 'ok',
    improvementActions: [],
    ...overrides,
  }
}

describe('maybeStripCrossPhraseWordPairs', () => {
  it('returns input unchanged unless SPEAK_LIVE_EVAL_REGEX_CROSS_PHRASE_STRIP=1', () => {
    const dets = [
      {
        observedToken: 'wel',
        classification: 'wrong_word_choice' as const,
        suggestedCorrection: 'tot',
        whyItMatters: 'x',
        severity: 'high' as const,
      },
    ]
    expect(maybeStripCrossPhraseWordPairs('Dank je wel tot ziens.', dets)).toEqual(dets)
  })
})

describe('stripUnsafeCrossPhraseWordPairs', () => {
  it('drops wel → tot when line has both dank je wel and tot ziens', () => {
    const out = stripUnsafeCrossPhraseWordPairs('Dank je wel tot ziens.', [
      {
        observedToken: 'wel',
        classification: 'wrong_word_choice',
        suggestedCorrection: 'tot',
        whyItMatters: 'x',
        severity: 'high',
      },
    ])
    expect(out).toEqual([])
  })
})

describe('applyRecommendationVerifyPatchesToCoach', () => {
  it('applies reference and wrong-word patches from verify output', () => {
    const coach = baseCoach({
      referenceSentence: 'Ja, u kunt hier scannen.',
      wrongWordDetections: [
        {
          observedToken: 'wel',
          classification: 'wrong_word_choice',
          suggestedCorrection: 'heb',
          whyItMatters: 'bad',
          severity: 'high',
        },
      ],
      turnLanguageEvaluation: {
        grammarScore: 70,
        sentenceConstructionScore: 70,
        naturalnessScore: 70,
        levelFitScore: 70,
        whatWorked: [],
        grammarIssues: [],
        sentenceStructureIssues: [],
        improvedVersion: 'Mag ik hier scannen?',
        whyItIsBetter: 'ok',
        levelBasedComment: 'ok',
      },
    })
    const next = applyRecommendationVerifyPatchesToCoach('Mag ik hier scannen?', coach, {
      turnId: coach.turnId,
      wrongWordDetections: [],
      referenceUpdate: {
        referenceSentence: 'Mag ik hier scannen?',
        referenceKind: 'reference_pronunciation',
        referenceSentenceReason: 'Learner question.',
      },
      improvedVersionUpdate: 'Mag ik hier scannen?',
    })
    expect(next.referenceSentence).toBe('Mag ik hier scannen?')
    expect(next.wrongWordDetections).toBeUndefined()
    expect(next.turnLanguageEvaluation?.improvedVersion).toBe('Mag ik hier scannen?')
  })
})
