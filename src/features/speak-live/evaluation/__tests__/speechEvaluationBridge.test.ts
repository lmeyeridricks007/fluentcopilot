import { describe, it, expect } from 'vitest'
import {
  detectTurnSignals,
  mapWordAssessments,
  mapPhraseGroups,
  extractTranscriptCoaching,
  extractAudioDimensions,
  resolveReferenceAudioForDrill,
  type BackendPronunciationIssue,
  type BackendFluencyIssue,
  type BackendPremiumTurnEvaluation,
} from '../speechEvaluationBridge'

// ─── Fixtures ───────────────────────────────────────────────────────────

const AZURE_PRON_ISSUES: BackendPronunciationIssue[] = [
  { word: 'Goedemiddag', score: 42, issue: "Opening vowel 'oe' too short", fix: 'Hold the oe longer', referenceAudioUrl: '/ref/1', startMs: 100, endMs: 600 },
  { word: 'is', score: 92, issue: '', fix: '', referenceAudioUrl: null },
  { word: 'de', score: 88, issue: '', fix: '', referenceAudioUrl: null },
  { word: 'trein', score: 78, issue: 'Vowel diphthong unclear', fix: 'Listen to reference', referenceAudioUrl: null },
  { word: 'Amsterdam', score: 48, issue: 'Stress on wrong syllable', fix: "Stress 'AM' not 'dam'", referenceAudioUrl: '/ref/1' },
]

const FLUENCY_ISSUES: BackendFluencyIssue[] = [
  { segment: 'trein naar', issue: '480ms pause between words', fix: 'Link as one breath', pauseMs: 480, afterWordIndex: 3 },
]

function makePremiumEv(overrides?: Partial<BackendPremiumTurnEvaluation>): BackendPremiumTurnEvaluation {
  return {
    turnId: 'turn-1',
    transcript: 'Goedemiddag, is de trein naar Amsterdam',
    audioUrl: '/audio/learner-1',
    dimensions: [
      { id: 'pronunciation', score: 62, band: { id: 'building', label: 'Building', shortLabel: 'Building' }, reliability: { level: 'high', reason: 'OK' }, source: 'azure_audio', evidenceSummary: '2 weak words', feedbackItems: [] },
      { id: 'fluency', score: 70, band: { id: 'building', label: 'Building', shortLabel: 'Building' }, reliability: { level: 'high', reason: 'OK' }, source: 'azure_audio', evidenceSummary: '1 hesitation', feedbackItems: [] },
      { id: 'rhythm', score: 55, band: { id: 'earlyStep', label: 'Early step', shortLabel: 'Early step' }, reliability: { level: 'medium', reason: 'OK' }, source: 'timing_analysis', evidenceSummary: 'Uneven', feedbackItems: [] },
      { id: 'wording', score: 72, band: { id: 'building', label: 'Building', shortLabel: 'Building' }, reliability: { level: 'medium', reason: 'LLM' }, source: 'llm_transcript', evidenceSummary: 'Nat 70, ctx 74', feedbackItems: [{ issue: 'Textbook phrasing', fix: 'More natural: "Hoi, rijdt de trein..."', whyItMatters: 'Sounds more native' }] },
      { id: 'grammar', score: 80, band: { id: 'strongEnough', label: 'Strong enough', shortLabel: 'Strong' }, reliability: { level: 'medium', reason: 'LLM' }, source: 'llm_transcript', evidenceSummary: '0 issues', feedbackItems: [] },
      { id: 'scenarioFit', score: 65, band: { id: 'building', label: 'Building', shortLabel: 'Building' }, reliability: { level: 'medium', reason: 'Matcher' }, source: 'scenario_matcher', evidenceSummary: 'Partially addressed', feedbackItems: [{ issue: "Didn't ask about platform", fix: 'Add: op welk perron?', whyItMatters: 'Completes the scenario goal' }] },
    ],
    composite: { overall: 67, band: { label: 'Building' } },
    reliability: { level: 'high', reason: 'Good audio' },
    headlineSummary: 'Building at A2',
    evidenceItems: [],
    recommendedDrills: [
      { dimension: 'pronunciation', type: 'isolated_word', title: 'Drill Goedemiddag', detail: 'Slow reps', targetText: 'Goedemiddag', referenceAudioUrl: '/ref/pron-1', priority: 'high' },
      { dimension: 'fluency', type: 'chunk_practice', title: 'Chunk drill', detail: 'Two chunks', referenceAudioUrl: '/ref/flu-1', priority: 'medium' },
    ],
    ...overrides,
  }
}

const NO_AUDIO_PREMIUM = makePremiumEv({
  audioUrl: null,
  dimensions: [
    { id: 'pronunciation', score: null, band: null, reliability: { level: 'low', reason: 'No audio' }, source: 'unavailable', evidenceSummary: 'No audio', feedbackItems: [] },
    { id: 'fluency', score: null, band: null, reliability: { level: 'low', reason: 'No audio' }, source: 'unavailable', evidenceSummary: 'No audio', feedbackItems: [] },
    { id: 'rhythm', score: null, band: null, reliability: { level: 'low', reason: 'No audio' }, source: 'unavailable', evidenceSummary: 'No audio', feedbackItems: [] },
    { id: 'wording', score: 72, band: { id: 'building', label: 'Building', shortLabel: 'Building' }, reliability: { level: 'medium', reason: 'LLM' }, source: 'llm_transcript', evidenceSummary: 'Transcript only', feedbackItems: [{ issue: 'Textbook phrasing', fix: 'Use more natural Dutch', whyItMatters: 'Sounds native' }] },
    { id: 'grammar', score: 80, band: { id: 'strongEnough', label: 'Strong enough', shortLabel: 'Strong' }, reliability: { level: 'medium', reason: 'LLM' }, source: 'llm_transcript', evidenceSummary: 'Good grammar', feedbackItems: [] },
    { id: 'scenarioFit', score: 65, band: { id: 'building', label: 'Building', shortLabel: 'Building' }, reliability: { level: 'medium', reason: 'Matcher' }, source: 'scenario_matcher', evidenceSummary: 'Partial', feedbackItems: [] },
  ],
})

// ─── detectTurnSignals ──────────────────────────────────────────────────

describe('detectTurnSignals', () => {
  it('detects full audio + word scores + fluency', () => {
    const s = detectTurnSignals({
      audioMetricsSource: 'azure_audio',
      pronunciationIssues: AZURE_PRON_ISSUES,
      fluencyIssues: FLUENCY_ISSUES,
      premiumEvaluation: makePremiumEv(),
    })
    expect(s.hasAudio).toBe(true)
    expect(s.hasAzureWordScores).toBe(true)
    expect(s.hasFluencyTimingData).toBe(true)
    expect(s.hasTranscriptCoaching).toBe(true)
    expect(s.hasScenarioFit).toBe(true)
    expect(s.alignmentQuality).toBe('full')
  })

  it('detects audio without word scores => partial alignment', () => {
    const s = detectTurnSignals({
      audioMetricsSource: 'azure_audio',
      pronunciationIssues: [],
      fluencyIssues: [],
      premiumEvaluation: makePremiumEv(),
    })
    expect(s.hasAudio).toBe(true)
    expect(s.hasAzureWordScores).toBe(false)
    expect(s.alignmentQuality).toBe('partial')
  })

  it('detects no audio => none alignment', () => {
    const s = detectTurnSignals({
      audioMetricsSource: 'unavailable',
      pronunciationIssues: [],
      fluencyIssues: [],
      premiumEvaluation: NO_AUDIO_PREMIUM,
    })
    expect(s.hasAudio).toBe(false)
    expect(s.hasAzureWordScores).toBe(false)
    expect(s.hasFluencyTimingData).toBe(false)
    expect(s.alignmentQuality).toBe('none')
    expect(s.hasTranscriptCoaching).toBe(true)
  })

  it('returns no transcript coaching when premium eval is null', () => {
    const s = detectTurnSignals({
      audioMetricsSource: 'azure_audio',
      pronunciationIssues: AZURE_PRON_ISSUES,
      fluencyIssues: [],
      premiumEvaluation: null,
    })
    expect(s.hasTranscriptCoaching).toBe(false)
    expect(s.hasScenarioFit).toBe(false)
  })
})

// ─── mapWordAssessments ─────────────────────────────────────────────────

describe('mapWordAssessments', () => {
  it('maps Azure pronunciation issues to word assessments', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'azure_audio',
      pronunciationIssues: AZURE_PRON_ISSUES,
      fluencyIssues: [],
      premiumEvaluation: null,
    })
    const words = mapWordAssessments(AZURE_PRON_ISSUES, signals)
    expect(words).toHaveLength(5)
    expect(words[0].word).toBe('Goedemiddag')
    expect(words[0].score).toBe(42)
    expect(words[0].issue).toBe("Opening vowel 'oe' too short")
    expect(words[0].startMs).toBe(100)
    expect(words[4].word).toBe('Amsterdam')
    expect(words[4].score).toBe(48)
  })

  it('returns EMPTY when no audio (never fabricates scores)', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'unavailable',
      pronunciationIssues: [],
      fluencyIssues: [],
      premiumEvaluation: null,
    })
    const words = mapWordAssessments([], signals)
    expect(words).toHaveLength(0)
  })

  it('returns EMPTY when audio exists but no Azure word scores', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'azure_audio',
      pronunciationIssues: [],
      fluencyIssues: [],
      premiumEvaluation: null,
    })
    const words = mapWordAssessments([], signals)
    expect(words).toHaveLength(0)
  })

  it('strips empty issue/fix to undefined', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'azure_audio',
      pronunciationIssues: AZURE_PRON_ISSUES,
      fluencyIssues: [],
      premiumEvaluation: null,
    })
    const words = mapWordAssessments(AZURE_PRON_ISSUES, signals)
    expect(words[1].issue).toBeUndefined()
    expect(words[1].fix).toBeUndefined()
  })
})

// ─── mapPhraseGroups ────────────────────────────────────────────────────

describe('mapPhraseGroups', () => {
  it('creates phrase groups from fluency issues', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'azure_audio',
      pronunciationIssues: AZURE_PRON_ISSUES,
      fluencyIssues: FLUENCY_ISSUES,
      premiumEvaluation: null,
    })
    const words = mapWordAssessments(AZURE_PRON_ISSUES, signals)
    const groups = mapPhraseGroups(FLUENCY_ISSUES, words, signals)

    expect(groups.length).toBeGreaterThanOrEqual(2)
    const issueGroup = groups.find((g) => g.issue)
    expect(issueGroup).toBeDefined()
    expect(issueGroup!.pauseMs).toBe(480)
  })

  it('returns single group when no fluency issues', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'azure_audio',
      pronunciationIssues: AZURE_PRON_ISSUES,
      fluencyIssues: [],
      premiumEvaluation: null,
    })
    const words = mapWordAssessments(AZURE_PRON_ISSUES, signals)
    const groups = mapPhraseGroups([], words, signals)
    expect(groups).toHaveLength(1)
    expect(groups[0].words).toHaveLength(5)
    expect(groups[0].issue).toBeUndefined()
  })

  it('returns EMPTY when no audio', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'unavailable',
      pronunciationIssues: [],
      fluencyIssues: [],
      premiumEvaluation: null,
    })
    const groups = mapPhraseGroups([], [], signals)
    expect(groups).toHaveLength(0)
  })

  it('returns EMPTY when no word assessments', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'azure_audio',
      pronunciationIssues: [],
      fluencyIssues: FLUENCY_ISSUES,
      premiumEvaluation: null,
    })
    const groups = mapPhraseGroups(FLUENCY_ISSUES, [], signals)
    expect(groups).toHaveLength(0)
  })
})

// ─── extractTranscriptCoaching ──────────────────────────────────────────

describe('extractTranscriptCoaching', () => {
  it('extracts wording + grammar + scenarioFit from premium eval', () => {
    const coaching = extractTranscriptCoaching(makePremiumEv())
    expect(coaching.wording).not.toBeNull()
    expect(coaching.wording!.score).toBe(72)
    expect(coaching.wording!.bandLabel).toBe('Building')
    expect(coaching.wording!.feedbackItems).toHaveLength(1)
    expect(coaching.wording!.feedbackItems[0].issue).toBe('Textbook phrasing')

    expect(coaching.grammar).not.toBeNull()
    expect(coaching.grammar!.score).toBe(80)
    expect(coaching.grammar!.bandLabel).toBe('Strong')

    expect(coaching.scenarioFit).not.toBeNull()
    expect(coaching.scenarioFit!.score).toBe(65)
    expect(coaching.scenarioFit!.feedbackItems).toHaveLength(1)
  })

  it('returns all nulls when premium eval is null', () => {
    const coaching = extractTranscriptCoaching(null)
    expect(coaching.wording).toBeNull()
    expect(coaching.grammar).toBeNull()
    expect(coaching.scenarioFit).toBeNull()
  })

  it('returns null for dimensions with null scores (no-audio audio dims)', () => {
    const coaching = extractTranscriptCoaching(NO_AUDIO_PREMIUM)
    expect(coaching.wording).not.toBeNull()
    expect(coaching.grammar).not.toBeNull()
    expect(coaching.scenarioFit).not.toBeNull()
  })
})

// ─── extractAudioDimensions ─────────────────────────────────────────────

describe('extractAudioDimensions', () => {
  it('extracts audio dimension summaries', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'azure_audio',
      pronunciationIssues: AZURE_PRON_ISSUES,
      fluencyIssues: [],
      premiumEvaluation: makePremiumEv(),
    })
    const dims = extractAudioDimensions(makePremiumEv(), signals)
    expect(dims.pronunciation).not.toBeNull()
    expect(dims.pronunciation!.score).toBe(62)
    expect(dims.fluency).not.toBeNull()
    expect(dims.rhythm).not.toBeNull()
  })

  it('returns all nulls when no audio', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'unavailable',
      pronunciationIssues: [],
      fluencyIssues: [],
      premiumEvaluation: NO_AUDIO_PREMIUM,
    })
    const dims = extractAudioDimensions(NO_AUDIO_PREMIUM, signals)
    expect(dims.pronunciation).toBeNull()
    expect(dims.fluency).toBeNull()
    expect(dims.rhythm).toBeNull()
  })

  it('returns all nulls when premium eval is null', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'azure_audio',
      pronunciationIssues: [],
      fluencyIssues: [],
      premiumEvaluation: null,
    })
    const dims = extractAudioDimensions(null, signals)
    expect(dims.pronunciation).toBeNull()
  })
})

// ─── resolveReferenceAudioForDrill ──────────────────────────────────────

describe('resolveReferenceAudioForDrill', () => {
  it('uses drill-specific reference audio when available', () => {
    const url = resolveReferenceAudioForDrill(makePremiumEv(), '/turn/ref', 'pronunciation')
    expect(url).toBe('/ref/pron-1')
  })

  it('falls back to turn reference when no drill has reference', () => {
    const url = resolveReferenceAudioForDrill(makePremiumEv(), '/turn/ref', 'rhythm')
    expect(url).toBe('/turn/ref')
  })

  it('falls back to turn reference when premium eval is null', () => {
    const url = resolveReferenceAudioForDrill(null, '/turn/ref', 'pronunciation')
    expect(url).toBe('/turn/ref')
  })

  it('returns null when nothing available', () => {
    const url = resolveReferenceAudioForDrill(null, null, 'pronunciation')
    expect(url).toBeNull()
  })
})

// ─── Integration: full flow guards ──────────────────────────────────────

describe('integration: signal-driven UI guards', () => {
  it('audio + word scores → full pronunciation UI', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'azure_audio',
      pronunciationIssues: AZURE_PRON_ISSUES,
      fluencyIssues: FLUENCY_ISSUES,
      premiumEvaluation: makePremiumEv(),
    })
    const words = mapWordAssessments(AZURE_PRON_ISSUES, signals)
    const phrases = mapPhraseGroups(FLUENCY_ISSUES, words, signals)
    const coaching = extractTranscriptCoaching(makePremiumEv())

    expect(signals.hasAudio).toBe(true)
    expect(signals.alignmentQuality).toBe('full')
    expect(words.length).toBeGreaterThan(0)
    expect(phrases.length).toBeGreaterThan(0)
    expect(coaching.wording).not.toBeNull()
  })

  it('audio + no word scores → phrase-only fallback', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'azure_audio',
      pronunciationIssues: [],
      fluencyIssues: [],
      premiumEvaluation: makePremiumEv(),
    })
    const words = mapWordAssessments([], signals)
    const phrases = mapPhraseGroups([], words, signals)

    expect(signals.hasAudio).toBe(true)
    expect(signals.alignmentQuality).toBe('partial')
    expect(words).toHaveLength(0)
    expect(phrases).toHaveLength(0)
  })

  it('no audio → NO pronunciation UI, transcript coaching only', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'unavailable',
      pronunciationIssues: [],
      fluencyIssues: [],
      premiumEvaluation: NO_AUDIO_PREMIUM,
    })
    const words = mapWordAssessments([], signals)
    const phrases = mapPhraseGroups([], words, signals)
    const coaching = extractTranscriptCoaching(NO_AUDIO_PREMIUM)

    expect(signals.hasAudio).toBe(false)
    expect(words).toHaveLength(0)
    expect(phrases).toHaveLength(0)
    expect(coaching.wording).not.toBeNull()
    expect(coaching.grammar).not.toBeNull()
  })

  it('no premium eval → no coaching sections, but pronunciation can still work', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'azure_audio',
      pronunciationIssues: AZURE_PRON_ISSUES,
      fluencyIssues: [],
      premiumEvaluation: null,
    })
    const words = mapWordAssessments(AZURE_PRON_ISSUES, signals)
    const coaching = extractTranscriptCoaching(null)

    expect(words.length).toBeGreaterThan(0)
    expect(coaching.wording).toBeNull()
    expect(coaching.grammar).toBeNull()
    expect(coaching.scenarioFit).toBeNull()
  })

  it('never fabricates word scores from transcript when Azure data is absent', () => {
    const signals = detectTurnSignals({
      audioMetricsSource: 'azure_audio',
      pronunciationIssues: [],
      fluencyIssues: [],
      premiumEvaluation: makePremiumEv(),
    })
    const words = mapWordAssessments([], signals)
    expect(words).toHaveLength(0)
  })
})
