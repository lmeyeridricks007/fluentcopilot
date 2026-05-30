/**
 * Dev-only seeded data for testing the word-by-word pronunciation breakdown.
 * Import from dev tools or storybook — never from production code.
 */

import type { WordAssessment, PhraseGroup } from '../WordByWordBreakdown'

// ─── Turn 1: Strong A2 — "Goedemiddag, is de trein naar Amsterdam op tijd?" ──

export const STRONG_TURN_WORDS: WordAssessment[] = [
  { word: 'Goedemiddag', score: 92, startMs: 120, endMs: 650 },
  { word: 'is', score: 95, startMs: 700, endMs: 820 },
  { word: 'de', score: 91, startMs: 840, endMs: 920 },
  { word: 'trein', score: 88, startMs: 940, endMs: 1200 },
  { word: 'naar', score: 93, startMs: 1240, endMs: 1400 },
  { word: 'Amsterdam', score: 90, startMs: 1440, endMs: 1900 },
  { word: 'op', score: 94, startMs: 1950, endMs: 2060 },
  { word: 'tijd', score: 91, startMs: 2080, endMs: 2320 },
]

export const STRONG_TURN_PHRASES: PhraseGroup[] = [
  { words: ['Goedemiddag'], startIndex: 0, endIndex: 0 },
  { words: ['is', 'de', 'trein'], startIndex: 1, endIndex: 3 },
  { words: ['naar', 'Amsterdam'], startIndex: 4, endIndex: 5 },
  { words: ['op', 'tijd'], startIndex: 6, endIndex: 7 },
]

export const STRONG_TURN_TRANSCRIPT = 'Goedemiddag, is de trein naar Amsterdam op tijd?'

// ─── Turn 2: Weak pronunciation — "Goedemiddag" + "Amsterdam" problematic ──

export const WEAK_PRON_WORDS: WordAssessment[] = [
  {
    word: 'Goedemiddag',
    score: 42,
    startMs: 100,
    endMs: 680,
    issue: "Opening vowel 'oe' was too short — sounded closer to English 'good' than Dutch 'goe'.",
    fix: "Hold the 'oe' vowel longer: goooo-de-mid-dag. Listen to the reference and echo slowly.",
  },
  { word: 'is', score: 88, startMs: 740, endMs: 860 },
  { word: 'de', score: 85, startMs: 880, endMs: 960 },
  { word: 'trein', score: 78, startMs: 980, endMs: 1260 },
  { word: 'naar', score: 82, startMs: 1300, endMs: 1460 },
  {
    word: 'Amsterdam',
    score: 48,
    startMs: 1500,
    endMs: 2050,
    issue: "Stress drifted toward the final syllable. Dutch stresses 'Am' — not 'dam'.",
    fix: "Say 'AM-ster-dam' with a strong downbeat on 'AM'. The ending should fade, not punch.",
  },
  { word: 'op', score: 90, startMs: 2100, endMs: 2210 },
  { word: 'tijd', score: 72, startMs: 2240, endMs: 2480 },
]

export const WEAK_PRON_PHRASES: PhraseGroup[] = [
  {
    words: ['Goedemiddag'],
    startIndex: 0,
    endIndex: 0,
    issue: "The greeting was recognizable but vowel length was off — 'oe' needs to be longer.",
    fix: "Practice 'goedemiddag' as four even syllables: goe-de-mid-dag.",
  },
  { words: ['is', 'de', 'trein'], startIndex: 1, endIndex: 3 },
  {
    words: ['naar', 'Amsterdam'],
    startIndex: 4,
    endIndex: 5,
    issue: 'Stress on Amsterdam was reversed — the linking phrase sounded rushed.',
    fix: "Slow down before 'Amsterdam' and land on the first syllable.",
  },
  { words: ['op', 'tijd'], startIndex: 6, endIndex: 7 },
]

export const WEAK_PRON_FLUENCY_ISSUES = [
  {
    segment: 'naar Amsterdam',
    issue: 'Long pause (480 ms) between "naar" and "Amsterdam" — breaks the phrase group.',
    fix: 'Link "naar Amsterdam" as one breath group with no gap.',
    pauseMs: 480,
    afterWordIndex: 4,
  },
]

export const WEAK_PRON_TRANSCRIPT = 'Goedemiddag, is de trein naar Amsterdam op tijd?'

// ─── Turn 3: Phrase-rhythm issues — natural wording but choppy delivery ──

export const RHYTHM_TURN_WORDS: WordAssessment[] = [
  { word: 'Ik', score: 90, startMs: 50, endMs: 150 },
  { word: 'wil', score: 87, startMs: 180, endMs: 320 },
  { word: 'graag', score: 85, startMs: 360, endMs: 560 },
  { word: 'een', score: 92, startMs: 600, endMs: 700 },
  { word: 'enkele', score: 76, startMs: 740, endMs: 1000 },
  { word: 'reis', score: 82, startMs: 1050, endMs: 1240 },
  { word: 'naar', score: 88, startMs: 1300, endMs: 1440 },
  { word: 'Den', score: 83, startMs: 1480, endMs: 1580 },
  { word: 'Haag', score: 80, startMs: 1620, endMs: 1820 },
]

export const RHYTHM_TURN_PHRASES: PhraseGroup[] = [
  {
    words: ['Ik', 'wil', 'graag'],
    startIndex: 0,
    endIndex: 2,
    issue: 'Broken chunking: each word got its own beat. Dutch speakers group "ik wil graag" as one fast unit.',
    fix: 'Say "ikwilgraag" almost as one word — the stress falls only on "graag".',
  },
  {
    words: ['een', 'enkele', 'reis'],
    startIndex: 3,
    endIndex: 5,
    issue: 'The pause between "enkele" and "reis" was too long — breaks the noun phrase.',
    fix: 'Link "enkele reis" with no pause — it is one concept, like "one-way ticket".',
  },
  {
    words: ['naar', 'Den', 'Haag'],
    startIndex: 6,
    endIndex: 8,
    issue: 'Rushed ending — "Den Haag" was compressed and the final consonant was dropped.',
    fix: 'Give "Den Haag" its own mini-phrase. Let the "g" at the end ring.',
  },
]

export const RHYTHM_FLUENCY_ISSUES = [
  {
    segment: 'ik wil graag',
    issue: 'Choppy delivery — each word was separated instead of grouped.',
    fix: 'Practice saying "ikwilgraag" as one breath.',
    pauseMs: null,
    afterWordIndex: 2,
  },
  {
    segment: 'enkele reis',
    issue: '320 ms pause inside the noun phrase "enkele reis".',
    fix: 'Link the words: "enkele reis" should flow without a gap.',
    pauseMs: 320,
    afterWordIndex: 4,
  },
]

export const RHYTHM_TRANSCRIPT = 'Ik wil graag een enkele reis naar Den Haag.'

// ─── Turn 4: No audio — transcript only ──

export const NO_AUDIO_WORDS: WordAssessment[] = []
export const NO_AUDIO_TRANSCRIPT = 'Kunt u mij helpen met de kaartautomaat?'

// ─── All turns bundled for dev testing ──

export const SAMPLE_PRONUNCIATION_TURNS = [
  {
    id: 'dev-strong-01',
    label: 'Strong A2 turn — all words clear',
    transcript: STRONG_TURN_TRANSCRIPT,
    wordAssessments: STRONG_TURN_WORDS,
    phraseGroups: STRONG_TURN_PHRASES,
    fluencyIssues: [],
    hasAudio: true,
    alignmentQuality: 'full' as const,
  },
  {
    id: 'dev-weak-pron-02',
    label: 'Weak pronunciation — "goedemiddag" + "Amsterdam"',
    transcript: WEAK_PRON_TRANSCRIPT,
    wordAssessments: WEAK_PRON_WORDS,
    phraseGroups: WEAK_PRON_PHRASES,
    fluencyIssues: WEAK_PRON_FLUENCY_ISSUES,
    hasAudio: true,
    alignmentQuality: 'full' as const,
  },
  {
    id: 'dev-rhythm-03',
    label: 'Phrase rhythm issues — good words, choppy delivery',
    transcript: RHYTHM_TRANSCRIPT,
    wordAssessments: RHYTHM_TURN_WORDS,
    phraseGroups: RHYTHM_TURN_PHRASES,
    fluencyIssues: RHYTHM_FLUENCY_ISSUES,
    hasAudio: true,
    alignmentQuality: 'full' as const,
  },
  {
    id: 'dev-no-audio-04',
    label: 'No audio — transcript only',
    transcript: NO_AUDIO_TRANSCRIPT,
    wordAssessments: NO_AUDIO_WORDS,
    phraseGroups: [],
    fluencyIssues: [],
    hasAudio: false,
    alignmentQuality: 'none' as const,
  },
] as const
