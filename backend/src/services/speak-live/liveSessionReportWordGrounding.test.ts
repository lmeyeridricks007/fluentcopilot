import { describe, expect, it } from 'vitest'
import { isSafePronunciationCoachToken } from './liveSessionReportWordGrounding'

describe('isSafePronunciationCoachToken', () => {
  it('rejects a nonsense learner token far from reference Dutch', () => {
    const ok = isSafePronunciationCoachToken(
      'carque',
      'Ik wil een carque naar Amsterdam.',
      'Mag ik een kaartje naar Amsterdam, alstublieft?',
      [],
      [],
    )
    expect(ok).toBe(false)
  })

  it('accepts tokens that align with reference wording', () => {
    expect(
      isSafePronunciationCoachToken(
        'kaartje',
        'een kaartje',
        'Mag ik een kaartje naar Amsterdam?',
        [],
        [],
      ),
    ).toBe(true)
  })

  it('accepts observed tokens that are explicitly bridged by wrong-word detections', () => {
    expect(
      isSafePronunciationCoachToken(
        'carque',
        'Ik wil een carque.',
        'Mag ik een kaartje?',
        [
          {
            observedToken: 'carque',
            classification: 'likely_misrecognition',
            suggestedCorrection: 'kaartje',
            whyItMatters: 'test',
            severity: 'high',
          },
        ],
        [],
      ),
    ).toBe(true)
  })
})
