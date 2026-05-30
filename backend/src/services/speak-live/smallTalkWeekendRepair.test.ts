import { describe, expect, it } from 'vitest'
import type { TurnEvaluation } from './liveVoiceEvaluationTypes'
import {
  inferDeterministicLanguageRepair,
  sanitizeSmallTalkWeekendHowReferences,
} from './liveSessionReportEnrichment'

function minimalTurn(transcript: string, partial?: Partial<TurnEvaluation>): TurnEvaluation {
  return {
    learnerTranscript: transcript,
    transcriptOriginal: transcript,
    referenceSentence: partial?.referenceSentence ?? transcript,
    ...partial,
  } as TurnEvaluation
}

describe('small talk weekend hoe/wat repair', () => {
  const slug = 'small_talk'
  const title = 'Small talk'

  it('repairs We was je weekend → Hoe was je weekend', () => {
    const line = 'Ja, Het gaat goed. We was je weekend.'
    const r = inferDeterministicLanguageRepair(minimalTurn(line), title, slug)
    expect(r).not.toBeNull()
    expect(r!.improvedVersion).toContain('Hoe was je weekend')
    expect(r!.improvedVersion).not.toMatch(/\bWe was je weekend\b/i)
    expect(r!.wrongDetections?.[0]?.suggestedCorrection.toLowerCase()).toBe('hoe')
  })

  it('repairs Wat was je weekend → Hoe was je weekend', () => {
    const r = inferDeterministicLanguageRepair(minimalTurn('Wat was je weekend?'), title, slug)
    expect(r?.improvedVersion).toBe('Hoe was je weekend?')
  })

  it('does not fire when hoe is already correct', () => {
    const r = inferDeterministicLanguageRepair(minimalTurn('Hoe was je weekend?'), title, slug)
    expect(r).toBeNull()
  })

  it('still repairs when train-only deterministic gate is off (LLM-coached path)', () => {
    const r = inferDeterministicLanguageRepair(minimalTurn('We was je weekend.'), title, slug, false)
    expect(r?.improvedVersion).toContain('Hoe was je weekend')
  })

  it('sanitizes LLM reference copy that used Wat was je weekend', () => {
    const turn = minimalTurn('Ja. We was je weekend.', {
      referenceSentence: 'Wat was je weekend?',
      languageEvaluation: {
        grammarScore: 70,
        sentenceConstructionScore: 70,
        naturalnessScore: 70,
        levelFitScore: 70,
        whatWorked: [],
        grammarIssues: [],
        sentenceStructureIssues: [],
        improvedVersion: 'Wat was je weekend?',
        whyItIsBetter: 'x',
        levelBasedComment: 'A2',
      },
      naturalRewrite: {
        original: 'x',
        improved: 'Wat was je weekend?',
        whyMoreNatural: 'y',
      },
    })
    sanitizeSmallTalkWeekendHowReferences(turn, slug)
    expect(turn.referenceSentence).toBe('Hoe was je weekend?')
    expect(turn.languageEvaluation?.improvedVersion).toBe('Hoe was je weekend?')
    expect(turn.naturalRewrite?.improved).toBe('Hoe was je weekend?')
  })

  it('does not sanitize on non–small-talk slug', () => {
    const turn = minimalTurn('Hi', { referenceSentence: 'Wat was je weekend?' })
    sanitizeSmallTalkWeekendHowReferences(turn, 'train_station')
    expect(turn.referenceSentence).toBe('Wat was je weekend?')
  })
})
