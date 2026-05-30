import { describe, expect, it } from 'vitest'
import { applyReportAuditPatchToTurn } from './liveSessionReportAuditLlm'
import type { TurnEvaluation } from './liveVoiceEvaluationTypes'

function minimalTurn(overrides: Partial<TurnEvaluation>): TurnEvaluation {
  return {
    turnId: '00000000-0000-4000-8000-000000000002',
    turnIndex: 0,
    learnerTranscript: 'Dank je wel, Ik heb een tas ook nodig.',
    transcriptNormalized: '',
    transcriptCoaching: {
      meaningClarityScore: null,
      grammarScore: null,
      naturalnessScore: null,
      levelFitScore: null,
      issues: [],
      strengths: [],
      rewriteOptions: { safeForLevel: null, moreNatural: null, stretch: null },
      patternToReuse: null,
      explanations: [],
      evidenceLines: [],
    },
    audioCoaching: null,
    naturalRewrite: null,
    savedWordCandidates: [],
    recommendedDrills: [],
    dimensions: [],
    signalSources: {
      audioMetrics: 'azure_audio',
      languageCoach: 'transcript_language',
      scenarioContext: 'scenario_context',
    },
    feedbackItems: [],
    pronunciationIssues: [],
    fluencyIssues: [],
    referenceSentence: 'x',
    referenceSentenceReason: 'y',
    referenceKind: 'reference_pronunciation',
    referenceAudioUrl: null,
    learnerAudioUrl: null,
    quickLabels: { pronunciation: '—', rhythm: '—', naturalness: '—' },
    audioFindings: [],
    keyStrengths: [],
    keyProblems: [],
    focusWords: [],
    dutchLikenessNarrative: '',
    chunkingRhythmSuggestion: '',
    voiceAnalysisUnavailableMessage: null,
    improvementActions: [],
    assistantContext: null,
    audioScores: { pronunciation: 70, fluency: 70, rhythm: 70, completeness: 80, clarity: 70 },
    languageScores: { naturalness: 70, contextualFit: 70, registerFit: 70, grammaticalStability: 70 },
    combinedScores: { overallTurnScore: 70, clarityScore: 70, dutchLikenessScore: 70 },
    wrongWordDetections: [],
    compareListenFor: undefined,
    transcriptConfidence: null,
    mainFixLine: '',
    voiceDrillInstruction: '',
    sentenceGroundedReview: undefined,
    premiumEvaluation: undefined,
    deepEvaluation: undefined,
    languageEvaluation: {
      grammarScore: 70,
      sentenceConstructionScore: 70,
      naturalnessScore: 70,
      levelFitScore: 70,
      whatWorked: [],
      grammarIssues: [],
      sentenceStructureIssues: [],
      improvedVersion: 'Dank je wel, Ik heb een tas ook nodig.',
      whyItIsBetter: '',
      levelBasedComment: '',
    },
    scenarioGoalFit: { summary: '', alignmentScore: 70, relevantGoals: [] },
    ...overrides,
  } as TurnEvaluation
}

describe('applyReportAuditPatchToTurn', () => {
  it('clears bogus wrong-word list and flags reference change', () => {
    const row = minimalTurn({
      referenceSentence: 'Eerste ref',
      wrongWordDetections: [
        {
          observedToken: 'ook',
          classification: 'wrong_word_choice',
          suggestedCorrection: 'een',
          whyItMatters: 'bad',
          severity: 'high',
        },
      ],
    })
    const { referenceChanged } = applyReportAuditPatchToTurn(row, {
      turnId: row.turnId,
      wrongWordDetections: [],
      referenceUpdate: {
        referenceSentence: 'Ik heb ook een tas nodig.',
        referenceKind: 'more_natural_dutch',
        referenceSentenceReason: 'Tighter.',
      },
    })
    expect(row.wrongWordDetections).toBeUndefined()
    expect(referenceChanged).toBe(true)
    expect(row.referenceSentence).toBe('Ik heb ook een tas nodig.')
    expect(row.languageEvaluation?.improvedVersion).toBe('Dank je wel, Ik heb een tas ook nodig.')
  })
})
