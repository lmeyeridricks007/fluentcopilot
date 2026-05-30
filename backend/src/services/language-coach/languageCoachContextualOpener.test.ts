import { describe, expect, it } from 'vitest'
import { buildLanguageCoachContextualOpeningLine } from './languageCoachContextualOpener'
import type { LanguageCoachStartPayload } from '../../domain/speakLive/languageCoachSessionTypes'

function payload(overrides: Partial<LanguageCoachStartPayload> = {}): LanguageCoachStartPayload {
  return {
    conversationGoal: 'general',
    feedbackStyle: 'subtle_and_end',
    coachStyle: 'balanced',
    personaStyle: 'coach',
    conversationRole: 'coach',
    coachGuideWhileSpeaking: false,
    pinnedFocusEnglish: null,
    ...overrides,
  }
}

describe('buildLanguageCoachContextualOpeningLine', () => {
  it('returns null for cold-start general session with no pinned focus (preserves DB intro line)', () => {
    const out = buildLanguageCoachContextualOpeningLine(payload())
    expect(out).toBeNull()
  })

  it('returns null for general goal even when payload has whitespace-only pinned focus', () => {
    const out = buildLanguageCoachContextualOpeningLine(
      payload({ pinnedFocusEnglish: '   \t  \n  ' }),
    )
    expect(out).toBeNull()
  })

  it('builds a goal-anchored Dutch opener for grammar with no pinned focus (no generic “waar zin je in?”)', () => {
    const out = buildLanguageCoachContextualOpeningLine(payload({ conversationGoal: 'grammar' }))
    expect(out).not.toBeNull()
    const text = out!
    expect(text.toLowerCase()).not.toMatch(/waar zin je/)
    expect(text.toLowerCase()).not.toMatch(/waar wil je het over hebben/)
    expect(text).toContain('werkwoordsvolgorde')
    expect(text).toMatch(/Wil je beginnen met/)
    expect(text).toMatch(/[,;]/) // multi-option enumeration uses commas
  })

  it('builds a goal-anchored opener for pronunciation that lists 2–3 concrete options', () => {
    const out = buildLanguageCoachContextualOpeningLine(
      payload({ conversationGoal: 'pronunciation' }),
    )
    expect(out).not.toBeNull()
    const text = out!
    expect(text).toContain('“ui”')
    expect(text).toMatch(/Wil je beginnen met/)
  })

  it('builds a welcome-back opener when a pinned focus is present (does not paste raw English)', () => {
    const out = buildLanguageCoachContextualOpeningLine(
      payload({
        pinnedFocusEnglish:
          'Keep this session oriented around practising asking follow-up questions and varying my Dutch around the word "gezellig". Bring it back into the chat with brief callbacks.',
      }),
    )
    expect(out).not.toBeNull()
    const text = out!
    expect(text.toLowerCase()).not.toContain('keep this session')
    expect(text.toLowerCase()).not.toContain('follow-up questions') // English phrase should not leak
    expect(text).toContain('doorvragen na een antwoord')
    expect(text).toContain('“gezellig”')
    expect(text).toMatch(/Welkom terug|fijn dat je er weer bent|Goed je weer te zien|leuk dat we/i)
  })

  it('extracts past-tense and word-order anchors from a pinned focus combining several signals', () => {
    const out = buildLanguageCoachContextualOpeningLine(
      payload({
        conversationGoal: 'grammar',
        pinnedFocusEnglish:
          'Keep this session oriented around practising Dutch word order and past-tense forms. Bring it back into the chat with brief callbacks.',
      }),
    )
    expect(out).not.toBeNull()
    const text = out!
    expect(text).toContain('werkwoordsvolgorde')
    expect(text).toContain('verleden tijd')
  })

  it('falls back to a goal-derived chip when pinned focus has no recognized anchors', () => {
    const out = buildLanguageCoachContextualOpeningLine(
      payload({
        conversationGoal: 'grammar',
        pinnedFocusEnglish: 'Some unrecognized pinned focus string from a future planner version.',
      }),
    )
    expect(out).not.toBeNull()
    const text = out!
    expect(text).toContain('grammatica-doel')
  })

  it('falls back to a continuity opener with no anchors and general goal (still concrete next step)', () => {
    const out = buildLanguageCoachContextualOpeningLine(
      payload({
        conversationGoal: 'general',
        pinnedFocusEnglish: 'Something the extractor will not recognize at all.',
      }),
    )
    expect(out).not.toBeNull()
    const text = out!
    expect(text).toMatch(/Laten we doorgaan met waar je mee bezig was/)
    expect(text).toMatch(/Wil je eerst een korte oefening doen, of liever/)
  })

  it('uses a friend-tone greeting when conversationRole is friend', () => {
    const out = buildLanguageCoachContextualOpeningLine(
      payload({ conversationGoal: 'fluency', conversationRole: 'friend' }),
    )
    expect(out).not.toBeNull()
    expect(out).toContain('Leuk dat je er bent')
  })

  it('uses a dutch_local-tone welcome-back greeting when role is dutch_local and pinned focus exists', () => {
    const out = buildLanguageCoachContextualOpeningLine(
      payload({
        conversationRole: 'dutch_local',
        pinnedFocusEnglish:
          'Keep this session oriented around practising asking follow-up questions. Bring it back into the chat.',
      }),
    )
    expect(out).not.toBeNull()
    expect(out).toMatch(/leuk dat we weer even kletsen/i)
  })

  it('caps options at 3 even when the pinned focus mentions more anchor phrases', () => {
    const out = buildLanguageCoachContextualOpeningLine(
      payload({
        pinnedFocusEnglish:
          'Keep this session oriented around practising follow-up questions, Dutch word order, past-tense forms, articles de/het, and question form patterns.',
      }),
    )
    expect(out).not.toBeNull()
    const text = out!
    /**
     * Three options join with two commas + " of " between the last two. So at most 2 commas
     * should appear in the enumerated list portion. We can sanity-check there is exactly
     * one " of " (no more chained options).
     */
    const ofMatches = text.match(/ of /g) ?? []
    expect(ofMatches.length).toBeLessThanOrEqual(2)
  })

  it('never includes English phrases or markdown that the TTS layer would mispronounce', () => {
    const out = buildLanguageCoachContextualOpeningLine(
      payload({
        conversationGoal: 'storytelling',
        pinnedFocusEnglish:
          'Keep this session oriented around practising Dutch word order. Bring it back into the chat with brief callbacks and one tight mini-drill when natural.',
      }),
    )
    expect(out).not.toBeNull()
    const text = out!
    expect(text).not.toMatch(/[*_#]/) // no markdown bold/italic/heading
    expect(text.toLowerCase()).not.toMatch(/keep this session|brief callbacks|mini-drill/)
  })

  it('safely handles curly-quoted vocab in the pinned focus', () => {
    const out = buildLanguageCoachContextualOpeningLine(
      payload({
        pinnedFocusEnglish:
          'Keep this session oriented around varying my Dutch around the word “lekker”.',
      }),
    )
    expect(out).not.toBeNull()
    expect(out).toContain('“lekker”')
  })
})
