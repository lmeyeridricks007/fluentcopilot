import { describe, expect, it } from 'vitest'
import {
  extractImplicitRecastPair,
  extractImplicitRecastPairsFromTranscript,
} from './languageCoachImplicitRecastPairs'
import type { ConversationMessage } from '../../models/contracts'

function msg(sender: 'user' | 'assistant', content: string, i = 0): ConversationMessage {
  return {
    id: `m-${i}`,
    threadId: 't-1',
    sender,
    messageType: 'text',
    content,
    createdAt: new Date(2026, 4, 16, 21, 0, i).toISOString(),
    metadata: null,
  } as unknown as ConversationMessage
}

describe('extractImplicitRecastPair — gating', () => {
  it('returns null when learner text has no detectable slip AND coach reply has no recast evidence', () => {
    const pair = extractImplicitRecastPair(
      'Ja, dat klopt.',
      'Mooi! En wat wil je vandaag oefenen?',
    )
    expect(pair).toBeNull()
  })

  it('returns null when learner or coach text is empty / too short', () => {
    expect(extractImplicitRecastPair('', 'iets')).toBeNull()
    expect(extractImplicitRecastPair('hi', 'Mooi, dus jij bent gisteren gegaan.')).toBeNull()
  })

  it('returns null when the coach clause is a verbatim echo (no material token change)', () => {
    /** Coach text mirrors the learner; should NOT pair (no real correction happened). */
    const pair = extractImplicitRecastPair(
      'Ik ben gisteren naar Amsterdam gegaan.',
      'Ik ben gisteren naar Amsterdam gegaan. Wat heb je daar gedaan?',
    )
    expect(pair).toBeNull()
  })
})

describe('extractImplicitRecastPair — perfectum recasts', () => {
  it('extracts pair when learner uses bare infinitive + past marker and coach recasts with perfectum', () => {
    /**
     * "Gisteren ik gaan" is a perfectum slip detected by the heuristic. The coach reply opens
     * with the corrected declarative ("dus gisteren ben je naar de winkel gegaan") before
     * pivoting to a follow-up question.
     */
    const pair = extractImplicitRecastPair(
      'Gisteren ik gaan naar de winkel.',
      'Ah, dus gisteren ben je naar de winkel gegaan? Wat heb je daar gekocht?',
    )
    expect(pair).not.toBeNull()
    expect(pair?.learnerish).toBe('Gisteren ik gaan naar de winkel.')
    expect(pair?.better.toLowerCase()).toContain('gegaan')
  })

  it('strips leading interjections from the coach clause ("Ah, dus …" → "dus …")', () => {
    const pair = extractImplicitRecastPair(
      'Ik heb gegaan naar de winkel.',
      'Oh, dus je bent naar de winkel gegaan. Leuk!',
    )
    expect(pair?.better.toLowerCase().startsWith('dus')).toBe(true)
  })

  it('pairs even when learner heuristic misses, as long as coach reply contains a perfectum participle', () => {
    /**
     * Pure recast gating path: the learner sentence is grammatically fine (no detectable
     * slip), but the coach reply still recasts. The function should fire because the coach
     * side carries strong recast evidence (perfectum participle).
     */
    const pair = extractImplicitRecastPair(
      'Ik werk in een restaurant.',
      'Dus jij hebt al lang in dat restaurant gewerkt? Wat doe je daar precies?',
    )
    expect(pair).not.toBeNull()
    expect(pair?.better.toLowerCase()).toContain('gewerkt')
  })
})

describe('extractImplicitRecastPair — clause boundary handling', () => {
  it('cuts the declarative at the first sentence terminator (?, !, .)', () => {
    const pair = extractImplicitRecastPair(
      'Ik gaan naar de markt.',
      'Dus je bent naar de markt gegaan. Heb je groente gekocht?',
    )
    expect(pair?.better).not.toContain('Heb je')
  })

  it('drops a new-thought question that shares a sentence with the recast', () => {
    const pair = extractImplicitRecastPair(
      'Ik gaan naar mijn moeder.',
      'Dus je bent naar je moeder gegaan, wat hebben jullie gedaan?',
    )
    expect(pair?.better.toLowerCase()).toContain('gegaan')
    expect(pair?.better.toLowerCase()).not.toContain('wat hebben jullie')
  })
})

describe('extractImplicitRecastPair — topical-acceptance guard', () => {
  it('returns null when the coach opens with positive agreement and has NO recast evidence', () => {
    /**
     * Real-world false positive: learner asks a clean Dutch question, coach replies with
     * "Goed, laten we X even pakken" — agreeing, not correcting. Must NOT pair.
     */
    const pair = extractImplicitRecastPair(
      'Kan ik perfectum leren, alsjeblieft?',
      'Goed, laten we perfectum even pakken. Wat wil je oefenen?',
    )
    expect(pair).toBeNull()
  })

  it('returns null for "Mooi, …" / "Prima, …" / "Leuk, …" openers without recast evidence', () => {
    const acks = [
      'Mooi, laten we beginnen. Wat wil je oefenen?',
      'Prima, dan starten we daarmee. Hoe begin je?',
      'Leuk, we gaan dat samen doen. Klaar?',
    ]
    for (const coach of acks) {
      expect(extractImplicitRecastPair('Ik wil grammatica oefenen.', coach)).toBeNull()
    }
  })

  it('still pairs when the coach opens with an acknowledgment BUT includes a perfectum participle (real recast)', () => {
    /**
     * "Goed, dus je bent gisteren naar de winkel gegaan" — the opener is positive but the
     * clause carries strong recast evidence (perfectum), so we should still surface it.
     */
    const pair = extractImplicitRecastPair(
      'Gisteren ik gaan naar de winkel.',
      'Goed, dus je bent gisteren naar de winkel gegaan. En wat heb je gekocht?',
    )
    expect(pair).not.toBeNull()
    expect(pair?.better.toLowerCase()).toContain('gegaan')
  })
})

describe('extractImplicitRecastPair — Dutch-shape guard', () => {
  it('returns null when the coach clause has no Dutch function words (likely English / not a Dutch recast)', () => {
    const pair = extractImplicitRecastPair(
      'Ik gaan naar de winkel.',
      'Let me try that one again in Dutch for you.',
    )
    expect(pair).toBeNull()
  })
})

describe('extractImplicitRecastPairsFromTranscript — full transcript walk', () => {
  it('walks user → assistant pairs in order, dedupes, and respects max', () => {
    const messages: ConversationMessage[] = [
      msg('user', 'Hoi!', 0),
      msg('assistant', 'Hoi! Hoe gaat het?', 1),
      msg('user', 'Gisteren ik gaan naar de winkel.', 2),
      msg('assistant', 'Dus gisteren ben je naar de winkel gegaan? Wat heb je gekocht?', 3),
      msg('user', 'Ik heb gegaan naar mijn moeder.', 4),
      msg('assistant', 'Oké, dus je bent naar je moeder gegaan. Was het gezellig?', 5),
      msg('user', 'Ja, het was leuk.', 6),
      msg('assistant', 'Wat fijn om te horen!', 7),
    ]
    const pairs = extractImplicitRecastPairsFromTranscript(messages, 6)
    expect(pairs.length).toBe(2)
    expect(pairs[0]?.learnerish).toContain('Gisteren ik gaan')
    expect(pairs[0]?.better.toLowerCase()).toContain('gegaan')
    expect(pairs[1]?.learnerish).toContain('mijn moeder')
    expect(pairs[1]?.better.toLowerCase()).toContain('gegaan')
  })

  it('returns empty array when no user→assistant pair contains a recast', () => {
    const messages: ConversationMessage[] = [
      msg('user', 'Ja!', 0),
      msg('assistant', 'Mooi!', 1),
      msg('user', 'Hoe gaat het met jou?', 2),
      msg('assistant', 'Met mij gaat het goed.', 3),
    ]
    expect(extractImplicitRecastPairsFromTranscript(messages, 6)).toEqual([])
  })

  it('does not pair assistant → user sequences (only forward direction matters)', () => {
    const messages: ConversationMessage[] = [
      msg('assistant', 'Dus je bent naar de winkel gegaan?', 0),
      msg('user', 'Ik gaan naar de winkel.', 1),
    ]
    expect(extractImplicitRecastPairsFromTranscript(messages, 6)).toEqual([])
  })

  it('caps to max even when more recasts are present', () => {
    const messages: ConversationMessage[] = [
      msg('user', 'Ik gaan naar de winkel.', 0),
      msg('assistant', 'Dus je bent naar de winkel gegaan? Mooi!', 1),
      msg('user', 'Ik gaan naar het park.', 2),
      msg('assistant', 'Dus je bent naar het park gegaan? Leuk!', 3),
      msg('user', 'Ik gaan naar mijn vader.', 4),
      msg('assistant', 'Dus je bent naar je vader gegaan. Hoe was het?', 5),
    ]
    const pairs = extractImplicitRecastPairsFromTranscript(messages, 2)
    expect(pairs.length).toBe(2)
  })
})
