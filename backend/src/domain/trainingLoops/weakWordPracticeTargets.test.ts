import { describe, expect, it } from 'vitest'
import type { LiveSessionEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import {
  buildWrongWordCorrectionMap,
  hydrateWeakWordsLoopPayload,
  parseVocabularyGapPracticeToken,
  resolveWordPracticeTargets,
} from './weakWordPracticeTargets'

describe('weakWordPracticeTargets', () => {
  const evaluation = {
    turnEvaluations: [
      {
        turnId: 't1',
        wrongWordDetections: [
          {
            observedToken: 'kortje',
            suggestedCorrection: 'kaartje',
            classification: 'wrong_word_choice',
            whyItMatters: 'Ticket word at the counter',
            severity: 'medium',
          },
        ],
      },
    ],
  } as unknown as LiveSessionEvaluation

  it('maps observed slip to correction target', () => {
    const map = buildWrongWordCorrectionMap(evaluation)
    const resolved = resolveWordPracticeTargets(['kortje', 'trein', 'het'], map)
    expect(resolved[0]?.word).toBe('kaartje')
    expect(resolved[0]?.practiceHint).toMatch(/kortje.*kaartje/i)
    expect(resolved[1]?.word).toBe('trein')
  })

  it('hydrates persisted weak_words payload', () => {
    const next = hydrateWeakWordsLoopPayload(
      {
        words: ['trein', 'het', 'kortje'],
        exampleSentences: [],
        referenceAudioUrls: [],
        targetSkillIds: [],
      },
      evaluation,
    )
    expect(next.words).toEqual(['trein', 'het', 'kaartje'])
    expect(next.practiceHints?.[2]).toMatch(/kortje.*kaartje/i)
  })

  it('parses vocabulary gap arrow format', () => {
    expect(parseVocabularyGapPracticeToken('kortje → kaartje')).toEqual({
      observed: 'kortje',
      practice: 'kaartje',
    })
  })

  it('maps azure weak word to reference Dutch when detections are missing', () => {
    const evalFromReference = {
      turnEvaluations: [
        {
          turnId: 't1',
          learnerTranscript: 'Mag ik een kortje voor de trein naar Amsterdam? Hoeveel kost het?',
          referenceSentence: 'Mag ik een kaartje naar Amsterdam? Wat kost dat?',
          azureSpeechEvaluation: { weakWords: ['kortje', 'trein', 'het'] },
        },
      ],
    } as unknown as LiveSessionEvaluation

    const map = buildWrongWordCorrectionMap(evalFromReference)
    const resolved = resolveWordPracticeTargets(['trein', 'het', 'kortje'], map)
    expect(resolved[0]?.word).toBe('trein')
    expect(resolved[2]?.word).toBe('kaartje')
    expect(resolved[2]?.practiceHint).toMatch(/kortje.*kaartje/i)
  })
})
