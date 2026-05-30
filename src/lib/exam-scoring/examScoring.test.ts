import { describe, it, expect } from 'vitest'
import { applySpeakingExecutionGate, applyWritingExecutionGate, countWords } from '@/lib/exam-scoring/scoringGuards'
import { SPEAKING_MAX_TOTAL, speakingScoresZero } from '@/lib/exam-scoring/speakingScoringPolicy'
import { WRITING_MAX_TOTAL, writingScoresZero } from '@/lib/exam-scoring/writingScoringPolicy'
import { aggregateSpeakingAttempt, aggregateWritingAttempt } from '@/lib/exam-scoring/scoreAggregator'
import { normalizedPercent } from '@/lib/exam-scoring/scoringNormalizer'
import { scoreSpeakingFromAiJson, scoreWritingFromAiJson } from '@/lib/exam-scoring/index'
import { examScoringResultSchema } from '@/lib/schemas/exam/scoringResult.schema'

describe('execution gating', () => {
  it('zeros all speaking categories when execution is 0', () => {
    const { scores, gated } = applySpeakingExecutionGate({
      execution: 0,
      vocabulary: 2,
      grammar: 2,
      fluency: 2,
      clearness: 1,
      pronunciation: 2,
    })
    expect(gated).toBe(true)
    expect(scores).toEqual(speakingScoresZero())
  })

  it('preserves speaking scores when execution > 0', () => {
    const raw = {
      execution: 2,
      vocabulary: 2,
      grammar: 1,
      fluency: 2,
      clearness: 1,
      pronunciation: 1,
    }
    const { scores, gated } = applySpeakingExecutionGate(raw)
    expect(gated).toBe(false)
    expect(scores).toEqual(raw)
  })

  it('zeros all writing categories when execution is 0', () => {
    const { scores, gated } = applyWritingExecutionGate({
      execution: 0,
      grammar: 2,
      spelling: 2,
      clearness: 1,
      vocabulary: 2,
    })
    expect(gated).toBe(true)
    expect(scores).toEqual(writingScoresZero())
  })
})

describe('aggregateSpeakingAttempt', () => {
  it('computes total 12 for max rubric', () => {
    const out = aggregateSpeakingAttempt({
      mode: 'training',
      responseText: 'Een twee drie vier vijf',
      scores: {
        execution: 3,
        vocabulary: 2,
        grammar: 2,
        fluency: 2,
        clearness: 1,
        pronunciation: 2,
      },
    })
    expect(out.totalScore).toBe(SPEAKING_MAX_TOTAL)
    expect(out.normalizedPercent).toBe(100)
    expect(out.pass).toBe(true)
    expect(out.executionGatingApplied).toBe(false)
  })

  it('forces low scores for very short response', () => {
    const out = aggregateSpeakingAttempt({
      mode: 'training',
      responseText: 'Ja',
      scores: {
        execution: 3,
        vocabulary: 2,
        grammar: 2,
        fluency: 2,
        clearness: 1,
        pronunciation: 2,
      },
    })
    expect(out.executionGatingApplied).toBe(true)
    expect(out.totalScore).toBe(0)
    expect(out.pass).toBe(false)
  })
})

describe('aggregateWritingAttempt', () => {
  it('computes normalized percent', () => {
    const out = aggregateWritingAttempt({
      mode: 'simulation',
      responseText: 'Een twee drie vier vijf zes',
      scores: {
        execution: 2,
        grammar: 1,
        spelling: 2,
        clearness: 1,
        vocabulary: 1,
      },
    })
    expect(out.maxScore).toBe(WRITING_MAX_TOTAL)
    expect(out.normalizedPercent).toBe(normalizedPercent(out.totalScore, WRITING_MAX_TOTAL))
  })
})

describe('AI JSON pipeline', () => {
  it('parses speaking AI payload and applies gate', () => {
    const res = scoreSpeakingFromAiJson('training', 'dit is een lang antwoord met genoeg woorden', {
      scores: { execution: 0, vocabulary: 2, grammar: 2, fluency: 2, clearness: 1, pronunciation: 2 },
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.output.totalScore).toBe(0)
      expect(res.output.executionGatingApplied).toBe(true)
    }
  })

  it('parses writing AI payload', () => {
    const res = scoreWritingFromAiJson('training', 'meer woorden hier voor de minimum guard', {
      scores: { execution: 3, grammar: 2, spelling: 2, clearness: 1, vocabulary: 2 },
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.output.totalScore).toBe(WRITING_MAX_TOTAL)
    }
  })
})

describe('engineOutputToExamScoringResult shape', () => {
  it('validates against examScoringResultSchema', async () => {
    const { engineOutputToExamScoringResult } = await import('@/lib/exam-scoring/scoreAggregator')
    const out = aggregateSpeakingAttempt({
      mode: 'training',
      responseText: 'genoeg woorden hier voor credit en een beetje meer',
      scores: {
        execution: 2,
        vocabulary: 1,
        grammar: 1,
        fluency: 1,
        clearness: 1,
        pronunciation: 1,
      },
      categoryRationales: { execution: 'Addresses task partially.' },
    })
    const persisted = engineOutputToExamScoringResult(out, {
      id: 'score-test-1',
      examAttemptId: 'att-1',
      examExerciseId: 'ex-1',
    })
    const parsed = examScoringResultSchema.safeParse(persisted)
    expect(parsed.success).toBe(true)
  })
})

describe('countWords', () => {
  it('counts tokens', () => {
    expect(countWords('  a  b  ')).toBe(2)
  })
})

describe('scoring fixtures', () => {
  it('matches fixture-speaking-strong expected totals', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const raw = JSON.parse(
      readFileSync(join(process.cwd(), 'content/exam/scoring-fixtures/fixture-speaking-strong.json'), 'utf8')
    ) as {
      mode: 'training' | 'simulation'
      responseText: string
      transcriptConfidence?: number
      aiPayload: unknown
      expected: { rawTotal: number; pass: boolean; executionGatingApplied: boolean }
    }
    const res = scoreSpeakingFromAiJson(raw.mode, raw.responseText, raw.aiPayload, {
      transcriptConfidence: raw.transcriptConfidence,
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.output.totalScore).toBe(raw.expected.rawTotal)
    expect(res.output.pass).toBe(raw.expected.pass)
    expect(res.output.executionGatingApplied).toBe(raw.expected.executionGatingApplied)
  })

  it('matches fixture-speaking-weak gating', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const raw = JSON.parse(
      readFileSync(join(process.cwd(), 'content/exam/scoring-fixtures/fixture-speaking-weak.json'), 'utf8')
    ) as {
      mode: 'training' | 'simulation'
      responseText: string
      aiPayload: unknown
      expected: { rawTotal: number; executionGatingApplied: boolean }
    }
    const res = scoreSpeakingFromAiJson(raw.mode, raw.responseText, raw.aiPayload)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.output.totalScore).toBe(raw.expected.rawTotal)
    expect(res.output.executionGatingApplied).toBe(raw.expected.executionGatingApplied)
  })
})
