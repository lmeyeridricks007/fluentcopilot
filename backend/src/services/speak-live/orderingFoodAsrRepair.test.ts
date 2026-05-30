import { describe, expect, it } from 'vitest'
import type { TurnEvaluation } from './liveVoiceEvaluationTypes'
import { inferDeterministicLanguageRepair } from './liveSessionReportEnrichment'

function minimalTurn(transcript: string): TurnEvaluation {
  return { learnerTranscript: transcript, transcriptOriginal: transcript } as TurnEvaluation
}

describe('inferDeterministicLanguageRepair ordering food ASR', () => {
  const title = 'Ordering food / drinks'
  const slug = 'ordering_food'

  it('repairs gruttenkoffie → grote koffie', () => {
    const r = inferDeterministicLanguageRepair(
      minimalTurn('Een gruttenkoffie, alsjeblieft?'),
      title,
      slug,
    )
    expect(r).not.toBeNull()
    expect(r!.improvedVersion?.toLowerCase()).toContain('grote koffie')
    expect(r!.wrongDetections?.[0]?.suggestedCorrection).toContain('grote')
  })

  it('repairs Hepté harde melk → Hebt u havermelk?', () => {
    const r = inferDeterministicLanguageRepair(minimalTurn('Hepté harde melk.'), title, slug)
    expect(r?.improvedVersion).toBe('Hebt u havermelk?')
  })

  it('repairs Mag ik harder melk met mijn koffie', () => {
    const r = inferDeterministicLanguageRepair(
      minimalTurn('Mag ik harder melk met mijn koffie?'),
      title,
      slug,
    )
    expect(r?.improvedVersion?.toLowerCase()).toContain('havermelk')
    expect(r?.improvedVersion?.toLowerCase()).not.toMatch(/harder\s+melk/)
  })

  it('still repairs harder melk → havermelk when train-only deterministic gate is off (LLM-coached path)', () => {
    const r = inferDeterministicLanguageRepair(
      minimalTurn('Mag ik harder melk met mijn koffie?'),
      title,
      slug,
      false,
    )
    expect(r?.wrongDetections?.some(w => w.suggestedCorrection === 'havermelk')).toBe(true)
    expect(r?.improvedVersion?.toLowerCase()).toContain('havermelk')
  })

  it('repairs Ik wil harder melk … via catch-all', () => {
    const r = inferDeterministicLanguageRepair(
      minimalTurn('Ik wil graag harder melk in mijn koffie.'),
      title,
      slug,
    )
    expect(r?.improvedVersion?.toLowerCase()).toContain('havermelk')
    expect(r?.wrongDetections?.[0]?.suggestedCorrection).toBe('havermelk')
  })

  it('does not apply grutten repair on train station scenario', () => {
    const r = inferDeterministicLanguageRepair(
      minimalTurn('Een gruttenkoffie, alsjeblieft?'),
      'Train station',
      'train-station',
    )
    expect(r).toBeNull()
  })
})
