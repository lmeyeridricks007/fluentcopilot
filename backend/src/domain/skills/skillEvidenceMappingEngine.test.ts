import { describe, expect, it } from 'vitest'
import type { ConversationSummary, FeedbackItem } from '../../models/contracts'
import type { LiveSessionEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import type { ReadAloudEvaluateResult } from '../../services/read-aloud/readAloudEvaluateTypes'
import { atomsToSkillEvidence } from './skillEvidenceAtomAdapters'
import { extractSkillEvidenceFromChatReport } from './extractors/extractSkillEvidenceFromChatReport'
import { extractSkillEvidenceFromCoachReport } from './extractors/extractSkillEvidenceFromCoachReport'
import { extractSkillEvidenceFromReadAloudReport } from './extractors/extractSkillEvidenceFromReadAloudReport'
import { extractSkillEvidenceFromScenarioReport } from './extractors/extractSkillEvidenceFromScenarioReport'

const at = '2026-04-21T12:00:00.000Z'

function minimalLiveEval(overrides: Partial<LiveSessionEvaluation> = {}): LiveSessionEvaluation {
  return {
    sessionId: 't1',
    scenarioId: 'storytelling',
    scenarioName: 'Story',
    scenarioTitle: 'Story',
    mode: 'live_voice',
    targetLevel: 'A2',
    learnerLevel: 'A2',
    startedAt: at,
    endedAt: at,
    sessionDurationSeconds: 60,
    durationSec: 60,
    learnerTurnCount: 2,
    turnsCompleted: 2,
    evidenceSummary: {
      transcriptAvailable: true,
      audioTurnCount: 1,
      transcriptTurnCount: 2,
      azurePronunciationTurnCount: 1,
      llmLanguageTurnCount: 2,
      referenceAudioTurnCount: 0,
      totalLearnerTurnCount: 2,
    },
    keyTakeaway: { message: 'ok', evidenceType: 'mixed' },
    taskOutcome: {
      goals: [],
      completed: [],
      missed: [],
      goalEvidence: [],
      weightedCompletion: 50,
    },
    overall: {
      dimensions: [
        {
          id: 'pronunciation',
          label: 'Pronunciation',
          score: 52,
          confidence: 'high',
          evidenceType: 'audio',
          verdict: 'weak',
          meaning: 'x',
        },
      ],
      overallScore: 55,
      overallConfidence: 'medium',
    },
    turnEvaluations: [],
    recommendedActions: [],
    sessionAudioMetricsAvailable: true,
    overallScores: {
      overallVoiceScore: 60,
      pronunciationScore: 50,
      fluencyScore: 58,
      rhythmScore: 55,
      clarityScore: 62,
      naturalnessScore: 54,
      scenarioCompletionScore: 70,
      confidenceEstimate: 0.6,
    },
    overallSummary: {
      coachSummary: '',
      fluencyRhythmSummary: '',
      pronunciationSummary: '',
      whatToTryNext: ['Try smoother follow-up questions after each answer'],
      grammarConstructionSessionSummary: 'Verb endings were shaky in past tense.',
    },
    scenarioOutcome: {
      goalsCompleted: [],
      goalsMissed: [],
      whatWentWell: ['You kept the story moving'],
      whatToImproveNext: ['Add more sensory detail'],
    },
    sessionInsights: {
      overallGrammarSentenceScore: 60,
      overallNaturalness: 58,
      strongestAreas: ['flow'],
      weakestAreas: ['follow-up questions'],
      mostImportantNextStep: 'Practice follow-ups',
    },
    recommendedFollowUps: [],
    generatedAt: at,
    status: 'complete',
    ...overrides,
  } as LiveSessionEvaluation
}

describe('skill evidence mapping engine', () => {
  it('maps scenario dimensions and summaries to atoms', () => {
    const atoms = extractSkillEvidenceFromScenarioReport({
      userId: 'u1',
      sessionId: 't1',
      createdAt: at,
      evaluation: minimalLiveEval(),
    })
    expect(atoms.some((a) => a.skillId === 'pronunciation' && a.evidenceType === 'live_dimension')).toBe(true)
    expect(atoms.some((a) => a.skillId === 'follow_up_questions')).toBe(true)
    const legacy = atomsToSkillEvidence(atoms, 1)
    expect(legacy.length).toBeGreaterThan(0)
    expect(legacy.every((e) => e.source.startsWith('report_atom:'))).toBe(true)
  })

  it('maps language coach debrief when present', () => {
    const evaluation = minimalLiveEval({
      languageCoachDebrief: {
        conversationSummary: 'Casual Dutch chat; coach nudged grammar once.',
        focusAreaLabel: 'Follow-up depth',
        improvedPhrasingExamples: [],
        savePracticePrompts: [],
        weakPatterns: ['You answered briefly without doorvragen'],
        strengths: ['Natural reactions'],
        followUpSuggestions: ['Ask one extra clarifying question next time'],
        nudgeSessionLog: [
          {
            nudgeType: 'grammar',
            learnerOriginal: 'Ik ga gisteren',
            coachResponseSnippet: '…',
            detectedIssueTypes: ['grammar_past_tense'],
            severity: 'medium',
            learnerRecoveredLater: false,
          },
        ],
      },
    })
    const atoms = extractSkillEvidenceFromCoachReport({
      userId: 'u1',
      sessionId: 't1',
      createdAt: at,
      evaluation,
    })
    expect(atoms.length).toBeGreaterThan(0)
    expect(atoms.some((a) => a.evidenceType === 'coach_nudge_log')).toBe(true)
  })

  it('maps chat summary + feedback to atoms', () => {
    const summary: ConversationSummary = {
      threadId: 't1',
      whatWentWell: ['Good vocabulary range'],
      whatToImprove: ['Sentence structure in subclauses'],
      correctedPhrases: [],
      suggestedNextAction: 'Drill word order',
      saveWordCandidates: [],
    }
    const feedback: FeedbackItem[] = [
      {
        id: 'f1',
        threadId: 't1',
        linkedMessageId: 'm1',
        category: 'grammar',
        originalText: 'a',
        correctedText: 'b',
        explanation: 'Word order',
        severity: 'high',
        createdAt: at,
      },
    ]
    const atoms = extractSkillEvidenceFromChatReport({
      userId: 'u1',
      sessionId: 't1',
      createdAt: at,
      summary,
      feedback,
    })
    expect(atoms.some((a) => a.sessionType === 'text_conversation')).toBe(true)
    expect(atoms.some((a) => a.skillId === 'grammar')).toBe(true)
  })

  it('maps read-aloud dimensions and pause ratio', () => {
    const result = {
      reportKind: 'read_aloud',
      targetText: 'x',
      recognizedText: 'x',
      pronunciationAssessment: null,
      pronunciationApi: { summaryFeedback: null, recommendedNextStep: null, caveats: [] },
      dimensions: {
        pronunciation: {
          supported: true,
          score: 48,
          score01: 0.48,
          label: 'Pronunciation',
          detail: null,
          evidence: '',
        },
        fluency: {
          supported: true,
          score: 70,
          score01: 0.7,
          label: 'Fluency',
          detail: null,
          evidence: '',
        },
        pacing: {
          supported: true,
          score: 72,
          score01: 0.72,
          label: 'Pacing',
          detail: null,
          evidence: '',
        },
        clarity: {
          supported: true,
          score: 74,
          score01: 0.74,
          label: 'Clarity',
          detail: null,
          evidence: '',
        },
        readingAccuracy: {
          supported: true,
          score: 76,
          score01: 0.76,
          label: 'Reading accuracy',
          detail: null,
          evidence: '',
        },
        expression: {
          supported: true,
          score: 71,
          score01: 0.71,
          label: 'Expression',
          detail: null,
          evidence: '',
        },
        levelFit: {
          supported: true,
          score: 69,
          score01: 0.69,
          label: 'Level fit',
          detail: null,
          evidence: '',
        },
      },
      sentences: [],
      weakWords: [],
      coaching: { summary: '', focusArea: '', nextStepDrills: [], feedbackLines: [] },
      nextActions: [],
      audioCoverage: { totalSec: 100, alignedSec: 80, deadSec: 5, deadImpactSec: 2, pauseLikeSec: 35, longUnmatchedSec: 0 },
    } as ReadAloudEvaluateResult
    const atoms = extractSkillEvidenceFromReadAloudReport({
      userId: 'u1',
      sessionId: 's1',
      createdAt: at,
      result,
    })
    expect(atoms.some((a) => a.skillId === 'pronunciation' && a.positiveOrNegative === 'negative')).toBe(true)
    expect(atoms.some((a) => a.evidenceType === 'read_aloud_pause_ratio')).toBe(true)
  })
})
