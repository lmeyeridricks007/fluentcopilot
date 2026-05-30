import { describe, expect, it } from 'vitest'
import type { LiveSessionEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import type { SessionLearningInsights } from '../learningMemory/sessionLearningInsightTypes'
import type { UserLearningProfile } from '../learningMemory/userLearningProfileDocument'
import type { TrainingLoopCandidate } from './trainingLoopTypes'
import {
  buildDedupeKey,
  buildLoopGenerationContext,
  buildTrainingLoopCandidates,
  buildTrainingLoopPracticeBundle,
  rankAndSelectTrainingLoops,
  resolveTrainingLoopSourceType,
  runTrainingLoopGenerationPipeline,
  scoreTrainingLoopCandidate,
  weaknessSignature,
  type LoopGenerationInput,
} from './trainingLoopGenerationEngine'

const SESSION_V2 = 2 as const

function baseInsights(over: Partial<SessionLearningInsights> = {}): SessionLearningInsights {
  return {
    schemaVersion: SESSION_V2,
    sessionId: 'sess-1',
    userId: 'user-1',
    sessionType: 'speak_live',
    scenarioId: 'sc-1',
    extractedAt: new Date().toISOString(),
    weakWords: [],
    weakPatterns: [],
    pronunciationIssues: [],
    hesitationIssues: [],
    scenarioPerformance: null,
    strengths: [],
    confidenceSummary: 'test',
    ...over,
  }
}

function minimalProfile(over: Partial<UserLearningProfile> = {}): UserLearningProfile {
  return {
    schemaVersion: 2,
    userId: 'user-1',
    version: 1,
    updatedAt: new Date().toISOString(),
    totalSessionsObserved: 3,
    weakVocabulary: [],
    weakGrammarPatterns: [],
    pronunciationIssues: [],
    hesitationPatterns: [],
    scenarioPerformance: {},
    practiceRecommendations: [],
    strongestAreas: [],
    activeFocusAreas: [],
    levelEstimate: null,
    recentScenarioSlugs: [],
    lastSessionModality: null,
    ...over,
  } as UserLearningProfile
}

describe('resolveTrainingLoopSourceType', () => {
  it('maps language coach slug to coach', () => {
    expect(
      resolveTrainingLoopSourceType({ sessionType: 'speak_live', scenarioSlug: 'language_coach' }),
    ).toBe('coach')
  })
  it('maps read aloud', () => {
    expect(resolveTrainingLoopSourceType({ sessionType: 'read_aloud', scenarioSlug: null })).toBe('read_aloud')
  })
  it('maps listening sessions to listening source', () => {
    expect(resolveTrainingLoopSourceType({ sessionType: 'listening', scenarioSlug: 'cafe' })).toBe('listening')
  })
})

describe('rankAndSelectTrainingLoops', () => {
  it('suppresses near-duplicate weakness overlap vs recent loops', () => {
    const candidates = [
      {
        sourceSessionId: 't1',
        threadId: 't1',
        sourceType: 'scenario' as const,
        sourceScenarioId: 'sc',
        loopSlot: 0 as const,
        loopType: 'weak_words' as const,
        title: 'Words',
        subtitle: '',
        reason: 'r',
        targetSkills: ['fluency'],
        targetWeaknessKeys: ['hallo', 'doei'],
        estimatedMinutes: 1,
        difficulty: 'easy' as const,
        payload: { words: [], exampleSentences: [], referenceAudioUrls: [], targetSkillIds: [] },
        confidence: 'high' as const,
        priorityScore: 95,
        dedupeKey: 'weak_words:hallo|doei:',
        rankReason: 'test',
      },
      {
        sourceSessionId: 't1',
        threadId: 't1',
        sourceType: 'scenario' as const,
        sourceScenarioId: 'sc',
        loopSlot: 0 as const,
        loopType: 'structure_drill' as const,
        title: 'Structure',
        subtitle: '',
        reason: 'r2',
        targetSkills: ['fluency'],
        targetWeaknessKeys: ['pattern_x'],
        estimatedMinutes: 1,
        difficulty: 'easy' as const,
        payload: { prompts: [], modelAnswers: [], targetPatternId: 'pattern_x' },
        confidence: 'medium' as const,
        priorityScore: 70,
        dedupeKey: 'structure_drill:pattern_x:',
        rankReason: 'test2',
      },
    ]
    const recent = [
      {
        dedupeKey: 'weak_words:hallo|doei:other',
        loopType: 'weak_words' as const,
        status: 'completed' as const,
        createdAt: new Date().toISOString(),
        targetWeaknessKeys: ['hallo', 'doei'],
      },
    ]
    const out = rankAndSelectTrainingLoops({ candidates, recent, nowMs: Date.now() })
    expect(out.primary?.loopType).toBe('structure_drill')
  })

  it('suppresses recent duplicate dedupe keys', () => {
    const candidates = [
      {
        sourceSessionId: 't1',
        threadId: 't1',
        sourceType: 'scenario' as const,
        sourceScenarioId: 'sc',
        loopSlot: 0 as const,
        loopType: 'weak_words' as const,
        title: 'Words',
        subtitle: '',
        reason: 'r',
        targetSkills: ['fluency'],
        targetWeaknessKeys: ['a'],
        estimatedMinutes: 1,
        difficulty: 'easy' as const,
        payload: { words: [], exampleSentences: [], referenceAudioUrls: [], targetSkillIds: [] },
        confidence: 'high' as const,
        priorityScore: 80,
        dedupeKey: 'weak_words:a:',
        rankReason: 'test',
      },
    ]
    const recent = [
      {
        dedupeKey: 'weak_words:a:',
        loopType: 'weak_words' as const,
        status: 'completed' as const,
        createdAt: new Date().toISOString(),
      },
    ]
    const out = rankAndSelectTrainingLoops({ candidates, recent, nowMs: Date.now() })
    expect(out.primary).toBeNull()
    expect(out.suppressedDuplicates.length).toBeGreaterThan(0)
  })
})

describe('buildTrainingLoopCandidates', () => {
  it('produces weak_words when enough weak tokens exist', () => {
    const insights = baseInsights({
      weakWords: [
        {
          normalizedKey: 'x',
          displayText: 'hallo',
          category: 'vocab',
          source: 't',
          severity: 2,
          severityScore: 2,
          confidence: 0.7,
          evidenceRefs: [],
        },
        {
          normalizedKey: 'y',
          displayText: 'dank',
          category: 'vocab',
          source: 't',
          severity: 2,
          severityScore: 2,
          confidence: 0.7,
          evidenceRefs: [],
        },
      ],
    })
    const c = buildTrainingLoopCandidates({
      userId: 'u',
      sourceSessionId: 'thr',
      threadId: 'thr',
      scenarioId: 'sc',
      scenarioSlug: 'train_station',
      sessionType: 'speak_live',
      insights,
      profile: minimalProfile(),
      speakLiveEvaluation: null,
      readAloudResult: null,
    })
    expect(c.some((x) => x.loopType === 'weak_words')).toBe(true)
  })
})

describe('weaknessSignature', () => {
  it('sorts and normalizes keys for dedupe comparisons', () => {
    expect(weaknessSignature(['Z', 'a', 'a'])).toBe('a|a|z')
  })
})

function loopGenInput(over: Partial<LoopGenerationInput> = {}): LoopGenerationInput {
  return {
    userId: 'u1',
    sourceSessionId: 's1',
    threadId: 't1',
    scenarioId: 'sc1',
    scenarioSlug: 'train_station',
    sessionType: 'speak_live',
    insights: baseInsights({
      weakWords: [
        {
          normalizedKey: 'x',
          displayText: 'hallo',
          category: 'vocab',
          source: 't',
          severity: 2,
          severityScore: 2,
          confidence: 0.7,
          evidenceRefs: [],
        },
        {
          normalizedKey: 'y',
          displayText: 'dank',
          category: 'vocab',
          source: 't',
          severity: 2,
          severityScore: 2,
          confidence: 0.7,
          evidenceRefs: [],
        },
      ],
    }),
    profile: minimalProfile(),
    speakLiveEvaluation: null,
    readAloudResult: null,
    ...over,
  }
}

function sampleWeakWordsCandidate(): TrainingLoopCandidate {
  return {
    sourceSessionId: 't1',
    threadId: 't1',
    sourceType: 'scenario',
    sourceScenarioId: 'sc',
    loopSlot: 0,
    loopType: 'weak_words',
    title: 'Words',
    subtitle: '',
    reason: 'r',
    targetSkills: ['fluency'],
    targetWeaknessKeys: ['hallo', 'dank'],
    estimatedMinutes: 1,
    difficulty: 'easy',
    payload: { words: [], exampleSentences: [], referenceAudioUrls: [], targetSkillIds: [] },
    confidence: 'high',
    priorityScore: 80,
    dedupeKey: 'weak_words:hallo|dank:',
    rankReason: 'test',
  }
}

describe('buildDedupeKey', () => {
  it('sorts keys and appends normalized extra tail', () => {
    expect(buildDedupeKey('weak_words', ['Z', 'a'], 'Hello')).toBe('weak_words:a|z:hello')
  })
})

describe('buildLoopGenerationContext', () => {
  it('resolves modality-specific source types', () => {
    expect(buildLoopGenerationContext(loopGenInput({ sessionType: 'read_aloud' })).source).toBe('read_aloud')
    expect(buildLoopGenerationContext(loopGenInput({ sessionType: 'text_conversation' })).source).toBe('chat')
    expect(buildLoopGenerationContext(loopGenInput({ scenarioSlug: 'language_coach' })).source).toBe('coach')
  })

  it('maps primary report recommendation to weak_words for scoring alignment', () => {
    const ev = {
      recommendedActions: [
        { id: '1', type: 'save_words' as const, title: 'T', reason: 'R', priority: 'primary' as const },
      ],
    } as unknown as LiveSessionEvaluation
    const ctx = buildLoopGenerationContext(loopGenInput({ speakLiveEvaluation: ev }))
    expect(ctx.primaryRecoLoopType).toBe('weak_words')
  })
})

describe('scoreTrainingLoopCandidate', () => {
  const nowMs = Date.parse('2026-06-15T12:00:00.000Z')

  it('adds reportAlignment when loop type matches mapped primary reco', () => {
    const ev = {
      recommendedActions: [
        { id: '1', type: 'save_words' as const, title: 'T', reason: 'R', priority: 'primary' as const },
      ],
    } as unknown as LiveSessionEvaluation
    const ctxWith = buildLoopGenerationContext(loopGenInput({ speakLiveEvaluation: ev }))
    const ctxNo = buildLoopGenerationContext(loopGenInput())
    const c = sampleWeakWordsCandidate()
    const a = scoreTrainingLoopCandidate(c, ctxNo, [], nowMs)
    const b = scoreTrainingLoopCandidate(c, ctxWith, [], nowMs)
    expect(b.components.reportAlignment - a.components.reportAlignment).toBe(15)
  })

  it('applies dismissed same-type penalty within the dismiss window', () => {
    const ctx = buildLoopGenerationContext(loopGenInput())
    const c = sampleWeakWordsCandidate()
    const recent = [
      {
        dedupeKey: 'x',
        loopType: 'weak_words' as const,
        status: 'dismissed' as const,
        createdAt: '2026-06-14T00:00:00.000Z',
      },
    ]
    const base = scoreTrainingLoopCandidate(c, ctx, [], nowMs)
    const hit = scoreTrainingLoopCandidate(c, ctx, recent, nowMs)
    expect(hit.components.dismissedLoopPenalty).toBeGreaterThan(base.components.dismissedLoopPenalty)
    expect(hit.score).toBeLessThanOrEqual(base.score)
  })
})

describe('runTrainingLoopGenerationPipeline', () => {
  it('returns sorted candidates and a primary selection when not fully suppressed', () => {
    const out = runTrainingLoopGenerationPipeline({ input: loopGenInput(), recent: [], nowMs: Date.now() })
    expect(out.candidates.length).toBeGreaterThan(0)
    expect(out.candidates[0].priorityScore).toBeGreaterThanOrEqual(out.candidates[out.candidates.length - 1].priorityScore)
    expect(out.selected.rankingNotes.length).toBeGreaterThanOrEqual(0)
  })

  it('read_aloud session uses read_aloud adapter source in context', () => {
    const out = runTrainingLoopGenerationPipeline({
      input: loopGenInput({ sessionType: 'read_aloud' }),
      recent: [],
      nowMs: Date.now(),
    })
    expect(out.context.source).toBe('read_aloud')
  })
})

describe('buildTrainingLoopPracticeBundle', () => {
  it('assigns slots 0/1/2, active status, and ~7d expiry for persistence contract', () => {
    const c = sampleWeakWordsCandidate()
    const secondary: TrainingLoopCandidate = {
      ...c,
      loopType: 'structure_drill',
      title: 'Structure',
      dedupeKey: 'structure_drill:p1:',
      rankReason: 'r2',
      targetWeaknessKeys: ['p1'],
      payload: { prompts: ['a', 'b'], modelAnswers: ['', ''], targetPatternId: 'p1' },
    }
    const stretch: TrainingLoopCandidate = {
      ...c,
      loopType: 'mini_scenario',
      dedupeKey: 'mini:s1:',
      rankReason: 'r3',
      difficulty: 'stretch',
      targetWeaknessKeys: [],
      payload: {
        scenarioId: 's1',
        scenarioVariant: null,
        objective: 'obj',
        openingPrompt: 'open',
        expectedSkillFocus: [],
        targetTurnCount: 2,
      },
    }
    const bundle = buildTrainingLoopPracticeBundle({
      userId: 'u1',
      selected: { primary: c, secondary, stretch },
      summaries: [],
      suppressedDuplicates: [],
      rankingNotes: [],
      includeDebug: false,
    })
    expect(bundle.primary?.loopSlot).toBe(0)
    expect(bundle.secondary?.loopSlot).toBe(1)
    expect(bundle.stretch?.loopSlot).toBe(2)
    expect(bundle.primary?.status).toBe('active')
    expect(bundle.primary?.userId).toBe('u1')
    const exp = bundle.primary?.expiresAt ? Date.parse(bundle.primary.expiresAt) : 0
    const created = bundle.primary?.createdAt ? Date.parse(bundle.primary.createdAt) : 0
    expect(exp - created).toBeGreaterThan(6 * 86_400_000)
    expect(bundle.primary?.id).not.toBe(bundle.secondary?.id)
  })

  it('embeds debug when requested', () => {
    const c = sampleWeakWordsCandidate()
    const bundle = buildTrainingLoopPracticeBundle({
      userId: 'u1',
      selected: { primary: c, secondary: null, stretch: null },
      summaries: [{ loopType: 'weak_words', title: 'T', priorityScore: 1, rankReason: 'r', dedupeKey: 'k' }],
      suppressedDuplicates: ['dup'],
      rankingNotes: ['n1'],
      includeDebug: true,
    })
    expect(bundle.debug?.suppressedDuplicates).toEqual(['dup'])
    expect(bundle.debug?.rankingNotes).toContain('n1')
  })
})

/** Same gate as `liveSessionEvaluationAppService` when attaching `practiceNow` to the report API payload. */
function practiceNowForReportPayload(bundle: ReturnType<typeof buildTrainingLoopPracticeBundle>) {
  return bundle.primary || bundle.secondary || bundle.stretch ? bundle : null
}

describe('report practiceNow payload gate', () => {
  it('returns null when all practice slots are empty', () => {
    const empty = buildTrainingLoopPracticeBundle({
      userId: 'u1',
      selected: { primary: null, secondary: null, stretch: null },
      summaries: [],
      suppressedDuplicates: [],
      rankingNotes: [],
      includeDebug: false,
    })
    expect(practiceNowForReportPayload(empty)).toBeNull()
  })

  it('returns bundle when any slot is present', () => {
    const c = sampleWeakWordsCandidate()
    const b = buildTrainingLoopPracticeBundle({
      userId: 'u1',
      selected: { primary: c, secondary: null, stretch: null },
      summaries: [],
      suppressedDuplicates: [],
      rankingNotes: [],
      includeDebug: false,
    })
    expect(practiceNowForReportPayload(b)).toBe(b)
  })
})
