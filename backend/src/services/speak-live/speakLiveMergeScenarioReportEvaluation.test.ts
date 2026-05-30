import { describe, expect, it } from 'vitest'
import type { LiveSessionEvaluation, TurnEvaluation } from './liveVoiceEvaluationTypes'
import type { ScenarioDialogueStructuredOutput } from './speakLiveScenarioDialogueStructured.schema'
import type { PostSessionSpeechTurnResult } from './speakLivePostSessionSpeechAssessment'
import type { AssessUserTurnsSpeechBatchResult } from './speakLiveAssessUserTurnsSpeechBatch'
import { buildUserTurnSpeechMetricsFromResult } from './speakLiveAssessUserTurnsSpeechBatch'
import { applyMergedSpeakingReportToLiveSessionEvaluation } from './speakLiveMergedSpeakingReportComposer'
import type { SpeakLiveAzureSpeechTurnEvaluationV1 } from './speakLiveAzureSpeechEvaluationArtifact.schema'
import type { NormalizedSpeakLiveSession } from './speakLiveNormalizedConversation'
import {
  mergeScenarioReportEvaluation,
} from './speakLiveMergeScenarioReportEvaluation'
import { SCENARIO_REPORT_SCORE_FORMULA_VERSION } from './liveVoiceEvaluationTypes'

const azSample: SpeakLiveAzureSpeechTurnEvaluationV1 = {
  version: 1,
  turnId: 't1',
  transcriptReference: 'Hallo',
  audioBlobPath: 'p/a.wav',
  pronunciation: 80,
  fluency: 80,
  completeness: 90,
  prosody: 70,
  pacing: 75,
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
  weakWords: [],
  phonemeIssues: [],
  omittedWords: [],
  insertedWords: [],
  wordTimings: [],
  assessedAt: '2026-01-01T00:00:00.000Z',
  provider: 'azure',
}

function baseTurn(partial: Partial<TurnEvaluation> & Pick<TurnEvaluation, 'turnId' | 'turnIndex'>): TurnEvaluation {
  const scenarioGoalFit = partial.scenarioGoalFit ?? {
    summary: '',
    alignmentScore: 78,
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
      rewriteOptions: { safeForLevel: null, moreNatural: null, stretch: null },
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
    quickLabels: partial.quickLabels ?? { pronunciation: '', rhythm: '', naturalness: '' },
    audioFindings: partial.audioFindings ?? [],
    keyStrengths: partial.keyStrengths ?? [],
    keyProblems: partial.keyProblems ?? [],
    focusWords: partial.focusWords ?? [],
    dutchLikenessNarrative: partial.dutchLikenessNarrative ?? '',
    chunkingRhythmSuggestion: partial.chunkingRhythmSuggestion ?? '',
    voiceAnalysisUnavailableMessage: partial.voiceAnalysisUnavailableMessage ?? null,
    improvementActions: partial.improvementActions ?? [],
    assistantContext: partial.assistantContext ?? null,
    audioScores,
    languageScores,
    combinedScores: partial.combinedScores ?? { overallTurnScore: 75, clarityScore: 74, dutchLikenessScore: 72 },
    ...partial,
  } as TurnEvaluation
}

function minimalSessionEval(turn: TurnEvaluation): LiveSessionEvaluation {
  return {
    sessionId: 'thr',
    scenarioId: 'slug',
    scenarioName: 'Scenario',
    scenarioTitle: 'Scenario',
    mode: 'live_voice',
    targetLevel: 'A2',
    learnerLevel: 'A2',
    startedAt: '2026-01-01T00:00:00.000Z',
    endedAt: '2026-01-01T00:01:00.000Z',
    sessionDurationSeconds: 60,
    durationSec: 60,
    learnerTurnCount: 1,
    turnsCompleted: 1,
    evidenceSummary: {
      transcriptAvailable: true,
      audioTurnCount: 1,
      transcriptTurnCount: 1,
      azurePronunciationTurnCount: 1,
      llmLanguageTurnCount: 1,
      referenceAudioTurnCount: 0,
      totalLearnerTurnCount: 1,
    },
    keyTakeaway: { message: 'ok', evidenceType: 'mixed' },
    taskOutcome: {
      goals: ['g1'],
      completed: [],
      missed: [],
      goalEvidence: [],
      goalChecklistPercent: 50,
      weightedCompletion: 50,
    },
    overall: { dimensions: [], overallScore: 50, overallConfidence: 'high' },
    recommendedActions: [],
    sessionAudioMetricsAvailable: true,
    overallScores: {
      overallVoiceScore: 50,
      pronunciationScore: 70,
      fluencyScore: 70,
      rhythmScore: 70,
      clarityScore: 70,
      naturalnessScore: 70,
      scenarioCompletionScore: 70,
      confidenceEstimate: 70,
    },
    overallSummary: {
      coachSummary: '',
      fluencyRhythmSummary: '',
      pronunciationSummary: '',
      whatToTryNext: [],
    },
    scenarioOutcome: { goalsCompleted: [], goalsMissed: [], whatWentWell: [], whatToImproveNext: [] },
    turnEvaluations: [turn],
    recommendedFollowUps: [],
    status: 'complete',
    generatedAt: '2026-01-01T00:00:00.000Z',
    generationDiagnostics: {
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:00.000Z',
      totalMs: 1,
      parallelOrchestrationV1: {
        pipelineVersion: 1,
        orchestrationMode: 'parallel',
        modelName: 'test',
        transcriptTurnCount: 2,
        userTurnCount: 1,
        assistantTurnCount: 1,
        promptCharCount: 100,
        approximateInputTokens: 25,
        approximateOutputTokens: 25,
        structuredLlmMs: 1,
        llmValidationMs: 0,
        llmRepairMs: 0,
        llmRepairAttempted: false,
        llmValidationErrorsCount: 0,
        azureBatchMs: 1,
        azurePerTurnTimings: [],
        referenceTtsMs: 10,
        referenceTtsRequestedCount: 2,
        referenceTtsCacheHits: 1,
        referenceTtsCacheMisses: 0,
        referenceTtsGeneratedCount: 1,
        parallelWaitMs: 1,
        failedSubtasks: [],
        fallbackUsed: false,
        warnings: [],
        transcriptEvalUsedParallelAudioContext: true,
      },
    },
  } as LiveSessionEvaluation
}

const normalized: NormalizedSpeakLiveSession = {
  scenario: { scenarioId: 'id', slug: 'slug', title: 'T', goals: ['g1'] },
  level: { learnerLevel: 'A2' },
  session: { threadId: 'thr' },
  turns: [{ id: 't1', speaker: 'user', text: 'Hoi' }],
  userTurns: [{ id: 't1', speaker: 'user', text: 'Hoi' }],
}

function structuredFixture(): ScenarioDialogueStructuredOutput {
  return {
    overall: {
      summary: 's',
      scenarioOutcomeScore: 70,
      taskCompletionScore: 72,
      languageScore: 75,
      conversationFlowScore: 74,
      grammarScore: 76,
      vocabularyScore: 77,
      naturalnessScore: 78,
      estimatedLevel: 'A2',
      confidence: 80,
      primaryFocus: {
        title: 'Noun gender',
        why: 'Het vs de.',
        pattern: 'de/het',
        example: 'Het brood.',
      },
    },
    goals: [
      {
        goalId: 'g1',
        title: 'Order',
        weight: 0.7,
        status: 'completed',
        score: 80,
        evidenceTurnIds: [],
        evidenceQuote: '',
        tryNext: '',
      },
      {
        goalId: 'g2',
        title: 'Pay',
        weight: 0.3,
        status: 'partially_completed',
        score: 60,
        evidenceTurnIds: [],
        evidenceQuote: '',
        tryNext: '',
      },
    ],
    turns: [
      {
        turnId: 't1',
        languageScores: {
          grammar: 70,
          vocabulary: 72,
          sentenceStructure: 74,
          naturalness: 76,
          taskRelevance: 78,
        },
        mainFix: 'Pick het for brood.',
        whatLanded: [],
        tightenNext: [],
        correctedLine: 'Het brood graag.',
        strongerNaturalLine: '',
        weakPatterns: ['brood'],
        saveablePhrase: null,
        practiceNext: 'Gender drill',
      },
    ],
    recommendations: {
      nextDrillTitle: 'Drill',
      nextDrillReason: 'Because',
      suggestedScenarioId: null,
      suggestedPracticeType: 'sentence_drill',
    },
  }
}

function buildBatchForTurn(turnEval: TurnEvaluation, assessmentOk: boolean): AssessUserTurnsSpeechBatchResult {
  const turnResult: PostSessionSpeechTurnResult = {
    llmFact: {
      turnId: turnEval.turnId,
      turnIndex: turnEval.turnIndex,
      learnerTranscript: turnEval.learnerTranscript,
      learnerTranscriptNormalized: turnEval.transcriptNormalized,
      assistantReply: '',
      hasLearnerAudio: true,
      sessionGoals: [],
      azureSummary: null,
    },
    turnEval,
    weakWordList: [],
    audioCtx: null,
    turnTiming: {
      turnId: turnEval.turnId,
      turnIndex: turnEval.turnIndex,
      totalMs: 1,
      blobDownloadMs: 0,
      audioAssessmentMs: 1,
      timingAnalysisMs: 0,
      blobBytes: 100,
      hadAudio: true,
      assessmentOk,
      assessmentSource: 'live',
      providerRequestMs: 1,
    },
  }
  return {
    turnResults: [turnResult],
    perTurnMetrics: [buildUserTurnSpeechMetricsFromResult(turnResult)],
    batch: {
      azureBatchMs: 2,
      assessedTurnCount: assessmentOk ? 1 : 0,
      skippedTurnCount: 0,
      failedTurnCount: assessmentOk ? 0 : 1,
      concurrencyLimit: 4,
      azureMode: 'live',
      providerRequestMs: 1,
    },
  }
}

describe('mergeScenarioReportEvaluation', () => {
  it('full merge: deterministic headline, goal-weighted scenario, diagnostics + merged report', () => {
    const turn = baseTurn({ turnId: 't1', turnIndex: 0, azureSpeechEvaluation: azSample })
    const ev = minimalSessionEval(turn)
    applyMergedSpeakingReportToLiveSessionEvaluation(ev)
    const structured = structuredFixture()

    const { scoringDiagnostics } = mergeScenarioReportEvaluation({
      normalizedSession: normalized,
      evaluation: ev,
      structuredDialogue: structured,
      azureBatch: buildBatchForTurn(turn, true),
      referenceTts: { ms: 10, cacheHits: 1, cacheMisses: 0 },
      scenarioMetadata: { slug: 'slug', title: 'T', goals: ['g1'] },
    })

    expect(Math.round((80 * 0.7 + 60 * 0.3) / 1)).toBe(74)
    expect(scoringDiagnostics.scoreFormulaVersion).toBe(SCENARIO_REPORT_SCORE_FORMULA_VERSION)
    expect(scoringDiagnostics.componentScores.scenarioTask).toBe(74)
    expect(scoringDiagnostics.scenarioWeight).toBe(0.35)
    expect(scoringDiagnostics.languageWeight).toBe(0.35)
    expect(scoringDiagnostics.speechWeight).toBe(0.3)
    expect(scoringDiagnostics.fallbackWeightsUsed).toBe(false)
    expect(scoringDiagnostics.speechQualityStatus).toBe('available')
    expect(scoringDiagnostics.componentScores.speechQuality).not.toBeNull()
    expect(scoringDiagnostics.finalOverallScore).toBe(ev.overall.overallScore)
    expect(ev.overallScores.overallVoiceScore).toBe(scoringDiagnostics.finalOverallScore)
    expect(ev.mergedSpeakingReportV1?.mergedScores.overall).toBe(scoringDiagnostics.finalOverallScore)
    expect(ev.mergedSpeakingReportV1?.mergedScores.scenarioSuccess).toBe(74)
    expect(ev.taskOutcome.weightedCompletion).toBe(74)
    expect(ev.focusArea?.label).toBe('Noun gender')
    expect(ev.turnEvaluations[0]!.combinedScores.overallTurnScore).toBe(scoringDiagnostics.perTurnMergedScores[0]!.turnOverall)
    expect(scoringDiagnostics.perTurnMergedScores[0]!.mainFix.includes('het')).toBe(true)
  })

  it('missing Azure: 45/55 weights, speech unavailable warning', () => {
    const turn = baseTurn({ turnId: 't1', turnIndex: 0 })
    const ev = minimalSessionEval(turn)
    applyMergedSpeakingReportToLiveSessionEvaluation(ev)
    const structured = structuredFixture()
    const scenarioTask = 74
    const sentenceAvg = 74
    const langSession = Math.round(
      0.25 * structured.overall.grammarScore +
        0.2 * structured.overall.vocabularyScore +
        0.2 * sentenceAvg +
        0.2 * structured.overall.naturalnessScore +
        0.15 * structured.overall.conversationFlowScore,
    )
    const expectedFinal = Math.round(0.45 * scenarioTask + 0.55 * langSession)

    const { scoringDiagnostics } = mergeScenarioReportEvaluation({
      normalizedSession: normalized,
      evaluation: ev,
      structuredDialogue: structured,
      azureBatch: buildBatchForTurn(turn, false),
      referenceTts: { ms: 0, cacheHits: 0, cacheMisses: 0 },
    })

    expect(scoringDiagnostics.fallbackWeightsUsed).toBe(true)
    expect(scoringDiagnostics.speechWeight).toBe(0)
    expect(scoringDiagnostics.scenarioWeight).toBe(0.45)
    expect(scoringDiagnostics.languageWeight).toBe(0.55)
    expect(scoringDiagnostics.speechQualityStatus).toBe('unavailable')
    expect(scoringDiagnostics.componentScores.speechQuality).toBeNull()
    expect(scoringDiagnostics.diagnosticWarnings.some((w) => w.includes('45% scenario'))).toBe(true)
    expect(scoringDiagnostics.finalOverallScore).toBe(expectedFinal)
    expect(ev.overall.overallScore).toBe(expectedFinal)
  })

  it('missing structured turn row: records missing component + fallback language from turn eval', () => {
    const turn = baseTurn({ turnId: 't-missing', turnIndex: 0, azureSpeechEvaluation: azSample })
    const ev = minimalSessionEval(turn)
    applyMergedSpeakingReportToLiveSessionEvaluation(ev)
    const s = structuredFixture()
    const structuredNoTurn: ScenarioDialogueStructuredOutput = { ...s, turns: [] }

    const { scoringDiagnostics } = mergeScenarioReportEvaluation({
      normalizedSession: normalized,
      evaluation: ev,
      structuredDialogue: structuredNoTurn,
      azureBatch: buildBatchForTurn(turn, true),
      referenceTts: { ms: 0, cacheHits: 0, cacheMisses: 0 },
    })

    expect(scoringDiagnostics.missingComponents.some((x) => x.startsWith('structured_turn:'))).toBe(true)
    expect(scoringDiagnostics.perTurnMergedScores[0]!.languageQualityTurn).toBeGreaterThan(0)
  })

  it('score bounds: clamps aggregates to 0–100', () => {
    const turn = baseTurn({
      turnId: 't1',
      turnIndex: 0,
      azureSpeechEvaluation: { ...azSample, pronunciation: 500, fluency: -10 },
    })
    const ev = minimalSessionEval(turn)
    applyMergedSpeakingReportToLiveSessionEvaluation(ev)
    const wild: ScenarioDialogueStructuredOutput = {
      ...structuredFixture(),
      overall: {
        ...structuredFixture().overall,
        grammarScore: 999,
        vocabularyScore: -50,
        naturalnessScore: 200,
        conversationFlowScore: 300,
      },
    }
    const { scoringDiagnostics } = mergeScenarioReportEvaluation({
      normalizedSession: normalized,
      evaluation: ev,
      structuredDialogue: wild,
      azureBatch: buildBatchForTurn(turn, true),
      referenceTts: { ms: 0, cacheHits: 0, cacheMisses: 0 },
    })
    expect(scoringDiagnostics.finalOverallScore).toBeGreaterThanOrEqual(0)
    expect(scoringDiagnostics.finalOverallScore).toBeLessThanOrEqual(100)
    for (const p of scoringDiagnostics.perTurnMergedScores) {
      expect(p.turnOverall).toBeGreaterThanOrEqual(0)
      expect(p.turnOverall).toBeLessThanOrEqual(100)
    }
  })

  it('deterministic reproducibility for identical inputs', () => {
    const diag = () => {
      const turn = baseTurn({ turnId: 't1', turnIndex: 0, azureSpeechEvaluation: azSample })
      const ev = minimalSessionEval(turn)
      applyMergedSpeakingReportToLiveSessionEvaluation(ev)
      mergeScenarioReportEvaluation({
        normalizedSession: normalized,
        evaluation: ev,
        structuredDialogue: structuredFixture(),
        azureBatch: buildBatchForTurn(baseTurn({ turnId: 't1', turnIndex: 0, azureSpeechEvaluation: azSample }), true),
        referenceTts: { ms: 5, cacheHits: 2, cacheMisses: 1 },
      })
      return JSON.stringify(ev.scenarioReportScoringDiagnosticsV1)
    }
    expect(diag()).toBe(diag())
  })

  it('scenario goal weighting matches weighted average of goal scores', () => {
    const turn = baseTurn({ turnId: 't1', turnIndex: 0, azureSpeechEvaluation: azSample })
    const ev = minimalSessionEval(turn)
    applyMergedSpeakingReportToLiveSessionEvaluation(ev)
    const structured: ScenarioDialogueStructuredOutput = {
      ...structuredFixture(),
      goals: [
        {
          goalId: 'a',
          title: 'A',
          weight: 0.25,
          status: 'completed',
          score: 100,
          evidenceTurnIds: [],
          evidenceQuote: '',
          tryNext: '',
        },
        {
          goalId: 'b',
          title: 'B',
          weight: 0.75,
          status: 'missed',
          score: 0,
          evidenceTurnIds: [],
          evidenceQuote: '',
          tryNext: '',
        },
      ],
    }
    const weighted = Math.round((100 * 0.25 + 0 * 0.75) / 1)
    expect(weighted).toBe(25)

    const { scoringDiagnostics } = mergeScenarioReportEvaluation({
      normalizedSession: normalized,
      evaluation: ev,
      structuredDialogue: structured,
      azureBatch: buildBatchForTurn(turn, true),
      referenceTts: { ms: 0, cacheHits: 0, cacheMisses: 0 },
    })
    expect(scoringDiagnostics.componentScores.scenarioTask).toBe(25)
  })
})
