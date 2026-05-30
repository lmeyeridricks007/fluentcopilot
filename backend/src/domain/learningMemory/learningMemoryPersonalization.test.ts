import { describe, expect, it } from 'vitest'
import { UX_COLD_BEST_NEXT_STEP, UX_COLD_START_MESSAGE } from './conversationMemoryUxCopy'
import { buildLearningPersonalizationForTurn } from './learningPersonalizationBuilders'
import {
  buildPracticeRecommendations,
  buildReportPersonalizationRibbon,
  computeBalancedActiveFocusAreas,
  extractReadAloudWeakHintsForRibbon,
  topWeaknessLabels,
} from './learningMemoryRecommendationService'
import { resolveReadAloudPassagePersonalization } from './readAloudPersonalizationFromProfile'
import { createEmptyUserLearningProfile } from './userLearningProfileDocument'
import { LOW_CONFIDENCE_FOCUS_FLOOR } from './learningMemoryMergeScoring'

describe('topWeaknessLabels & buildPracticeRecommendations', () => {
  it('excludes vocabulary below LOW_CONFIDENCE_FOCUS_FLOOR from top weakness labels', () => {
    const doc = createEmptyUserLearningProfile('u1')
    doc.totalSessionsObserved = 5
    doc.weakVocabulary.push({
      normalizedKey: 'low',
      displayText: 'low',
      category: 'x',
      severityScore: 2,
      confidence: LOW_CONFIDENCE_FOCUS_FLOOR - 0.05,
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      lastSeenAt: '2026-01-02T00:00:00.000Z',
      occurrences: 9,
      scenarioIds: [],
      evidenceRefs: [],
      recoveryScore: 0.2,
    })
    doc.weakVocabulary.push({
      normalizedKey: 'high',
      displayText: 'high',
      category: 'x',
      severityScore: 1.5,
      confidence: 0.55,
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      lastSeenAt: '2026-01-02T00:00:00.000Z',
      occurrences: 2,
      scenarioIds: [],
      evidenceRefs: [],
      recoveryScore: 0.22,
    })
    const labels = topWeaknessLabels(doc, 10)
    expect(labels.some((l) => /low/i.test(l))).toBe(false)
    expect(labels.some((l) => /high/i.test(l))).toBe(true)
  })

  it('omits (unknown) from pronunciation weakness labels used in focus chips', () => {
    const doc = createEmptyUserLearningProfile('u-pron')
    doc.totalSessionsObserved = 6
    doc.pronunciationIssues.push({
      targetKey: 'lang',
      issueType: 'unknown',
      severityScore: 1.2,
      confidence: 0.55,
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      lastSeenAt: '2026-01-02T00:00:00.000Z',
      occurrences: 3,
      scenarioIds: [],
      evidenceRefs: [],
      recoveryScore: 0.3,
    })
    doc.weakVocabulary.push({
      normalizedKey: 'kaartje',
      displayText: 'kaartje',
      category: 'travel',
      severityScore: 1.1,
      confidence: 0.56,
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      lastSeenAt: '2026-01-02T00:00:00.000Z',
      occurrences: 4,
      scenarioIds: [],
      evidenceRefs: [],
      recoveryScore: 0.28,
    })
    const labels = topWeaknessLabels(doc, 6)
    expect(labels.join(' ')).not.toMatch(/\(unknown\)/i)
    expect(labels.some((l) => /lang/i.test(l) && !/\(unknown\)/i.test(l))).toBe(true)

    const areas = computeBalancedActiveFocusAreas(doc, 3)
    expect(areas.join(' ')).not.toMatch(/\(unknown\)/i)
  })

  it('cold start recommendations flag coldStart and avoid implying long history', () => {
    const doc = createEmptyUserLearningProfile('u-new')
    doc.totalSessionsObserved = 1
    const rec = buildPracticeRecommendations(doc)
    expect(rec.coldStart).toBe(true)
    expect(rec.workingOnChip || rec.bestNextStep).toBeTruthy()
    expect(rec.bestNextStep).toBe(UX_COLD_BEST_NEXT_STEP)
    expect(rec.coldStartMessage).toBe(UX_COLD_START_MESSAGE)
  })
})

describe('buildReportPersonalizationRibbon', () => {
  it('new user: cold ribbon — no structured surfaces, gentle line only', () => {
    const doc = createEmptyUserLearningProfile('u-cold')
    doc.totalSessionsObserved = 1
    const ribbon = buildReportPersonalizationRibbon({ doc, sessionWeakHints: ['focus: articles'] })
    expect(ribbon.coldStart).toBe(true)
    expect(ribbon.surfaces).toBeNull()
    expect(ribbon.lines.length).toBeGreaterThan(0)
    expect(ribbon.basedOnRecentSessions).toBe(false)
  })

  it('warm user: surfaces session echo when hints provided', () => {
    const doc = createEmptyUserLearningProfile('u-warm')
    doc.totalSessionsObserved = 6
    doc.weakVocabulary.push({
      normalizedKey: 'ui',
      displayText: 'ui',
      category: 'vowel',
      severityScore: 2,
      confidence: 0.55,
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      lastSeenAt: '2026-01-02T00:00:00.000Z',
      occurrences: 3,
      scenarioIds: [],
      evidenceRefs: [],
      recoveryScore: 0.25,
    })
    void buildPracticeRecommendations(doc)
    const ribbon = buildReportPersonalizationRibbon({
      doc,
      sessionWeakHints: ['Question forms', 'grammar: word order'],
    })
    expect(ribbon.coldStart).toBe(false)
    expect(ribbon.surfaces?.sessionEcho?.length ?? 0).toBeGreaterThan(8)
  })

  it('warm user: next step line ties to session hints when present', () => {
    const doc = createEmptyUserLearningProfile('u-warm-next')
    doc.totalSessionsObserved = 6
    doc.weakGrammarPatterns.push({
      patternId: 'question_words',
      label: 'Question words',
      explanation: null,
      severityScore: 1.5,
      confidence: 0.5,
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      lastSeenAt: '2026-01-02T00:00:00.000Z',
      occurrences: 2,
      scenarioIds: [],
      evidenceRefs: [],
      recoveryScore: 0.25,
      improving: false,
    })
    void buildPracticeRecommendations(doc)
    const ribbon = buildReportPersonalizationRibbon({
      doc,
      sessionWeakHints: ["Use 'wat' instead of 'niet'."],
    })
    expect(ribbon.coldStart).toBe(false)
    expect(ribbon.nextStep?.subtitle ?? '').toMatch(/build on today/i)
    expect(ribbon.nextStep?.subtitle ?? '').toMatch(/wat/i)
    if (ribbon.nextPractice?.href) {
      expect(ribbon.nextPractice.href).toMatch(/\/app\/talk\/(live\/run|read-aloud)/)
      expect(ribbon.nextPractice.label.length).toBeGreaterThan(3)
    }
  })
})

describe('extractReadAloudWeakHintsForRibbon', () => {
  it('pulls focus area and weak word stems for report ribbon', () => {
    const hints = extractReadAloudWeakHintsForRibbon({
      coaching: { focusArea: '  linking words  ' },
      weakWords: ['echter', 'daarom'],
    })
    expect(hints.some((h) => /linking/i.test(h))).toBe(true)
    expect(hints).toContain('echter')
  })
})

describe('resolveReadAloudPassagePersonalization', () => {
  it('cold profile forces everyday_dutch passage profile', () => {
    const doc = createEmptyUserLearningProfile('u')
    doc.totalSessionsObserved = 1
    const r = resolveReadAloudPassagePersonalization({
      doc,
      level: 'A2',
      genre: 'story',
      topic: null,
      personalizationProfileOverride: 'grammar_focus',
    })
    expect(r.appliedProfileId).toBe('everyday_dutch')
  })

  it('honors explicit personalization override when not cold', () => {
    const doc = createEmptyUserLearningProfile('u')
    doc.totalSessionsObserved = 5
    const r = resolveReadAloudPassagePersonalization({
      doc,
      level: 'B1',
      genre: 'everyday_conversation',
      topic: null,
      personalizationProfileOverride: 'fluency_focus',
    })
    expect(r.appliedProfileId).toBe('fluency_focus')
    expect(r.uiChips.some((c) => /fluency|pacing/i.test(c))).toBe(true)
  })
})

describe('buildLearningPersonalizationForTurn', () => {
  it('language coach path merges coachPersistentEnglish block', () => {
    const doc = createEmptyUserLearningProfile('u')
    doc.totalSessionsObserved = 4
    doc.activeFocusAreas = ['articles']
    const p = buildLearningPersonalizationForTurn({
      profile: doc,
      scenarioSlug: 'language_coach',
      scenarioId: null,
      isLanguageCoach: true,
    })
    expect(p.coachPersistentEnglish.length).toBeGreaterThan(80)
    expect(p.scenarioMicroHintEnglish.length).toBeGreaterThan(0)
    expect(p.scenarioLivePersonalization).toBeNull()
  })

  it('structured scenario path attaches scenarioLivePersonalization when scenarioId set', () => {
    const doc = createEmptyUserLearningProfile('u')
    doc.totalSessionsObserved = 4
    doc.scenarioPerformance['sc-db-1'] = {
      scenarioId: 'sc-db-1',
      scenarioSlug: 'train-station',
      attempts: 2,
      rollingScore: 68,
      recentScore: 70,
      confidence: 0.45,
      strongSubskills: [],
      weakSubskills: ['platform clarity'],
      lastAttemptAt: '2026-01-01T00:00:00.000Z',
    }
    const p = buildLearningPersonalizationForTurn({
      profile: doc,
      scenarioSlug: 'train-station',
      scenarioId: 'sc-db-1',
      isLanguageCoach: false,
    })
    expect(p.scenarioAdaptationEnglish).toContain('train')
    expect(p.scenarioLivePersonalization).not.toBeNull()
  })
})
