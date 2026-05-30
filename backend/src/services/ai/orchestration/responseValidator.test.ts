import { describe, expect, it } from 'vitest'
import { AiValidationError } from '../errors'
import {
  validateAndMapEnrichmentJson,
  validateAndMapLiveSpeakReplyJson,
  validateAndMapRecapJson,
  validateAndMapReplyOnlyJson,
  validateAndMapTurnJson,
} from './ResponseValidator'

describe('validateAndMapTurnJson', () => {
  it('maps valid JSON to AIResponseEnvelope', () => {
    const raw = JSON.stringify({
      assistantReply: 'Goedemiddag.',
      feedback: null,
      saveWordCandidates: ['perron'],
      scenarioProgress: { stage: 'opening' },
      shouldConversationEnd: false,
      updatedSummary: 'Learner greeted.',
    })
    const v = validateAndMapTurnJson(raw)
    expect(v.assistantReply).toBe('Goedemiddag.')
    expect(v.saveWordCandidates).toEqual(['perron'])
    expect(v.shouldConversationEnd).toBe(false)
  })

  it('throws AiValidationError on invalid JSON', () => {
    expect(() => validateAndMapTurnJson('not json')).toThrow(AiValidationError)
  })
})

describe('validateAndMapReplyOnlyJson', () => {
  it('maps valid reply-only JSON', () => {
    const raw = JSON.stringify({
      assistantReply: 'Goed.',
      scenarioProgress: { stage: 'opening' },
      shouldConversationEnd: false,
    })
    const v = validateAndMapReplyOnlyJson(raw)
    expect(v.assistantReply).toBe('Goed.')
    expect(v.shouldConversationEnd).toBe(false)
    expect(v.speakLiveSignals).toBeNull()
  })

  it('accepts null speakLiveSignals and maps speakLiveSignals object', () => {
    const withNull = JSON.stringify({
      assistantReply: 'Hi.',
      shouldConversationEnd: false,
      speakLiveSignals: null,
    })
    expect(validateAndMapReplyOnlyJson(withNull).speakLiveSignals).toBeNull()

    const withSignals = JSON.stringify({
      assistantReply: 'Hi.',
      shouldConversationEnd: false,
      speakLiveSignals: { nextPhase: 'execution', intentLabel: 'platform' },
    })
    const v = validateAndMapReplyOnlyJson(withSignals)
    expect(v.speakLiveSignals?.nextPhase).toBe('execution')
    expect(v.speakLiveSignals?.intentLabel).toBe('platform')
  })

  it('accepts assistantMessage alias for assistantReply', () => {
    const raw = JSON.stringify({
      assistantMessage: 'Ja, op tijd.',
      shouldConversationEnd: false,
    })
    const v = validateAndMapReplyOnlyJson(raw)
    expect(v.assistantReply).toBe('Ja, op tijd.')
  })

  it('maps trainTurnResponse when present', () => {
    const raw = JSON.stringify({
      assistantReply: 'Goed.',
      shouldConversationEnd: false,
      trainTurnResponse: {
        answeredGoals: ['ASK_DELAY_STATUS'],
        unresolvedGoals: ['ASK_PLATFORM'],
        nextLikelyGoal: 'ASK_PLATFORM',
        coachNotesOptional: 'ok',
      },
    })
    const v = validateAndMapReplyOnlyJson(raw)
    expect(v.trainTurnResponse?.answeredGoals).toEqual(['ASK_DELAY_STATUS'])
    expect(v.trainTurnResponse?.unresolvedGoals).toContain('ASK_PLATFORM')
  })

  /**
   * The actual user-reported failure mode: `gpt-4o-mini` occasionally ignores
   * `response_format: 'json_object'` for the language-coach prompt and emits the Dutch reply
   * as plain prose. Salvaging this keeps the live conversation alive instead of surfacing
   * "Small hiccup" to the learner. See bug report 2026-05-15.
   */
  describe('salvage paths (model returned non-JSON)', () => {
    it('salvages bare prose into assistantReply', () => {
      const v = validateAndMapReplyOnlyJson('Goedemiddag! Hoe kan ik je helpen?')
      expect(v.assistantReply).toBe('Goedemiddag! Hoe kan ik je helpen?')
      expect(v.shouldConversationEnd).toBe(false)
    })

    it('salvages code-fenced JSON', () => {
      const v = validateAndMapReplyOnlyJson(
        '```json\n{"assistantReply":"Hallo!","shouldConversationEnd":false}\n```'
      )
      expect(v.assistantReply).toBe('Hallo!')
    })

    it('salvages JSON wrapped in stray prose', () => {
      const v = validateAndMapReplyOnlyJson(
        'Sure, here you go:\n{"assistantReply":"Goed.","shouldConversationEnd":false}\nLet me know.'
      )
      expect(v.assistantReply).toBe('Goed.')
    })

    it('accepts alternate keys (reply/text/message) when assistantReply is missing', () => {
      const v = validateAndMapReplyOnlyJson(
        JSON.stringify({ reply: 'Tot ziens.', shouldConversationEnd: false })
      )
      expect(v.assistantReply).toBe('Tot ziens.')
    })

    it('still rejects empty / whitespace-only payloads', () => {
      expect(() => validateAndMapReplyOnlyJson('   \n\t')).toThrow(AiValidationError)
    })

    it('strips leading/trailing quotes in salvaged prose', () => {
      const v = validateAndMapReplyOnlyJson('"Tot snel."')
      expect(v.assistantReply).toBe('Tot snel.')
    })

    /**
     * Real production failure observed 2026-05-16: `gpt-4o-mini` returns valid JSON that
     * gets cut off mid-string when `max_tokens` is reached. Strategy 2 (slice between first
     * `{` and last `}`) can't recover because the closing `}` was never emitted, and the
     * payload IS json-ish so the bare-prose path (Strategy 3) is skipped. Without the new
     * truncated-string salvage (Strategy 2b), the learner sees "Quick reconnect" even though
     * the model produced a perfectly readable Dutch teaching reply.
     */
    describe('truncated JSON envelope salvage (Strategy 2b)', () => {
      it('salvages a `{"assistantReply":"…` truncated mid-sentence (real production payload)', () => {
        const truncated =
          '{\n  "assistantReply": "Gezellig is een leuk woord! Het betekent vaak iets als \'gezelligheid\' of \'gezellige sfeer\'. Je kunt het gebruiken bij vrienden of een leuke activiteit. Bijvoorbeeld: \'Het is gezellig om met vrienden te zijn.\' Probeer '
        const v = validateAndMapReplyOnlyJson(truncated)
        /** The last partial word ("Probeer ") is trimmed back to whitespace and an ellipsis is appended. */
        expect(v.assistantReply.startsWith('Gezellig is een leuk woord!')).toBe(true)
        expect(v.assistantReply.endsWith('…')).toBe(true)
        /** The half-trailing token must NOT leak through. */
        expect(v.assistantReply).not.toMatch(/Probeer\s*$/)
        expect(v.shouldConversationEnd).toBe(false)
      })

      it('handles escaped quotes and newlines inside the truncated string', () => {
        const raw = '{"assistantReply":"Zij zei: \\"Hoi\\"\\nDat is leuk om te horen'
        const v = validateAndMapReplyOnlyJson(raw)
        expect(v.assistantReply).toContain('Zij zei: "Hoi"')
        expect(v.assistantReply).toContain('Dat is leuk')
        /** Trailing partial word "horen" is the LAST token, ellipsis appended. */
        expect(v.assistantReply.endsWith('…')).toBe(true)
      })

      it('also salvages when the alternate key (text/reply/message) is used and truncated', () => {
        const raw = '{"text":"Tot zo!  Praat later met je vri'
        const v = validateAndMapReplyOnlyJson(raw)
        expect(v.assistantReply).toContain('Tot zo!')
        expect(v.assistantReply.endsWith('…')).toBe(true)
      })

      it('does NOT append an ellipsis when the field closed cleanly (no truncation)', () => {
        /** The `}` is missing but the inner string has its closing quote, so this is salvageable AND complete. */
        const raw = '{"assistantReply":"Dat is perfect."'
        const v = validateAndMapReplyOnlyJson(raw)
        expect(v.assistantReply).toBe('Dat is perfect.')
      })

      it('still returns a sentinel when the truncation cut before any usable text', () => {
        /** Cut immediately after the opening quote — nothing to salvage. */
        expect(() => validateAndMapReplyOnlyJson('{"assistantReply":"')).toThrow(AiValidationError)
      })
    })
  })
})

describe('validateAndMapLiveSpeakReplyJson', () => {
  it('maps assistantText and answered goal indexes to envelope', () => {
    const raw = JSON.stringify({
      assistantText: 'Ja, spoor vier.',
      answeredGoals: [1],
      detectedUserIntentOptional: 'platform',
      pendingGoalsOptional: ['delay check'],
    })
    const v = validateAndMapLiveSpeakReplyJson(raw, { activeGoalIndex: 0 })
    expect(v.assistantReply).toBe('Ja, spoor vier.')
    expect(v.speakLiveSignals?.intentLabel).toBe('platform')
    expect(v.speakLiveSignals?.goalIndexesCompleted).toEqual([1])
    expect(v.speakLiveSignals?.needsClarification).toBe(true)
    expect(v.trainTurnResponse).toBeNull()
  })

  it('accepts assistantReply when assistantText absent', () => {
    const raw = JSON.stringify({ assistantReply: 'Hallo.', answeredGoals: [] })
    const v = validateAndMapLiveSpeakReplyJson(raw, { activeGoalIndex: 2 })
    expect(v.assistantReply).toBe('Hallo.')
  })

  it('maps trainAnsweredGoalIds to trainTurnResponse', () => {
    const raw = JSON.stringify({
      assistantText: 'Ok.',
      trainAnsweredGoalIds: ['ASK_PLATFORM'],
    })
    const v = validateAndMapLiveSpeakReplyJson(raw, { activeGoalIndex: 0 })
    expect(v.trainTurnResponse?.answeredGoals).toEqual(['ASK_PLATFORM'])
  })

  it('maps micro goalHit to answeredGoals and train ids', () => {
    const raw = JSON.stringify({
      assistantText: 'Ja.',
      goalHit: ['0', 'ASK_DELAY_STATUS'],
    })
    const v = validateAndMapLiveSpeakReplyJson(raw, { activeGoalIndex: 0 })
    expect(v.speakLiveSignals?.goalIndexesCompleted).toEqual([0])
    expect(v.trainTurnResponse?.answeredGoals).toEqual(['ASK_DELAY_STATUS'])
  })

  it('throws when JSON invalid or assistant text missing', () => {
    expect(() => validateAndMapLiveSpeakReplyJson('   ', { activeGoalIndex: 0 })).toThrow(AiValidationError)
    expect(() => validateAndMapLiveSpeakReplyJson('{"answeredGoals":[]}', { activeGoalIndex: 0 })).toThrow(
      AiValidationError
    )
  })

  it('salvages bare Dutch prose as assistantText (parity with reply-only path)', () => {
    const v = validateAndMapLiveSpeakReplyJson('Ja, spoor vier.', { activeGoalIndex: 0 })
    expect(v.assistantReply).toBe('Ja, spoor vier.')
  })

  it('rejects literal JSON-placeholder assistantText', () => {
    expect(() =>
      validateAndMapLiveSpeakReplyJson(JSON.stringify({ assistantText: '<Dutch>', goalHit: [] }), {
        activeGoalIndex: 0,
      })
    ).toThrow(AiValidationError)
  })
})

describe('validateAndMapRecapJson', () => {
  it('maps extended recap JSON including goals and merges savedWordSuggestions', () => {
    const raw = JSON.stringify({
      whatWentWell: ['Grounded line.'],
      whatToImprove: [],
      correctedPhrases: [],
      recommendedNextStep: 'Redo one departure-time question aloud.',
      saveWordCandidates: ['perron'],
      savedWordSuggestions: ['vertrek'],
      pronunciationHighlights: [],
      goalsCompleted: ['ASK_DELAY_STATUS', 'ASK_DEPARTURE_TIME'],
      goalsMissed: ['ASK_PLATFORM'],
      languageNotes: ['Stress HOE in “Hoe laat”.'],
      transcriptEvidence: [
        { goalId: 'ASK_DELAY_STATUS', quote: 'Is de trein op tijd?' },
        { goalId: 'ASK_DEPARTURE_TIME', quote: 'Hoe laat vertrekt de trein?' },
      ],
      dutchUpgrade: ['Use “perron” in a full sentence.'],
    })
    const v = validateAndMapRecapJson(raw, 'thread-1')
    expect(v.threadId).toBe('thread-1')
    expect(v.suggestedNextAction).toContain('Redo')
    expect(v.saveWordCandidates).toEqual(['perron', 'vertrek'])
    expect(v.goalsCompleted).toEqual(['ASK_DELAY_STATUS', 'ASK_DEPARTURE_TIME'])
    expect(v.goalsMissed).toEqual(['ASK_PLATFORM'])
    expect(v.transcriptEvidence).toHaveLength(2)
  })

  it('accepts legacy recap with only suggestedNextAction', () => {
    const raw = JSON.stringify({
      whatWentWell: ['x'],
      whatToImprove: [],
      correctedPhrases: [],
      suggestedNextAction: 'Next',
      saveWordCandidates: [],
      pronunciationHighlights: [],
    })
    const v = validateAndMapRecapJson(raw, 't')
    expect(v.suggestedNextAction).toBe('Next')
    expect(v.recommendedNextStep).toBe('Next')
  })
})

describe('validateAndMapEnrichmentJson', () => {
  it('maps enrichment JSON including optional scenarioProgress', () => {
    const raw = JSON.stringify({
      feedback: null,
      saveWordCandidates: ['perron'],
      updatedSummary: 'Learner asked about platforms.',
      scenarioProgress: { stage: 'platform_ok' },
    })
    const v = validateAndMapEnrichmentJson(raw)
    expect(v.saveWordCandidates).toEqual(['perron'])
    expect(v.scenarioProgress?.stage).toBe('platform_ok')
  })
})
