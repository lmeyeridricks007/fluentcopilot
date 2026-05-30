import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { LiveSessionEvaluation } from './liveVoiceEvaluationTypes'
import {
  buildStoredReportQa,
  runSecondPassReportQa,
  storedEvaluationNeedsRefreshFromJson,
} from './liveSessionEvaluationQa'

function makeEvaluation(overrides?: Partial<LiveSessionEvaluation>): LiveSessionEvaluation {
  return {
    sessionId: 'session-1',
    scenarioId: 'scenario-1',
    scenarioName: 'Train station',
    scenarioTitle: 'Train station',
    mode: 'live_voice',
    targetLevel: 'A2',
    learnerLevel: 'A2',
    startedAt: '2026-04-14T10:00:00.000Z',
    endedAt: '2026-04-14T10:03:00.000Z',
    sessionDurationSeconds: 180,
    durationSec: 180,
    learnerTurnCount: 1,
    turnsCompleted: 1,
    evidenceSummary: {
      transcriptAvailable: true,
      audioTurnCount: 1,
      transcriptTurnCount: 1,
      azurePronunciationTurnCount: 1,
      llmLanguageTurnCount: 1,
      referenceAudioTurnCount: 1,
      totalLearnerTurnCount: 1,
    },
    keyTakeaway: { message: 'Keep going', evidenceType: 'mixed' },
    taskOutcome: {
      goals: ['delay'],
      completed: ['delay'],
      missed: [],
      goalEvidence: [
        {
          goalId: 'delay',
          goalLabel: 'Ask if the train is on time',
          turnId: 'turn-1',
          turnIndex: 0,
          evidenceText: 'Is de trein naar Amsterdam op tijd?',
          status: 'completed',
          weight: 1,
          tier: 'core',
        },
      ],
      weightedCompletion: 100,
    },
    overall: {
      dimensions: [],
      overallScore: 72,
      overallConfidence: 'medium',
    },
    turnEvaluations: [
      {
        turnId: 'turn-1',
        turnIndex: 0,
        learnerTranscript: 'Is de trein naar Amsterdam op tijd?',
        transcriptNormalized: 'is de trein naar amsterdam op tijd',
        transcriptCoaching: {
          meaningClarityScore: 80,
          grammarScore: 80,
          naturalnessScore: 75,
          levelFitScore: 75,
          issues: [],
          strengths: [],
          rewriteOptions: { safeForLevel: null, moreNatural: null, stretch: null },
          patternToReuse: null,
          explanations: [],
          evidenceLines: [],
        },
        audioCoaching: null,
        naturalRewrite: {
          original: 'Is de trein naar Amsterdam op tijd?',
          improved: 'Is de trein naar Amsterdam op tijd?',
          whyMoreNatural: 'Direct and clear.',
        },
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
        referenceSentence: 'Is de trein naar Amsterdam op tijd?',
        referenceSentenceReason: 'Good scenario phrasing.',
        referenceKind: 'reference_pronunciation',
        referenceAudioUrl: null,
        learnerAudioUrl: null,
        quickLabels: { pronunciation: 'Good', rhythm: 'Good', naturalness: 'Good' },
        audioFindings: [],
        keyStrengths: [],
        keyProblems: [],
        focusWords: [],
        dutchLikenessNarrative: 'Solid.',
        chunkingRhythmSuggestion: '',
        voiceAnalysisUnavailableMessage: null,
        improvementActions: [],
        assistantContext: null,
        audioScores: {
          pronunciation: 75,
          fluency: 72,
          rhythm: 70,
          completeness: 90,
          clarity: 78,
        },
        languageScores: {
          naturalness: 75,
          contextualFit: 78,
          registerFit: 78,
          grammaticalStability: 80,
        },
        combinedScores: {
          overallTurnScore: 74,
          clarityScore: 78,
          dutchLikenessScore: 75,
        },
        originalAudioUrl: null,
        transcriptConfidence: 'medium',
        scenarioGoalTags: [],
        scenarioGoalFit: { summary: 'Fits the goal', alignmentScore: 80, relevantGoals: ['delay'] },
      } as LiveSessionEvaluation['turnEvaluations'][number],
    ],
    recommendedActions: [],
    sessionAudioMetricsAvailable: true,
    overallScores: {
      overallVoiceScore: 72,
      pronunciationScore: 75,
      fluencyScore: 72,
      rhythmScore: 70,
      clarityScore: 78,
      naturalnessScore: 75,
      scenarioCompletionScore: 100,
      confidenceEstimate: 80,
    },
    overallSummary: {
      coachSummary: 'Solid.',
      fluencyRhythmSummary: 'Good.',
      pronunciationSummary: 'Good.',
      whatToTryNext: [],
    },
    scenarioOutcome: {} as LiveSessionEvaluation['scenarioOutcome'],
    recommendedFollowUps: [],
    generatedAt: '2026-04-14T10:03:00.000Z',
    status: 'complete',
    ...overrides,
  }
}

function speakLiveQaSourceDir(): string {
  const fromRepoRoot = join(process.cwd(), 'backend/src/services/speak-live/liveSessionEvaluationQa.ts')
  const fromBackendPkg = join(process.cwd(), 'src/services/speak-live/liveSessionEvaluationQa.ts')
  if (existsSync(fromRepoRoot)) return dirname(fromRepoRoot)
  if (existsSync(fromBackendPkg)) return dirname(fromBackendPkg)
  throw new Error('Could not resolve speak-live QA source directory for static checks.')
}

describe('runSecondPassReportQa', () => {
  it('does not invoke any LLM client in the QA module (deterministic only)', () => {
    const dir = speakLiveQaSourceDir()
    const qaSrc = readFileSync(join(dir, 'liveSessionEvaluationQa.ts'), 'utf8')
    const guardSrc = readFileSync(join(dir, 'liveSessionEvaluationQaFastGuards.ts'), 'utf8')
    const combined = `${qaSrc}\n${guardSrc}`
    expect(combined).not.toMatch(/openai|anthropic|ChatCompletion|responses\.create/i)
  })

  it('runs deterministic QA on a normal report in well under 500ms', () => {
    const evaluation = makeEvaluation()
    const t0 = Date.now()
    const result = runSecondPassReportQa(evaluation)
    const elapsed = Date.now() - t0
    expect(result.passed).toBe(true)
    expect(result.shouldRerun).toBe(false)
    expect(result.unresolvedIssues).toHaveLength(0)
    expect(elapsed).toBeLessThan(500)
  })

  it('flags missing core section and requests orchestrator rerun', () => {
    const evaluation = makeEvaluation({
      keyTakeaway: { message: '   ', evidenceType: 'mixed' },
    })
    const result = runSecondPassReportQa(evaluation, { allowFixes: false })
    expect(result.passed).toBe(false)
    expect(result.shouldRerun).toBe(true)
    expect(result.unresolvedIssues.some((i) => i.code === 'missing_core_section')).toBe(true)
    expect(result.qaRulesTriggered.some((r) => r.startsWith('issue:missing_core_section'))).toBe(true)
  })

  it('flags assistant-context turns that carry learner scores', () => {
    const base = makeEvaluation()
    const evaluation = makeEvaluation({
      turnEvaluations: [
        {
          ...base.turnEvaluations[0],
          learnerTranscript: '',
          assistantContext: 'Goedemiddag, waarmee kan ik u helpen vandaag?',
          combinedScores: { overallTurnScore: 70, clarityScore: 70, dutchLikenessScore: 70 },
        } as LiveSessionEvaluation['turnEvaluations'][number],
      ],
    })
    const result = runSecondPassReportQa(evaluation, { allowFixes: false })
    expect(result.warnIssues.some((i) => i.code === 'assistant_turn_scored')).toBe(true)
    expect(result.shouldRerun).toBe(false)
  })

  it('flags invalid bounded scores for orchestrator rerun', () => {
    const base = makeEvaluation()
    const evaluation = makeEvaluation({
      overallScores: {
        ...base.overallScores,
        grammarScore: Number.NaN,
      },
    })
    const result = runSecondPassReportQa(evaluation, { allowFixes: false })
    expect(result.passed).toBe(false)
    expect(result.shouldRerun).toBe(true)
    expect(result.unresolvedIssues.some((i) => i.code === 'score_out_of_range')).toBe(true)
  })

  it('warns when greeting-only evidence cannot be broadened but does not request rerun', () => {
    const evaluation = makeEvaluation({
      turnEvaluations: [
        {
          ...makeEvaluation().turnEvaluations[0],
          learnerTranscript: 'Goedemiddag.',
        } as LiveSessionEvaluation['turnEvaluations'][number],
      ],
      taskOutcome: {
        goals: ['platform'],
        completed: ['platform'],
        missed: [],
        goalEvidence: [
          {
            goalId: 'platform',
            goalLabel: 'Ask which platform',
            turnId: 'turn-1',
            turnIndex: 0,
            evidenceText: 'Goedemiddag.',
            status: 'completed',
            weight: 1,
            tier: 'core',
          },
        ],
        weightedCompletion: 100,
      },
    })

    const result = runSecondPassReportQa(evaluation)
    expect(result.shouldRerun).toBe(false)
    expect(result.passed).toBe(true)
    expect(result.warnIssues.some((issue) => issue.code === 'completed_goal_greeting_evidence')).toBe(true)
    expect(result.issues.some((issue) => issue.code === 'completed_goal_greeting_evidence')).toBe(true)
  })

  it('repairs stale train departure rewrites before publishing', () => {
    const evaluation = makeEvaluation({
      turnEvaluations: [
        {
          ...makeEvaluation().turnEvaluations[0],
          learnerTranscript: 'Wat is de tijd naar Rotterdam?',
          referenceSentence: 'Hoe laat vertrekt de trein naar Rotterdam?',
          naturalRewrite: {
            original: 'Wat is de tijd naar Rotterdam?',
            improved: 'Wat is de tijd naar Rotterdam?',
            whyMoreNatural: 'Old text',
          },
          languageEvaluation: {
            grammarScore: 70,
            sentenceConstructionScore: 70,
            naturalnessScore: 60,
            levelFitScore: 70,
            whatWorked: [],
            grammarIssues: [],
            sentenceStructureIssues: [],
            improvedVersion: 'Wat is de tijd naar Rotterdam?',
            whyItIsBetter: 'Old text',
            levelBasedComment: 'A2',
          },
          sentenceGroundedReview: {
            mainFix: 'Ask the departure time directly.',
            mainVoiceFix: 'Say the final word more clearly.',
            whatWorked: ['You asked about the train.'],
            whatToFix: ['Use a direct departure-time question.'],
            nativePhrase: 'Wat is de tijd naar Rotterdam?',
            whyBetter: 'Directer.',
            pattern: null,
          },
        } as LiveSessionEvaluation['turnEvaluations'][number],
      ],
    })

    const result = runSecondPassReportQa(evaluation)
    expect(result.passed).toBe(true)
    expect(result.fixesApplied.length).toBeGreaterThan(0)
    expect(evaluation.turnEvaluations[0].naturalRewrite?.improved).toBe('Hoe laat vertrekt de trein naar Rotterdam?')
    expect(evaluation.turnEvaluations[0].languageEvaluation?.improvedVersion).toBe('Hoe laat vertrekt de trein naar Rotterdam?')
    expect(evaluation.turnEvaluations[0].sentenceGroundedReview?.nativePhrase).toBe('Hoe laat vertrekt de trein naar Rotterdam?')
  })

  it('repairs mismatched reference word corrections instead of failing the report', () => {
    const evaluation = makeEvaluation({
      turnEvaluations: [
        {
          ...makeEvaluation().turnEvaluations[0],
          learnerTranscript: 'Ik ga naar Amsterdam.',
          referenceSentence: 'Waar vertrekt uw trein?',
          compareListenFor: ['Notice how the reference lands on “waar” — that is the Dutch target in this line.'],
          mainFixLine: 'Main fix: use “waar” instead of “naar”.',
          wrongWordDetections: [
            {
              observedToken: 'naar',
              classification: 'wrong_word_choice',
              suggestedCorrection: 'waar',
              whyItMatters: 'Bad reference',
              severity: 'high',
            },
          ],
        } as LiveSessionEvaluation['turnEvaluations'][number],
      ],
    })

    const result = runSecondPassReportQa(evaluation)
    expect(result.passed).toBe(true)
    expect(result.shouldRerun).toBe(false)
    expect(result.fixesApplied).toContain('Removed mismatched word correction for turn 1')
    expect(result.issues.some((issue) => issue.code === 'mismatched_reference_word_correction')).toBe(true)
    expect(result.unresolvedIssues).toEqual([])
    expect(evaluation.turnEvaluations[0].wrongWordDetections).toBeUndefined()
    expect(evaluation.turnEvaluations[0].compareListenFor).toBeUndefined()
    expect(evaluation.turnEvaluations[0].mainFixLine).not.toContain('instead of')
  })

  it('aligns a misleading word-swap main fix with the canonical Dutch line (Sounds more native)', () => {
    const canonical = 'Ik weet niet wie ik moet contacteren.'
    const evaluation = makeEvaluation({
      scenarioTitle: 'Work / colleague interaction',
      turnEvaluations: [
        {
          ...makeEvaluation().turnEvaluations[0],
          learnerTranscript: 'Ik weet niet voor wie om te contacteren.',
          referenceSentence: canonical,
          mainFixLine: 'Main fix: use “moet” instead of “voor”.',
          wrongWordDetections: [
            {
              observedToken: 'voor',
              classification: 'wrong_word_choice',
              suggestedCorrection: 'moet',
              whyItMatters: 'Misaligned token swap',
              severity: 'high',
            },
          ],
          naturalRewrite: {
            original: 'Ik weet niet voor wie om te contacteren.',
            improved: canonical,
            whyMoreNatural: 'Uses correct structure for asking who to contact.',
          },
          languageEvaluation: {
            grammarScore: 70,
            sentenceConstructionScore: 65,
            naturalnessScore: 60,
            levelFitScore: 70,
            whatWorked: [],
            grammarIssues: [],
            sentenceStructureIssues: [],
            improvedVersion: canonical,
            whyItIsBetter: 'Uses correct structure.',
            whyThisIsMoreNatural: 'Clearer in a work context.',
            learnerFacingGrammarLine: '',
            levelBasedComment: 'A2',
          },
          sentenceGroundedReview: {
            mainFix: 'Use moet instead of voor.',
            mainVoiceFix: 'Slow down slightly.',
            whatWorked: ['You reached out.'],
            whatToFix: ['Word choice'],
            nativePhrase: canonical,
            whyBetter: 'In werk collegainteractie, the correct word carries the key meaning.',
            pattern: null,
          },
        } as LiveSessionEvaluation['turnEvaluations'][number],
      ],
    })

    const result = runSecondPassReportQa(evaluation)
    expect(result.issues.some((issue) => issue.code === 'main_fix_word_swap_misaligned_with_canonical')).toBe(true)
    expect(result.fixesApplied.some((f) => /Aligned main fix with canonical Dutch line/i.test(f))).toBe(true)
    expect(evaluation.turnEvaluations[0].mainFixLine).toMatch(/use this phrasing/i)
    expect(evaluation.turnEvaluations[0].mainFixLine).toContain(canonical)
    expect(result.passed).toBe(true)
  })

  it('repairs train on-time questions that were rewritten as a different station goal', () => {
    const evaluation = makeEvaluation({
      turnEvaluations: [
        {
          ...makeEvaluation().turnEvaluations[0],
          learnerTranscript: 'Goedemiddag, is de trein naar Amsterdam op tijd?',
          referenceSentence: 'Waar vertrekt de trein naar Amsterdam?',
          referenceSentenceReason: 'Direct way to ask which platform the train leaves from.',
          naturalRewrite: {
            original: 'Goedemiddag, is de trein naar Amsterdam op tijd?',
            improved: 'Waar vertrekt de trein naar Amsterdam?',
            whyMoreNatural: 'This asks the departure question more directly.',
          },
          languageEvaluation: {
            grammarScore: 78,
            sentenceConstructionScore: 76,
            naturalnessScore: 72,
            levelFitScore: 78,
            whatWorked: ['You used a clear structure in your question.'],
            grammarIssues: [],
            sentenceStructureIssues: ['The question could be more direct.'],
            improvedVersion: 'Waar vertrekt de trein naar Amsterdam?',
            whyItIsBetter: 'This version is more direct and aligns with how a native speaker would ask about the train departure.',
            whyThisIsMoreNatural: 'This aligns with the departure goal.',
            learnerFacingGrammarLine: 'Ask the platform question directly.',
            levelBasedComment: 'A2',
          },
          sentenceGroundedReview: {
            mainFix: 'The question could be more direct.',
            mainVoiceFix: 'Let the final word land more clearly.',
            whatWorked: ['You used a clear structure in your question.'],
            whatToFix: ['The question could be more direct.'],
            nativePhrase: 'Waar vertrekt de trein naar Amsterdam?',
            whyBetter: 'This version asks where the train leaves from.',
            pattern: null,
          },
          mainFixLine: 'Main fix: the question could be more direct.',
          scenarioGoalFit: {
            summary: 'This line addresses the ask which platform the train leaves from goal.',
            alignmentScore: 66,
            relevantGoals: ['Ask which platform'],
          },
        } as LiveSessionEvaluation['turnEvaluations'][number],
      ],
    })

    const result = runSecondPassReportQa(evaluation)
    expect(result.passed).toBe(true)
    expect(result.shouldRerun).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'mismatched_train_status_rewrite')).toBe(true)
    expect(result.fixesApplied).toContain('Repaired mismatched train status rewrite for turn 1')
    expect(evaluation.turnEvaluations[0].referenceSentence).toBe('Goedemiddag, is de trein naar Amsterdam op tijd?')
    expect(evaluation.turnEvaluations[0].naturalRewrite?.improved).toBe('Goedemiddag, is de trein naar Amsterdam op tijd?')
    expect(evaluation.turnEvaluations[0].scenarioGoalFit.relevantGoals).toEqual(['Ask if the train is on time'])
    expect(evaluation.turnEvaluations[0].mainFixLine).toBe('Main fix: keep this wording — focus on pronunciation.')
    expect(evaluation.turnEvaluations[0].sentenceGroundedReview?.mainFix).toBe('Keep this wording; focus on cleaner sounds on the key words.')
    expect(evaluation.turnEvaluations[0].sentenceGroundedReview?.whyBetter).toBe('This question already works for asking if the train is on time.')
    expect(evaluation.turnEvaluations[0].sentenceGroundedReview?.whatToFix).toEqual([])
  })

  it('also repairs residual anti-bug copy on a valid train status question', () => {
    const evaluation = makeEvaluation({
      turnEvaluations: [
        {
          ...makeEvaluation().turnEvaluations[0],
          learnerTranscript: 'Goedemiddag, is de trein naar Amsterdam op tijd?',
          referenceSentence: 'Goedemiddag, is de trein naar Amsterdam op tijd?',
          referenceSentenceReason: 'This line already asks whether the train is on time clearly for the station scenario.',
          naturalRewrite: {
            original: 'Goedemiddag, is de trein naar Amsterdam op tijd?',
            improved: 'Goedemiddag, is de trein naar Amsterdam op tijd?',
            whyMoreNatural: 'This line already asks whether the train is on time. Keep that meaning; do not switch it into a platform or departure question.',
          },
          sentenceGroundedReview: {
            mainFix: 'Keep the on-time question; the next gain is delivery, not a different station question.',
            mainVoiceFix: 'Let the final word land more clearly.',
            whatWorked: ['Clear intent in asking about the train\'s status.'],
            whatToFix: ['Question structure could be more direct.'],
            nativePhrase: 'Goedemiddag, is de trein naar Amsterdam op tijd?',
            whyBetter: 'This line already asks whether the train is on time. Keep that meaning; do not switch it into a platform or departure question.',
            pattern: null,
          },
          mainFixLine: 'Main fix: keep the on-time question; do not switch it into a platform or departure question.',
          scenarioGoalFit: {
            summary: 'This line asks if the train is on time.',
            alignmentScore: 85,
            relevantGoals: ['Ask if the train is on time'],
          },
        } as LiveSessionEvaluation['turnEvaluations'][number],
      ],
    })

    const result = runSecondPassReportQa(evaluation)
    expect(result.passed).toBe(true)
    expect(result.issues.some((issue) => issue.code === 'mismatched_train_status_rewrite')).toBe(true)
    expect(evaluation.turnEvaluations[0].mainFixLine).toBe('Main fix: keep this wording — focus on pronunciation.')
    expect(evaluation.turnEvaluations[0].sentenceGroundedReview?.whyBetter).toBe('This question already works for asking if the train is on time.')
  })

  it('strips inconsistent audio chips when the turn is not audio-backed (no rerun)', () => {
    const evaluation = makeEvaluation({
      turnEvaluations: [
        {
          ...makeEvaluation().turnEvaluations[0],
          signalSources: {
            audioMetrics: 'unavailable',
            languageCoach: 'transcript_language',
            scenarioContext: 'scenario_context',
          },
          pronunciationIssues: [
            { word: 'trein', issue: 'Vowel too short', fix: 'Repeat', score: 40, referenceAudioUrl: null },
          ],
        } as LiveSessionEvaluation['turnEvaluations'][number],
      ],
    })

    const result = runSecondPassReportQa(evaluation)
    expect(result.shouldRerun).toBe(false)
    expect(result.passed).toBe(true)
    expect(result.issues.some((issue) => issue.code === 'audio_claim_without_audio_evidence')).toBe(true)
    expect(evaluation.turnEvaluations[0].pronunciationIssues).toEqual([])
    expect(result.fixesApplied.some((f) => /no reliable audio metrics/i.test(f))).toBe(true)
  })

  it('fills missing completed-goal evidence from the linked learner turn', () => {
    const base = makeEvaluation()
    const evaluation = makeEvaluation({
      taskOutcome: {
        ...base.taskOutcome,
        goalEvidence: [
          {
            goalId: 'open',
            goalLabel: 'State your reason for calling',
            turnId: 'turn-1',
            turnIndex: 0,
            evidenceText: null,
            status: 'completed',
            weight: 0.5,
            tier: 'core',
          },
        ],
      },
    })

    const result = runSecondPassReportQa(evaluation)
    expect(result.shouldRerun).toBe(false)
    expect(result.passed).toBe(true)
    expect(evaluation.taskOutcome.goalEvidence[0].evidenceText?.length).toBeGreaterThan(3)
    expect(result.fixesApplied.some((f) => /Filled missing evidence/i.test(f))).toBe(true)
  })

  it('replaces greeting-only goal evidence with a fuller learner line when available', () => {
    const base = makeEvaluation()
    const evaluation = makeEvaluation({
      turnEvaluations: [
        {
          ...base.turnEvaluations[0],
          learnerTranscript: 'Goedemorgen, ik wil graag een afspraak maken voor vrijdag.',
        } as LiveSessionEvaluation['turnEvaluations'][number],
      ],
      taskOutcome: {
        ...base.taskOutcome,
        goalEvidence: [
          {
            goalId: 'greet',
            goalLabel: 'Open the call politely',
            turnId: 'turn-1',
            turnIndex: 0,
            evidenceText: 'Goedemorgen',
            status: 'completed',
            weight: 0.25,
            tier: 'core',
          },
        ],
      },
    })

    const result = runSecondPassReportQa(evaluation)
    expect(result.shouldRerun).toBe(false)
    expect(result.passed).toBe(true)
    expect(evaluation.taskOutcome.goalEvidence[0].evidenceText).toContain('afspraak')
    expect(result.fixesApplied.some((f) => /Broadened greeting-only|Replaced thin greeting/i.test(f))).toBe(true)
  })
})

/**
 * Language Coach reports are a fundamentally different shape than voice-scenario reports:
 * `turnEvaluations` is intentionally empty because free-form coach chat has no per-turn
 * scoring — insights live in `languageCoachDebrief` instead. The QA structural pass must
 * recognize this shape and validate the coach-specific invariants (`coachOneLiner`,
 * `focusAreaLabel`) instead of failing every coach session with `missing_core_section:
 * turnEvaluations` (the observed live regression that produced the
 * "Report QA failed after retry" outage).
 *
 * IMPORTANT: this is not a default/fallback. We are not fabricating turn data to satisfy the
 * voice-scenario schema. We are correctly grading two distinct report shapes by their own
 * invariants. The voice-scenario invariants stay strict (covered by other tests above).
 */
describe('runSecondPassReportQa — language coach report shape', () => {
  function languageCoachDebriefFixture(
    overrides?: Partial<NonNullable<LiveSessionEvaluation['languageCoachDebrief']>>,
  ): NonNullable<LiveSessionEvaluation['languageCoachDebrief']> {
    return {
      conversationRole: 'coach',
      conversationSummary: 'Discussed weekend plans and weather in Dutch.',
      focusAreaLabel: 'word order in subordinate clauses',
      strengths: ['Used short, clear sentences.'],
      weakPatterns: ['Inversion after time adverbs slipped twice.'],
      improvedPhrasingExamples: [
        { learnerish: 'Morgen ik ga naar Amsterdam.', better: 'Morgen ga ik naar Amsterdam.' },
      ],
      followUpSuggestions: ['Practice three sentences starting with “Morgen…”.'],
      savePracticePrompts: ['Vertel over je weekend met drie zinnen die met een tijdwoord beginnen.'],
      coachOneLiner: 'Inversion is the next quick win — your meaning is already clear.',
      whatImprovedDuringSession: 'Self-corrected one inversion mid-sentence.',
      ...overrides,
    }
  }

  function makeLanguageCoachEvaluation(
    overrides?: Partial<LiveSessionEvaluation>,
  ): LiveSessionEvaluation {
    /** Mirror the real LC evaluator: `turnEvaluations: []` is the WHOLE point. */
    return makeEvaluation({
      mode: 'speak_reply',
      scenarioId: 'language_coach',
      scenarioName: 'Language Coach',
      scenarioTitle: 'Language Coach',
      turnEvaluations: [],
      languageCoachDebrief: languageCoachDebriefFixture(),
      ...overrides,
    })
  }

  it('passes QA when a coach report has empty turnEvaluations + populated languageCoachDebrief', () => {
    const evaluation = makeLanguageCoachEvaluation()
    const result = runSecondPassReportQa(evaluation, { allowFixes: false })
    expect(result.passed).toBe(true)
    expect(result.shouldRerun).toBe(false)
    expect(result.unresolvedIssues).toEqual([])
    /** No fabricated turn data; the array stays exactly as the LC evaluator published it. */
    expect(evaluation.turnEvaluations).toEqual([])
    expect(result.qaRulesTriggered).toContain('qa:report_shape:language_coach')
    expect(result.qaRulesTriggered.every((r) => r !== 'issue:missing_core_section:turnEvaluations')).toBe(true)
    expect(result.qaRulesTriggered.every((r) => r !== 'issue:no_user_turn_evaluation:empty_turns')).toBe(true)
  })

  it('still requests rerun when a coach report is missing coachOneLiner', () => {
    const evaluation = makeLanguageCoachEvaluation({
      languageCoachDebrief: languageCoachDebriefFixture({ coachOneLiner: '   ' }),
    })
    const result = runSecondPassReportQa(evaluation, { allowFixes: false })
    expect(result.passed).toBe(false)
    expect(result.shouldRerun).toBe(true)
    expect(result.unresolvedIssues.some((i) =>
      i.code === 'missing_core_section' && /coachOneLiner/.test(i.message),
    )).toBe(true)
    expect(result.qaRulesTriggered).toContain('issue:missing_core_section:languageCoachDebrief.coachOneLiner')
  })

  it('still requests rerun when a coach report is missing focusAreaLabel', () => {
    const evaluation = makeLanguageCoachEvaluation({
      languageCoachDebrief: languageCoachDebriefFixture({ focusAreaLabel: '' }),
    })
    const result = runSecondPassReportQa(evaluation, { allowFixes: false })
    expect(result.passed).toBe(false)
    expect(result.shouldRerun).toBe(true)
    expect(result.unresolvedIssues.some((i) =>
      i.code === 'missing_core_section' && /focusAreaLabel/.test(i.message),
    )).toBe(true)
    expect(result.qaRulesTriggered).toContain('issue:missing_core_section:languageCoachDebrief.focusAreaLabel')
  })

  it('voice-scenario reports with empty turnEvaluations still fail QA (regression guard)', () => {
    /**
     * Without `languageCoachDebrief` the report is treated as a voice scenario; the strict
     * per-turn structural checks must keep firing. This guards against the LC branch being
     * widened by accident into the voice-scenario path.
     */
    const evaluation = makeEvaluation({ turnEvaluations: [] })
    const result = runSecondPassReportQa(evaluation, { allowFixes: false })
    expect(result.passed).toBe(false)
    expect(result.shouldRerun).toBe(true)
    expect(result.unresolvedIssues.some((i) =>
      i.code === 'missing_core_section' && /turnEvaluations/.test(i.message),
    )).toBe(true)
  })

  it('routes a coach session to the coach shape even if languageCoachDebrief is missing (defense-in-depth)', () => {
    /**
     * Simulates a future producer regression or corrupt persisted JSON where the
     * `languageCoachDebrief` field is lost but `scenarioId === 'language_coach'` is intact.
     * The QA structural pass must still recognize the coach shape via the scenario-id
     * fallback so the report does not silently flip back to the voice-scenario rules that
     * caused the original outage. Note: the resulting failure is the coach-specific
     * `missing_core_section: coachOneLiner / focusAreaLabel`, NOT the voice-scenario
     * `missing_core_section: turnEvaluations` — proving the shape detection landed correctly.
     */
    const evaluation = makeEvaluation({
      scenarioId: 'language_coach',
      mode: 'speak_reply',
      turnEvaluations: [],
    })
    const result = runSecondPassReportQa(evaluation, { allowFixes: false })
    expect(result.qaRulesTriggered).toContain('qa:report_shape:language_coach')
    expect(result.unresolvedIssues.every((i) => !/turnEvaluations/.test(i.message))).toBe(true)
    expect(result.unresolvedIssues.some((i) =>
      i.code === 'missing_core_section' && /coachOneLiner/.test(i.message),
    )).toBe(true)
  })

  it('accepts the kebab-case `language-coach` scenarioId variant as the coach shape', () => {
    /**
     * Slug normalization mirrors `normalizeScenarioSlugForAi` (hyphens → underscores) so a
     * legacy persisted row that stored `language-coach` is still recognized.
     */
    const evaluation = makeEvaluation({
      scenarioId: 'language-coach',
      mode: 'speak_reply',
      turnEvaluations: [],
      languageCoachDebrief: languageCoachDebriefFixture(),
    })
    const result = runSecondPassReportQa(evaluation, { allowFixes: false })
    expect(result.passed).toBe(true)
    expect(result.qaRulesTriggered).toContain('qa:report_shape:language_coach')
  })
})

/**
 * Defensive runtime normalization of corrupt persisted JSON. `turnEvaluations` is typed as a
 * required array, every producer sets it, but a legacy/corrupt row could land here with the
 * field missing entirely — pre-fix, QA crashed on `for (const turn of evaluation.turnEvaluations)`.
 * Aligning QA with `speakingProgressMappers` / `liveSpeakingSessionInsights` style (`?? []`) is
 * NOT fabricating turn data: it is type-correct empty coercion.
 */
describe('runSecondPassReportQa — defensive turnEvaluations normalization', () => {
  it('does not crash when persisted JSON is missing turnEvaluations and reports a tracing rule', () => {
    const evaluation = makeEvaluation()
    delete (evaluation as { turnEvaluations?: unknown }).turnEvaluations
    expect(() => runSecondPassReportQa(evaluation, { allowFixes: false })).not.toThrow()
    const result = runSecondPassReportQa(makeEvaluation(), { allowFixes: false })
    expect(result.qaRulesTriggered.every((r) => r !== 'qa:normalized_missing_turnEvaluations_array')).toBe(true)

    const corruptEvaluation = makeEvaluation()
    delete (corruptEvaluation as { turnEvaluations?: unknown }).turnEvaluations
    const corruptResult = runSecondPassReportQa(corruptEvaluation, { allowFixes: false })
    expect(corruptResult.qaRulesTriggered).toContain('qa:normalized_missing_turnEvaluations_array')
    expect(Array.isArray(corruptEvaluation.turnEvaluations)).toBe(true)
    expect(corruptEvaluation.turnEvaluations).toEqual([])
    /** Voice-scenario shape with empty turns must still flag the missing core section. */
    expect(corruptResult.unresolvedIssues.some((i) =>
      i.code === 'missing_core_section' && /turnEvaluations/.test(i.message),
    )).toBe(true)
  })
})

describe('storedEvaluationNeedsRefreshFromJson', () => {
  it('does not refresh a trusted QA-passed evaluation', () => {
    const evaluation = makeEvaluation()
    const qaResult = runSecondPassReportQa(evaluation)
    evaluation.reportQa = buildStoredReportQa(qaResult, 0)

    expect(storedEvaluationNeedsRefreshFromJson(JSON.stringify(evaluation))).toBe(false)
  })

  it('refreshes a previously trusted evaluation when the stored report now fails current QA rules', () => {
    const evaluation = makeEvaluation({
      turnEvaluations: [
        {
          ...makeEvaluation().turnEvaluations[0],
          learnerTranscript: 'Goedemiddag, is de trein naar Amsterdam op tijd?',
          referenceSentence: 'Waar vertrekt de trein naar Amsterdam?',
          scenarioGoalFit: {
            summary: 'This line addresses the ask which platform the train leaves from goal.',
            alignmentScore: 66,
            relevantGoals: ['Ask which platform'],
          },
        } as LiveSessionEvaluation['turnEvaluations'][number],
      ],
    })
    evaluation.reportQa = {
      version: 1,
      status: 'passed',
      checkedAt: '2026-04-14T10:04:00.000Z',
      issues: [],
      fixesApplied: [],
      rerunCount: 0,
    }

    expect(storedEvaluationNeedsRefreshFromJson(JSON.stringify(evaluation))).toBe(true)
  })
})
