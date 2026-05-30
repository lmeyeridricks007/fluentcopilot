import { describe, expect, it } from 'vitest'
import type { LiveSessionEvaluation, TurnEvaluation } from './liveVoiceEvaluationTypes'
import type { SpeakLiveAzureSpeechTurnEvaluationV1 } from './speakLiveAzureSpeechEvaluationArtifact.schema'
import { MERGED_OVERALL_SCORE_WEIGHTS } from './speakLiveMergedSpeakingReport.schema'
import { MergedSpeakingReportV1Schema } from './speakLiveMergedSpeakingReport.schema'
import {
  applyMergedSpeakingReportToLiveSessionEvaluation,
  composeMergedSpeakingReportV1,
} from './speakLiveMergedSpeakingReportComposer'

function baseTurn(partial: Partial<TurnEvaluation> & Pick<TurnEvaluation, 'turnId' | 'turnIndex'>): TurnEvaluation {
  const scenarioGoalFit = partial.scenarioGoalFit ?? {
    summary: '',
    alignmentScore: 80,
    relevantGoals: [],
  }
  const languageScores = partial.languageScores ?? {
    naturalness: 78,
    contextualFit: 82,
    registerFit: 76,
    grammaticalStability: 74,
  }
  const audioScores = partial.audioScores ?? {
    pronunciation: 70,
    fluency: 72,
    rhythm: 68,
    completeness: 90,
    clarity: 75,
  }
  return {
    learnerTranscript: partial.learnerTranscript ?? 'Hallo',
    transcriptNormalized: partial.transcriptNormalized ?? 'hallo',
    originalAudioUrl: partial.originalAudioUrl ?? 'blob:x',
    transcriptConfidence: partial.transcriptConfidence ?? 'high',
    scenarioGoalTags: partial.scenarioGoalTags ?? [],
    scenarioGoalFit,
    transcriptCoaching: partial.transcriptCoaching ?? {
      meaningClarityScore: 80,
      grammarScore: 76,
      naturalnessScore: 78,
      levelFitScore: 80,
      issues: [],
      strengths: [],
      rewriteOptions: {
        safeForLevel: null,
        moreNatural: null,
        stretch: null,
      },
      patternToReuse: null,
      explanations: [],
      evidenceLines: [],
    },
    audioCoaching: partial.audioCoaching ?? null,
    naturalRewrite: partial.naturalRewrite ?? null,
    savedWordCandidates: partial.savedWordCandidates ?? [],
    recommendedDrills: partial.recommendedDrills ?? [],
    dimensions: partial.dimensions ?? [],
    signalSources: partial.signalSources ?? {
      audioMetrics: 'azure_audio',
      languageCoach: 'llm',
      scenarioContext: 'deterministic',
    },
    feedbackItems: partial.feedbackItems ?? [],
    pronunciationIssues: partial.pronunciationIssues ?? [],
    fluencyIssues: partial.fluencyIssues ?? [],
    referenceSentence: partial.referenceSentence ?? '',
    referenceSentenceReason: partial.referenceSentenceReason ?? '',
    referenceKind: partial.referenceKind ?? 'more_natural_dutch',
    referenceAudioUrl: partial.referenceAudioUrl ?? null,
    learnerAudioUrl: partial.learnerAudioUrl ?? null,
    quickLabels: partial.quickLabels ?? {
      pronunciation: '',
      rhythm: '',
      naturalness: '',
    },
    audioFindings: partial.audioFindings ?? [],
    keyStrengths: partial.keyStrengths ?? ['Warm tone'],
    keyProblems: partial.keyProblems ?? [],
    focusWords: partial.focusWords ?? [],
    dutchLikenessNarrative: partial.dutchLikenessNarrative ?? '',
    chunkingRhythmSuggestion: partial.chunkingRhythmSuggestion ?? '',
    voiceAnalysisUnavailableMessage: partial.voiceAnalysisUnavailableMessage ?? null,
    improvementActions: partial.improvementActions ?? [],
    assistantContext: partial.assistantContext ?? null,
    audioScores,
    languageScores,
    combinedScores: partial.combinedScores ?? {
      overallTurnScore: 75,
      clarityScore: 74,
      dutchLikenessScore: 72,
    },
    ...partial,
  } as TurnEvaluation
}

const azSample: SpeakLiveAzureSpeechTurnEvaluationV1 = {
  version: 1,
  turnId: 't1',
  transcriptReference: 'Hallo',
  audioBlobPath: 'p/a.wav',
  pronunciation: 82,
  fluency: 79,
  completeness: 95,
  prosody: 70,
  pacing: 77,
  pacingDetail: {
    rhythmScore: 74,
    paceProfile: 'steady',
    pauseCount: 2,
    avgPauseMs: 120,
    longestPauseMs: 200,
    rushedEnding: false,
    speakingDurationMs: 800,
    totalDurationMs: 1000,
  },
  hesitationCount: 1,
  speakingRate: 3.2,
  weakWords: ['graag'],
  phonemeIssues: [{ word: 'graag', phoneme: 'r', accuracyScore: 55, errorType: 'Mispronunciation' }],
  omittedWords: [],
  insertedWords: [],
  wordTimings: [],
  assessedAt: '2026-01-01T00:00:00.000Z',
  provider: 'azure',
}

describe('speakLiveMergedSpeakingReportComposer', () => {
  it('MERGED_OVERALL_SCORE_WEIGHTS sums to 1', () => {
    const w = MERGED_OVERALL_SCORE_WEIGHTS
    const sum = w.pronunciation + w.fluency + w.conversation + w.vocabulary + w.grammar + w.pacing + w.scenarioSuccess
    expect(sum).toBeCloseTo(1, 5)
  })

  it('composeMergedSpeakingReportV1 produces a schema-valid payload with blended overall', () => {
    const ev = {
      turnEvaluations: [
        baseTurn({
          turnId: 't1',
          turnIndex: 0,
          azureSpeechEvaluation: azSample,
          languageEvaluation: {
            grammarScore: 80,
            sentenceConstructionScore: 78,
            naturalnessScore: 79,
            levelFitScore: 80,
            whatWorked: [],
            grammarIssues: ['article', 'article'],
            sentenceStructureIssues: [],
            improvedVersion: '',
            whyItIsBetter: '',
            levelBasedComment: '',
            nextStepBeyondLevel: '',
          },
        }),
      ],
      overallScores: {
        overallVoiceScore: 74,
        pronunciationScore: 80,
        fluencyScore: 78,
        rhythmScore: 72,
        clarityScore: 76,
        naturalnessScore: 77,
        scenarioCompletionScore: 85,
        confidenceEstimate: 80,
      },
      sessionInsights: {
        overallGrammarSentenceScore: 78,
        overallNaturalness: 77,
        strongestAreas: ['Clear greetings', 'Clear greetings'],
        weakestAreas: ['Articles', 'Articles'],
        mostImportantNextStep: 'Drill articles',
      },
      scenarioOutcome: {
        goalsCompleted: ['g1'],
        goalsMissed: [],
        whatWentWell: ['You sounded friendly'],
        whatToImproveNext: [],
      },
      overallSummary: {
        coachSummary: '',
        fluencyRhythmSummary: '',
        pronunciationSummary: '',
        whatToTryNext: ['Shadow 2 polite lines', 'Shadow 2 polite lines'],
      },
      recommendedFollowUps: [
        { type: 'scenario_follow_up', title: 'Café — order flow', reason: 'Practice', linkedScenarioIdOptional: 'cafe' },
      ],
    } as unknown as LiveSessionEvaluation

    const merged = composeMergedSpeakingReportV1(ev)
    const parsed = MergedSpeakingReportV1Schema.safeParse(merged)
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues.slice(0, 8))).toBe(true)
    expect(merged.mergedScores.overall).toBeGreaterThanOrEqual(0)
    expect(merged.mergedScores.overall).toBeLessThanOrEqual(100)
    expect(merged.insights.strengths.length).toBeGreaterThan(0)
    expect(merged.insights.weakWords).toContain('graag')
    expect(merged.insights.recurringGrammarIssues.some((x) => x.toLowerCase().includes('article'))).toBe(true)
  })

  it('applyMergedSpeakingReportToLiveSessionEvaluation attaches mergedSpeakingReportV1 and extends overallScores', () => {
    const ev = {
      turnEvaluations: [baseTurn({ turnId: 't1', turnIndex: 0, azureSpeechEvaluation: azSample })],
      overallScores: {
        overallVoiceScore: 70,
        pronunciationScore: 72,
        fluencyScore: 71,
        rhythmScore: 69,
        clarityScore: 73,
        naturalnessScore: 74,
        scenarioCompletionScore: 80,
        confidenceEstimate: 75,
      },
      sessionInsights: {
        overallGrammarSentenceScore: 76,
        overallNaturalness: 74,
        strongestAreas: [],
        weakestAreas: [],
        mostImportantNextStep: '',
      },
      scenarioOutcome: { goalsCompleted: [], goalsMissed: [], whatWentWell: [], whatToImproveNext: [] },
      overallSummary: {
        coachSummary: '',
        fluencyRhythmSummary: '',
        pronunciationSummary: '',
        whatToTryNext: [],
      },
      recommendedFollowUps: [],
    } as unknown as LiveSessionEvaluation

    applyMergedSpeakingReportToLiveSessionEvaluation(ev)
    expect(ev.mergedSpeakingReportV1?.version).toBe(1)
    expect(typeof ev.overallScores.conversationScore).toBe('number')
    expect(typeof ev.overallScores.pacingScore).toBe('number')
  })
})
