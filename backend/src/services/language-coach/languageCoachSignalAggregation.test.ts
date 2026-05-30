import { describe, expect, it } from 'vitest'
import { aggregateLanguageCoachWeaknessSignals } from './languageCoachSignalAggregation'
import type { ConversationMessage } from '../../models/contracts'
import type {
  LanguageCoachNudgeEvent,
  LanguageCoachPersistedBlob,
} from '../../domain/speakLive/languageCoachSessionTypes'

function blob(overrides: Partial<LanguageCoachPersistedBlob> = {}): LanguageCoachPersistedBlob {
  return {
    conversationGoal: 'general',
    feedbackStyle: 'subtle_and_end',
    coachStyle: 'balanced',
    personaStyle: 'coach',
    conversationRole: 'coach',
    coachGuideWhileSpeaking: false,
    learnerFactLinesEnglish: [],
    weaknessHits: {},
    coachTurnIndex: 0,
    sessionFocusChip: null,
    learnerPinnedLessonFocusEnglish: null,
    nudgeEvents: [],
    pendingNudgePlan: null,
    lastNudgeCoachTurnIndex: -1,
    sessionSignals: {},
    topicsTokensMentioned: [],
    recentCoachLeadIns: [],
    vocabStemHits: {},
    ...overrides,
  }
}

function msg(
  sender: 'user' | 'assistant',
  content: string,
  i = 0,
): ConversationMessage {
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

function nudge(detectedIssueTypes: LanguageCoachNudgeEvent['detectedIssueTypes']): LanguageCoachNudgeEvent {
  return {
    nudgeType: 'RECAST',
    learnerOriginal: 'whatever',
    coachResponse: 'whatever',
    detectedIssueTypes,
    severity: 'minor',
    learnerRecoveredLater: null,
    coachTurnIndex: 1,
    createdAt: '2026-05-16T21:00:00Z',
  }
}

describe('aggregateLanguageCoachWeaknessSignals — coach reply mining (the perfectum case)', () => {
  it('surfaces past_tense when coach replies repeatedly use Dutch perfectum participles, even with empty live heuristics', () => {
    const messages: ConversationMessage[] = [
      msg('user', 'Gisteren ik gaan naar de winkel.', 0),
      msg('assistant', 'Ah, dus gisteren ben je naar de winkel gegaan? Wat heb je daar gekocht?', 1),
      msg('user', 'Ik kopen brood en kaas.', 2),
      msg('assistant', 'Lekker! Je hebt brood en kaas gekocht. Heb je ook iets te drinken meegenomen?', 3),
      msg('user', 'Ja, ik drinken cola.', 4),
      msg('assistant', 'Oké, dus je hebt cola gedronken. Was het lekker?', 5),
    ]
    const out = aggregateLanguageCoachWeaknessSignals({
      lc: blob({ weaknessHits: {} }),
      messages,
      rollingSummaryEnglish: null,
    })
    expect(out.weaknessHits.past_tense).toBeGreaterThan(0)
    expect(out.signalSources.past_tense).toContain('coach_reply_scan')
  })

  it('does NOT surface past_tense when only ONE coach reply contains a single past-tense form (incidental usage)', () => {
    const messages: ConversationMessage[] = [
      msg('user', 'Wat vond je leuk vandaag?', 0),
      msg('assistant', 'Ik heb een mooie wandeling gehad in het park. En jij, wat doe je vandaag?', 1),
      msg('user', 'Ik werk op kantoor.', 2),
      msg('assistant', 'Leuk! Wat doe je daar precies?', 3),
    ]
    const out = aggregateLanguageCoachWeaknessSignals({
      lc: blob({ weaknessHits: {} }),
      messages,
      rollingSummaryEnglish: null,
    })
    expect(out.weaknessHits.past_tense ?? 0).toBe(0)
  })

  it('surfaces past_tense from explicit Dutch teaching markers in coach replies ("verleden tijd")', () => {
    const messages: ConversationMessage[] = [
      msg('user', 'Ik niet weet hoe te zeggen.', 0),
      msg('assistant', 'Geen zorgen! Voor de verleden tijd gebruik je vaak "heb" of "ben" plus het voltooid deelwoord.', 1),
    ]
    const out = aggregateLanguageCoachWeaknessSignals({
      lc: blob({ weaknessHits: {} }),
      messages,
      rollingSummaryEnglish: null,
    })
    expect(out.weaknessHits.past_tense).toBeGreaterThan(0)
    expect(out.signalSources.past_tense).toContain('coach_reply_scan')
  })

  it('surfaces word_order from explicit Dutch teaching markers ("woordvolgorde")', () => {
    const messages: ConversationMessage[] = [
      msg('user', 'Ik weet niet waarom dit zo.', 0),
      msg('assistant', 'In een bijzin gaat de woordvolgorde anders: het werkwoord komt aan het einde.', 1),
    ]
    const out = aggregateLanguageCoachWeaknessSignals({
      lc: blob({}),
      messages,
      rollingSummaryEnglish: null,
    })
    expect(out.weaknessHits.word_order).toBeGreaterThan(0)
  })

  it('surfaces article weakness from "de/het" coaching markers', () => {
    const messages: ConversationMessage[] = [
      msg('user', 'Ik koop de boek.', 0),
      msg('assistant', 'Bijna! Het is "het boek", niet "de boek". Het lidwoord "het" gebruik je bij sommige woorden.', 1),
    ]
    const out = aggregateLanguageCoachWeaknessSignals({
      lc: blob({}),
      messages,
      rollingSummaryEnglish: null,
    })
    expect(out.weaknessHits.article).toBeGreaterThan(0)
  })
})

describe('aggregateLanguageCoachWeaknessSignals — rollingSummaryEnglish mining', () => {
  it('surfaces past_tense from rolling summary phrases ("past tense", "wrong auxiliary")', () => {
    const out = aggregateLanguageCoachWeaknessSignals({
      lc: blob({ weaknessHits: {} }),
      messages: [msg('user', 'Iets', 0)],
      rollingSummaryEnglish:
        'Learner is practising the past tense. Recasted "ik heb gegaan" (wrong auxiliary) to "ik ben gegaan".',
    })
    expect(out.weaknessHits.past_tense).toBeGreaterThan(0)
    expect(out.signalSources.past_tense).toContain('rolling_summary_scan')
  })

  it('surfaces word_order from "subordinate clause word order" mention', () => {
    const out = aggregateLanguageCoachWeaknessSignals({
      lc: blob({}),
      messages: [],
      rollingSummaryEnglish: 'Coach gave a recast on subordinate clause word order.',
    })
    expect(out.weaknessHits.word_order).toBeGreaterThan(0)
  })

  it('ignores empty/whitespace rolling summary', () => {
    const out = aggregateLanguageCoachWeaknessSignals({
      lc: blob({}),
      messages: [],
      rollingSummaryEnglish: '   \n  ',
    })
    expect(Object.keys(out.weaknessHits)).toEqual([])
  })
})

describe('aggregateLanguageCoachWeaknessSignals — nudgeEvents source', () => {
  it('maps nudgeEvent detectedIssueTypes to weaknessHits (tense_issue → past_tense)', () => {
    const out = aggregateLanguageCoachWeaknessSignals({
      lc: blob({ nudgeEvents: [nudge(['tense_issue']), nudge(['tense_issue', 'word_order_issue'])] }),
      messages: [],
      rollingSummaryEnglish: null,
    })
    expect(out.weaknessHits.past_tense).toBeGreaterThanOrEqual(2)
    expect(out.weaknessHits.word_order).toBeGreaterThanOrEqual(1)
    expect(out.signalSources.past_tense).toContain('nudge_events')
  })
})

describe('aggregateLanguageCoachWeaknessSignals — multi-source union', () => {
  it('unions live + coach-reply + rolling-summary signals into a single weaknessHits map', () => {
    const out = aggregateLanguageCoachWeaknessSignals({
      lc: blob({ weaknessHits: { follow_up_gap: 2 } }),
      messages: [
        msg('user', 'Gisteren ik werk hard.', 0),
        msg('assistant', 'Ah, dus gisteren heb je hard gewerkt. Wat deed je precies?', 1),
        msg('user', 'Ik schrijven email.', 2),
        msg('assistant', 'Heb je veel emails geschreven? Met wie heb je gemaild?', 3),
        msg('user', 'Met mijn baas.', 4),
        msg('assistant', 'Spannend! Je hebt met je baas gemaild. Wat heeft hij gezegd?', 5),
      ],
      rollingSummaryEnglish: 'Learner needs work on past tense; recasted hebben/zijn confusion.',
    })
    expect(out.weaknessHits.past_tense).toBeGreaterThan(0)
    expect(out.weaknessHits.follow_up_gap).toBeGreaterThan(0)
    const pastSources = out.signalSources.past_tense ?? []
    expect(pastSources.length).toBeGreaterThanOrEqual(2)
  })

  it('per-source cap prevents one noisy source from dominating', () => {
    const messages: ConversationMessage[] = []
    for (let i = 0; i < 30; i += 1) {
      messages.push(msg('assistant', 'Ja, ik heb gewerkt, gegeten, gedronken en gezien.', i))
    }
    const out = aggregateLanguageCoachWeaknessSignals({
      lc: blob({}),
      messages,
      rollingSummaryEnglish: null,
    })
    expect(out.weaknessHits.past_tense).toBeLessThanOrEqual(6)
  })
})

describe('aggregateLanguageCoachWeaknessSignals — cold-start / no signal', () => {
  it('returns an empty weaknessHits map when there is no signal anywhere', () => {
    const out = aggregateLanguageCoachWeaknessSignals({
      lc: blob({}),
      messages: [
        msg('user', 'Hoi, hoe gaat het met je?', 0),
        msg('assistant', 'Goed, dank je! En met jou?', 1),
      ],
      rollingSummaryEnglish: null,
    })
    expect(Object.keys(out.weaknessHits)).toEqual([])
  })

  it('handles a null lc safely', () => {
    const out = aggregateLanguageCoachWeaknessSignals({
      lc: null,
      messages: [],
      rollingSummaryEnglish: null,
    })
    expect(Object.keys(out.weaknessHits)).toEqual([])
  })
})
