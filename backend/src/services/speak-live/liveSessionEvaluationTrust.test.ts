import { describe, expect, it } from 'vitest'
import {
  VOICE_ANALYSIS_UNAVAILABLE_MESSAGE,
  SESSION_VOICE_ANALYSIS_UNAVAILABLE_MESSAGE,
  buildAudioFeedbackItems,
  filterKeyProblemsWhenNoAudio,
  filterStrengthsWhenNoAudio,
  filterImprovementActionsForAudioPresence,
  filterRecommendedFollowUpsForSessionAudio,
  sanitizeDutchLikenessForTranscriptOnly,
  validateAndFilterFeedbackItems,
  diagnoseFeedbackViolations,
} from './liveSessionEvaluationTrust'
import { AUDIO_ONLY_FEEDBACK_TYPES } from './liveVoiceEvaluationTypes'
import type { FeedbackItem, FeedbackItemType } from './liveVoiceEvaluationTypes'

// ── Test 1: no audio turn → no pronunciation/fluency/rhythm items ───────

describe('no audio turn produces zero voice-quality feedback', () => {
  it('validateAndFilterFeedbackItems rejects pronunciation with source=transcript', () => {
    const items: FeedbackItem[] = [
      {
        type: 'pronunciation',
        source: 'transcript',
        evidence: { transcriptSnippet: 'goedemiddag' },
        issue: 'unclear vowel',
        fix: 'stretch',
        explanation: 'fake',
      },
    ]
    expect(validateAndFilterFeedbackItems(items)).toEqual([])
  })

  it('validateAndFilterFeedbackItems rejects fluency with source=transcript', () => {
    const items: FeedbackItem[] = [
      {
        type: 'fluency',
        source: 'transcript',
        evidence: { transcriptSnippet: 'is de trein' },
        issue: 'hesitation',
        fix: 'be smoother',
        explanation: 'fake',
      },
    ]
    expect(validateAndFilterFeedbackItems(items)).toEqual([])
  })

  it('validateAndFilterFeedbackItems rejects rhythm with source=transcript', () => {
    const items: FeedbackItem[] = [
      {
        type: 'rhythm',
        source: 'transcript',
        evidence: { transcriptSnippet: 'de trein' },
        issue: 'choppy',
        fix: 'chunk',
        explanation: 'guessed',
      },
    ]
    expect(validateAndFilterFeedbackItems(items)).toEqual([])
  })

  it('rejects pacing and prosody without audio', () => {
    const types: FeedbackItemType[] = ['pacing', 'prosody']
    for (const type of types) {
      const items: FeedbackItem[] = [
        {
          type,
          source: 'transcript',
          evidence: { transcriptSnippet: 'hello' },
          issue: 'x',
          fix: 'y',
          explanation: 'z',
        },
      ]
      expect(validateAndFilterFeedbackItems(items)).toEqual([])
    }
  })
})

// ── Test 2: transcript-only turn → grammar allowed, pronunciation blocked ───

describe('transcript-only turns allow grammar, block pronunciation', () => {
  it('allows grammar feedback with source=transcript', () => {
    const items: FeedbackItem[] = [
      {
        type: 'grammar',
        source: 'transcript',
        evidence: { transcriptSnippet: 'ik wil de trein' },
        issue: 'missing article',
        fix: 'add het',
        explanation: 'helps',
      },
    ]
    expect(validateAndFilterFeedbackItems(items)).toHaveLength(1)
  })

  it('allows naturalness feedback with source=transcript', () => {
    const items: FeedbackItem[] = [
      {
        type: 'naturalness',
        source: 'transcript',
        evidence: { transcriptSnippet: 'ik wil de trein' },
        issue: 'too literal',
        fix: 'use graag',
        explanation: 'phrasing',
      },
    ]
    expect(validateAndFilterFeedbackItems(items)).toHaveLength(1)
  })

  it('blocks pronunciation in same payload', () => {
    const items: FeedbackItem[] = [
      {
        type: 'grammar',
        source: 'transcript',
        evidence: { transcriptSnippet: 'test' },
        issue: 'ok',
        fix: 'ok',
        explanation: 'ok',
      },
      {
        type: 'pronunciation',
        source: 'transcript',
        evidence: { transcriptSnippet: 'test' },
        issue: 'bad',
        fix: 'fix',
        explanation: 'fake',
      },
    ]
    const valid = validateAndFilterFeedbackItems(items)
    expect(valid).toHaveLength(1)
    expect(valid[0].type).toBe('grammar')
  })
})

// ── Test 3: fake score payload → validation fails ───────────────────────

describe('diagnoseFeedbackViolations catches fake items', () => {
  it('diagnoses pronunciation without audio', () => {
    const items: FeedbackItem[] = [
      {
        type: 'pronunciation',
        source: 'transcript',
        evidence: { transcriptSnippet: 'x' },
        issue: 'x',
        fix: 'x',
        explanation: 'x',
      },
    ]
    const violations = diagnoseFeedbackViolations(items)
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('REJECTED')
    expect(violations[0]).toContain('pronunciation')
  })

  it('diagnoses missing evidence', () => {
    const items: FeedbackItem[] = [
      {
        type: 'grammar',
        source: 'transcript',
        evidence: { transcriptSnippet: '' },
        issue: 'x',
        fix: 'x',
        explanation: 'x',
      },
    ]
    const violations = diagnoseFeedbackViolations(items)
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('no transcriptSnippet')
  })

  it('passes clean audio-backed pronunciation', () => {
    const items: FeedbackItem[] = [
      {
        type: 'pronunciation',
        source: 'audio',
        evidence: { transcriptSnippet: 'goedemiddag', word: 'goedemiddag' },
        issue: 'vowel short',
        fix: 'stretch',
        explanation: 'Azure',
      },
    ]
    expect(diagnoseFeedbackViolations(items)).toEqual([])
  })
})

// ── Test 4: mixed session — only valid evidence-backed sections render ──

describe('mixed audio/transcript sessions', () => {
  it('audio-backed pronunciation passes, transcript-backed is rejected', () => {
    const items: FeedbackItem[] = [
      {
        type: 'pronunciation',
        source: 'audio',
        evidence: { transcriptSnippet: 'audio turn', word: 'trein', timestampMsStart: 120, timestampMsEnd: 450 },
        issue: 'vowel',
        fix: 'stretch',
        explanation: 'Azure word score',
      },
      {
        type: 'pronunciation',
        source: 'transcript',
        evidence: { transcriptSnippet: 'transcript turn' },
        issue: 'guessed',
        fix: 'none',
        explanation: 'no real evidence',
      },
    ]
    const valid = validateAndFilterFeedbackItems(items)
    expect(valid).toHaveLength(1)
    expect(valid[0].source).toBe('audio')
  })
})

// ── Test 5: no "mumble/unclear/rhythm" text without audio evidence ──────

describe('no speech-quality text leaks into transcript-only feedback', () => {
  it('filterKeyProblemsWhenNoAudio strips speech terms', () => {
    const raw = [
      'You mumbled in the middle',
      'Rhythm is off on this turn',
      'Good vocabulary for A2',
      'Pronunciation was unclear',
      'Pacing felt rushed',
      'Article agreement on "de trein"',
    ]
    const filtered = filterKeyProblemsWhenNoAudio(raw)
    expect(filtered).toEqual(['Good vocabulary for A2', 'Article agreement on "de trein"'])
  })

  it('filterStrengthsWhenNoAudio strips audio claims', () => {
    const raw = [
      'Good pronunciation on common words',
      'Natural word order in questions',
      'How you sounded was improving',
    ]
    const filtered = filterStrengthsWhenNoAudio(raw)
    expect(filtered).toEqual(['Natural word order in questions'])
  })

  it('sanitizeDutchLikenessForTranscriptOnly replaces rhythm/pronunciation mentions', () => {
    expect(sanitizeDutchLikenessForTranscriptOnly('Great rhythm and pacing', 'Train station')).toContain(
      'We only have your transcript'
    )
    expect(sanitizeDutchLikenessForTranscriptOnly('You mumbled a bit', 'Train station')).toContain(
      'We only have your transcript'
    )
  })

  it('sanitizeDutchLikenessForTranscriptOnly keeps clean transcript lines', () => {
    const clean = 'Good vocabulary choice for the scenario.'
    expect(sanitizeDutchLikenessForTranscriptOnly(clean, 'Train station')).toBe(clean)
  })
})

// ── Test 6: improvement actions are audio-gated ─────────────────────────

describe('improvement actions respect audio boundary', () => {
  it('strips pronunciation and rhythm drills when no audio', () => {
    const actions = [
      { type: 'save_pronunciation_word' as const, title: 'x', detail: 'x' },
      { type: 'save_rhythm_drill' as const, title: 'x', detail: 'x' },
      { type: 'save_phrase' as const, title: 'y', detail: 'y' },
      { type: 'save_natural_phrasing' as const, title: 'z', detail: 'z' },
    ]
    const filtered = filterImprovementActionsForAudioPresence(false, actions)
    expect(filtered.map((a) => a.type)).toEqual(['save_phrase', 'save_natural_phrasing'])
  })

  it('keeps all actions when audio exists', () => {
    const actions = [
      { type: 'save_pronunciation_word' as const, title: 'x', detail: 'x' },
      { type: 'save_rhythm_drill' as const, title: 'x', detail: 'x' },
    ]
    expect(filterImprovementActionsForAudioPresence(true, actions)).toHaveLength(2)
  })
})

// ── Test 7: recommended follow-ups are audio-gated ──────────────────────

describe('recommended follow-ups respect audio boundary', () => {
  it('strips pronunciation_drill and rhythm_drill without session audio', () => {
    const followUps = [
      { type: 'pronunciation_drill', title: 'x', reason: 'x' },
      { type: 'rhythm_drill', title: 'x', reason: 'x' },
      { type: 'repeat_scenario', title: 'y', reason: 'y' },
    ]
    const filtered = filterRecommendedFollowUpsForSessionAudio(false, followUps)
    expect(filtered.map((f) => f.type)).toEqual(['repeat_scenario'])
  })
})

// ── Test 8: buildAudioFeedbackItems requires transcript ─────────────────

describe('buildAudioFeedbackItems requires evidence', () => {
  it('returns empty when transcript is empty', () => {
    expect(
      buildAudioFeedbackItems({
        transcript: '',
        pronunciationIssues: [
          { word: 'x', score: 40, issue: 'i', fix: 'f', referenceAudioUrl: null, startMs: null, endMs: null },
        ],
        fluencyIssues: [],
      })
    ).toEqual([])
  })

  it('builds valid items from real pronunciation issues', () => {
    const items = buildAudioFeedbackItems({
      transcript: 'goedemiddag',
      pronunciationIssues: [
        { word: 'goedemiddag', score: 52, issue: 'vowel', fix: 'stretch', referenceAudioUrl: null, startMs: 100, endMs: 500 },
      ],
      fluencyIssues: [],
    })
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('pronunciation')
    expect(items[0].source).toBe('audio')
    expect(items[0].evidence.timestampMsStart).toBe(100)
  })
})

// ── Test 9: AUDIO_ONLY_FEEDBACK_TYPES is canonical ──────────────────────

describe('AUDIO_ONLY_FEEDBACK_TYPES canonical set', () => {
  it('includes all voice-quality types', () => {
    for (const t of ['pronunciation', 'fluency', 'rhythm', 'pacing', 'prosody'] as const) {
      expect(AUDIO_ONLY_FEEDBACK_TYPES.has(t)).toBe(true)
    }
  })

  it('excludes transcript-safe types', () => {
    for (const t of ['grammar', 'naturalness', 'scenario_fit'] as const) {
      expect(AUDIO_ONLY_FEEDBACK_TYPES.has(t)).toBe(false)
    }
  })
})

// ── Test 10: messages are correct ───────────────────────────────────────

describe('unavailable messages', () => {
  it('turn-level message explains a missing recording for this turn', () => {
    /** Phrasing has been softened — assert intent (no recording, voice feedback excluded), not exact wording. */
    expect(VOICE_ANALYSIS_UNAVAILABLE_MESSAGE).toMatch(/no recording was stored.*this turn/i)
    expect(VOICE_ANALYSIS_UNAVAILABLE_MESSAGE).toMatch(/pronunciation/i)
  })

  it('session-level message explains a missing session-wide recording', () => {
    expect(SESSION_VOICE_ANALYSIS_UNAVAILABLE_MESSAGE).toMatch(/no recordings were stored.*session/i)
    expect(SESSION_VOICE_ANALYSIS_UNAVAILABLE_MESSAGE).toMatch(/pronunciation/i)
  })
})
