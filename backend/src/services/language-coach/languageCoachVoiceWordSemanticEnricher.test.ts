import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../ai/speakLiveEvalChatCompletion', () => ({
  runSpeakLiveEvalChatCompletionRich: vi.fn(),
}))

import { enrichVoiceWordSemantics } from './languageCoachVoiceWordSemanticEnricher'
import { runSpeakLiveEvalChatCompletionRich } from '../ai/speakLiveEvalChatCompletion'
import { AiTimeoutError } from '../ai/errors'

const mockedLlm = runSpeakLiveEvalChatCompletionRich as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  mockedLlm.mockReset()
})

afterEach(() => {
  mockedLlm.mockReset()
})

describe('enrichVoiceWordSemantics — empty input', () => {
  it('returns empty suggestions without calling the LLM', async () => {
    const result = await enrichVoiceWordSemantics([])
    expect(result.suggestions).toEqual([])
    expect(result.diagnostics.requested).toBe(0)
    expect(mockedLlm).not.toHaveBeenCalled()
  })
})

describe('enrichVoiceWordSemantics — happy path', () => {
  it('parses a confident mistranscription suggestion (the "gernen → gerend" case)', async () => {
    mockedLlm.mockResolvedValueOnce({
      content: JSON.stringify({
        suggestions: [
          {
            index: 0,
            weakWord: 'gernen',
            isLikelyDutchWord: false,
            likelyIntent: { dutchWord: 'gerend', englishGloss: 'ran' },
            correctedSentence: 'Ik heb gisteren gerend.',
            pronunciationTip: 'Stress the "ge-" and finish on a clean "-rend".',
          },
        ],
      }),
      providerNetworkMs: 320,
      responseReadMs: 0,
    })
    const result = await enrichVoiceWordSemantics([
      { weakWord: 'gernen', contextLine: 'Ik heb gisteren gernen.' },
    ])
    expect(result.suggestions).toHaveLength(1)
    const s = result.suggestions[0]!
    expect(s.weakWord).toBe('gernen')
    expect(s.isLikelyDutchWord).toBe(false)
    expect(s.likelyIntent).toEqual({ dutchWord: 'gerend', englishGloss: 'ran' })
    expect(s.correctedSentence).toBe('Ik heb gisteren gerend.')
    expect(s.pronunciationTip).toContain('ge-')
  })

  it('handles "real Dutch word, just unclear" cases (isLikelyDutchWord = true)', async () => {
    mockedLlm.mockResolvedValueOnce({
      content: JSON.stringify({
        suggestions: [
          {
            index: 0,
            weakWord: 'gisteren',
            isLikelyDutchWord: true,
            likelyIntent: null,
            correctedSentence: 'Ik ben gisteren naar de winkel gegaan.',
            pronunciationTip: 'Crisper "g" at the start of "gisteren".',
          },
        ],
      }),
      providerNetworkMs: 280,
      responseReadMs: 0,
    })
    const result = await enrichVoiceWordSemantics([
      { weakWord: 'gisteren', contextLine: 'Ik gisteren naar de winkel.' },
    ])
    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0]?.isLikelyDutchWord).toBe(true)
    expect(result.suggestions[0]?.likelyIntent).toBeNull()
    expect(result.suggestions[0]?.correctedSentence).toContain('gisteren')
  })

  it('preserves input order via the index field even when LLM returns out of order', async () => {
    mockedLlm.mockResolvedValueOnce({
      content: JSON.stringify({
        suggestions: [
          {
            index: 1,
            weakWord: 'werkten',
            isLikelyDutchWord: true,
            likelyIntent: null,
            correctedSentence: 'Wij werkten samen.',
            pronunciationTip: null,
          },
          {
            index: 0,
            weakWord: 'gernen',
            isLikelyDutchWord: false,
            likelyIntent: { dutchWord: 'gerend', englishGloss: 'ran' },
            correctedSentence: 'Ik heb gisteren gerend.',
            pronunciationTip: null,
          },
        ],
      }),
      providerNetworkMs: 250,
      responseReadMs: 0,
    })
    const result = await enrichVoiceWordSemantics([
      { weakWord: 'gernen', contextLine: 'Ik heb gisteren gernen.' },
      { weakWord: 'werkten', contextLine: 'Wij werkten samen.' },
    ])
    expect(result.suggestions).toHaveLength(2)
    expect(result.suggestions.find((s) => s.weakWord === 'gernen')?.likelyIntent?.dutchWord).toBe('gerend')
    expect(result.suggestions.find((s) => s.weakWord === 'werkten')?.isLikelyDutchWord).toBe(true)
  })
})

describe('enrichVoiceWordSemantics — sentence validation', () => {
  it('drops correctedSentence when the LLM duplicates an existing content word (the "gisteren gisteren" case)', async () => {
    /**
     * Real failure mode from production: LLM substituted "gernen" → "gisteren" naively,
     * producing "Ik heb gisteren gisteren." which is nonsense. The validator must reject
     * the corrected sentence so the row falls back to the deterministic resolver instead
     * of shipping the duplicate.
     */
    mockedLlm.mockResolvedValueOnce({
      content: JSON.stringify({
        suggestions: [
          {
            index: 0,
            weakWord: 'gernen',
            isLikelyDutchWord: false,
            likelyIntent: { dutchWord: 'gisteren', englishGloss: 'yesterday' },
            correctedSentence: 'Ik heb gisteren gisteren.',
            pronunciationTip: 'Soften the "g"',
          },
        ],
      }),
      providerNetworkMs: 100,
      responseReadMs: 0,
    })
    const result = await enrichVoiceWordSemantics([
      { weakWord: 'gernen', contextLine: 'Ik heb gisteren gernen.' },
    ])
    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0]?.correctedSentence).toBeNull()
  })

  it('drops correctedSentence when the intent word is missing from the proposed sentence', async () => {
    /**
     * The LLM claimed "likely meant 'gerend'" but the corrected sentence doesn't contain
     * "gerend" — diagnosis would contradict the practice target. Reject.
     */
    mockedLlm.mockResolvedValueOnce({
      content: JSON.stringify({
        suggestions: [
          {
            index: 0,
            weakWord: 'gernen',
            isLikelyDutchWord: false,
            likelyIntent: { dutchWord: 'gerend', englishGloss: 'ran' },
            correctedSentence: 'Ik heb gisteren gewandeld.',
            pronunciationTip: null,
          },
        ],
      }),
      providerNetworkMs: 100,
      responseReadMs: 0,
    })
    const result = await enrichVoiceWordSemantics([
      { weakWord: 'gernen', contextLine: 'Ik heb gisteren gernen.' },
    ])
    expect(result.suggestions[0]?.correctedSentence).toBeNull()
  })

  it('drops correctedSentence when it is a verbatim echo of the learner line (no info added)', async () => {
    mockedLlm.mockResolvedValueOnce({
      content: JSON.stringify({
        suggestions: [
          {
            index: 0,
            weakWord: 'gernen',
            isLikelyDutchWord: false,
            likelyIntent: { dutchWord: 'gerend', englishGloss: 'ran' },
            correctedSentence: 'Ik heb gisteren gernen.',
            pronunciationTip: null,
          },
        ],
      }),
      providerNetworkMs: 100,
      responseReadMs: 0,
    })
    const result = await enrichVoiceWordSemantics([
      { weakWord: 'gernen', contextLine: 'Ik heb gisteren gernen.' },
    ])
    expect(result.suggestions[0]?.correctedSentence).toBeNull()
  })

  it('keeps correctedSentence when function words ("de", "het") repeat (legitimate Dutch grammar)', async () => {
    mockedLlm.mockResolvedValueOnce({
      content: JSON.stringify({
        suggestions: [
          {
            index: 0,
            weakWord: 'tabbel',
            isLikelyDutchWord: false,
            likelyIntent: { dutchWord: 'tafel', englishGloss: 'table' },
            correctedSentence: 'De tafel en de stoel staan in de keuken.',
            pronunciationTip: null,
          },
        ],
      }),
      providerNetworkMs: 100,
      responseReadMs: 0,
    })
    const result = await enrichVoiceWordSemantics([
      { weakWord: 'tabbel', contextLine: 'De tabbel en de stoel staan in de keuken.' },
    ])
    expect(result.suggestions[0]?.correctedSentence).toBe('De tafel en de stoel staan in de keuken.')
  })

  it('keeps correctedSentence in the canonical "gernen → gerend" success case', async () => {
    mockedLlm.mockResolvedValueOnce({
      content: JSON.stringify({
        suggestions: [
          {
            index: 0,
            weakWord: 'gernen',
            isLikelyDutchWord: false,
            likelyIntent: { dutchWord: 'gerend', englishGloss: 'ran' },
            correctedSentence: 'Ik heb gisteren gerend.',
            pronunciationTip: 'Stress the "ge-" and finish on a clean "-rend".',
          },
        ],
      }),
      providerNetworkMs: 100,
      responseReadMs: 0,
    })
    const result = await enrichVoiceWordSemantics([
      { weakWord: 'gernen', contextLine: 'Ik heb gisteren gernen.' },
    ])
    expect(result.suggestions[0]?.correctedSentence).toBe('Ik heb gisteren gerend.')
  })
})

describe('enrichVoiceWordSemantics — failure modes (no fallbacks, just empty)', () => {
  it('returns empty suggestions and failureReason on timeout', async () => {
    mockedLlm.mockRejectedValueOnce(new AiTimeoutError('test timeout'))
    const result = await enrichVoiceWordSemantics([{ weakWord: 'gernen', contextLine: 'x' }])
    expect(result.suggestions).toEqual([])
    expect(result.diagnostics.timedOut).toBe(true)
    expect(result.diagnostics.failureReason).toContain('timeout')
  })

  it('returns empty suggestions on JSON parse failure', async () => {
    mockedLlm.mockResolvedValueOnce({
      content: 'not actually json',
      providerNetworkMs: 100,
      responseReadMs: 0,
    })
    const result = await enrichVoiceWordSemantics([{ weakWord: 'gernen', contextLine: 'x' }])
    expect(result.suggestions).toEqual([])
    expect(result.diagnostics.requested).toBe(1)
    expect(result.diagnostics.returned).toBe(0)
  })

  it('returns empty suggestions when the LLM emits an empty suggestions array', async () => {
    mockedLlm.mockResolvedValueOnce({
      content: JSON.stringify({ suggestions: [] }),
      providerNetworkMs: 100,
      responseReadMs: 0,
    })
    const result = await enrichVoiceWordSemantics([{ weakWord: 'gernen', contextLine: 'x' }])
    expect(result.suggestions).toEqual([])
  })

  it('drops entries with out-of-range index and keeps the valid ones', async () => {
    mockedLlm.mockResolvedValueOnce({
      content: JSON.stringify({
        suggestions: [
          {
            index: 99,
            weakWord: 'whatever',
            isLikelyDutchWord: false,
            likelyIntent: { dutchWord: 'foo', englishGloss: 'bar' },
            correctedSentence: 'foo bar',
            pronunciationTip: null,
          },
          {
            index: 0,
            weakWord: 'gernen',
            isLikelyDutchWord: false,
            likelyIntent: { dutchWord: 'gerend', englishGloss: 'ran' },
            correctedSentence: 'Ik heb gerend.',
            pronunciationTip: null,
          },
        ],
      }),
      providerNetworkMs: 120,
      responseReadMs: 0,
    })
    const result = await enrichVoiceWordSemantics([{ weakWord: 'gernen', contextLine: 'Ik heb gernen.' }])
    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0]?.likelyIntent?.dutchWord).toBe('gerend')
  })

  it('drops likelyIntent when isLikelyDutchWord is true (parser invariant)', async () => {
    mockedLlm.mockResolvedValueOnce({
      content: JSON.stringify({
        suggestions: [
          {
            index: 0,
            weakWord: 'gisteren',
            isLikelyDutchWord: true,
            likelyIntent: { dutchWord: 'gisteren', englishGloss: 'yesterday' },
            correctedSentence: 'Ik ben gisteren gegaan.',
            pronunciationTip: null,
          },
        ],
      }),
      providerNetworkMs: 100,
      responseReadMs: 0,
    })
    const result = await enrichVoiceWordSemantics([
      { weakWord: 'gisteren', contextLine: 'Ik gisteren gegaan.' },
    ])
    expect(result.suggestions[0]?.isLikelyDutchWord).toBe(true)
    expect(result.suggestions[0]?.likelyIntent).toBeNull()
  })
})
