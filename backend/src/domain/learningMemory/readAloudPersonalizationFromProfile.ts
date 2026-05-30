/**
 * Read Aloud passage generation personalization from {@link UserLearningProfile}.
 * English-only hints for the author model; learner-facing output stays Dutch.
 */
import {
  UX_READ_ALOUD_UI_CHIP_CONFIDENCE,
  UX_READ_ALOUD_UI_CHIP_EVERYDAY,
  UX_READ_ALOUD_UI_CHIP_FLUENCY,
  UX_READ_ALOUD_UI_CHIP_GRAMMAR,
  UX_READ_ALOUD_UI_CHIP_MIXED,
  UX_READ_ALOUD_UI_CHIP_SCENARIO,
  UX_READ_ALOUD_UI_CHIP_SOUNDS,
  UX_READ_ALOUD_UI_CHIP_STORY,
  UX_READ_ALOUD_UI_CHIP_VOCAB,
} from './conversationMemoryUxCopy'
import { rankWeakestSkillIdsFromProfile } from '../skills/scenarioSkillTags'
import type { SkillId } from '../skills/skillTypes'
import { inferReadAloudPassageProfileIdFromSkillMetrics } from './readAloudSkillProfileInference'
import { effectiveWeaknessItemScore, LOW_CONFIDENCE_FOCUS_FLOOR } from './learningMemoryMergeScoring'
import { topWeaknessLabels } from './learningMemoryRecommendationService'
import type { ScenarioPerformanceSummary, UserLearningProfile } from './userLearningProfileDocument'

/** Must stay aligned with `ReadAloudPersonalizationProfileSchema` in HTTP layer. */
export type ReadAloudPassagePersonalizationProfileId =
  | 'pronunciation_focus'
  | 'weak_sounds_focus'
  | 'weak_vocabulary_focus'
  | 'grammar_focus'
  | 'fluency_focus'
  | 'mixed_review'
  | 'everyday_dutch'
  | 'scenario_linked'
  | 'storytelling_focus'
  | 'confidence_build'

export type ReadAloudPassageGenreId =
  | 'everyday_conversation'
  | 'story'
  | 'news_style'
  | 'travel'
  | 'work'
  | 'practical_instructions'
  | 'social_chat'
  | 'description'
  | 'opinion'
  | 'custom_topic'

export type ReadAloudPassagePersonalizationResult = {
  appliedProfileId: ReadAloudPassagePersonalizationProfileId
  personalizationEnglish: string
  /** Short labels for UI (max ~3). */
  uiChips: string[]
}

function weakVocabDisplay(doc: UserLearningProfile, max: number): string[] {
  return [...doc.weakVocabulary]
    .filter((v) => v.confidence >= LOW_CONFIDENCE_FOCUS_FLOOR)
    .sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a))
    .map((v) => v.displayText || v.normalizedKey)
    .filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, max)
}

function weakPatternLabels(doc: UserLearningProfile, max: number): string[] {
  return [...doc.weakGrammarPatterns]
    .filter((p) => p.confidence >= LOW_CONFIDENCE_FOCUS_FLOOR)
    .sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a))
    .map((p) => p.label)
    .filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, max)
}

function pronunciationSurfaces(doc: UserLearningProfile, max: number): string[] {
  return [...doc.pronunciationIssues]
    .filter((p) => p.confidence >= LOW_CONFIDENCE_FOCUS_FLOOR)
    .sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a))
    .map((p) => {
      const i = p.targetKey.indexOf(':')
      return (i > 0 ? p.targetKey.slice(0, i) : p.targetKey).trim() || p.targetKey
    })
    .filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, max)
}

function recentScenarioWeakHints(doc: UserLearningProfile, max: number): string[] {
  const rows = Object.values(doc.scenarioPerformance)
    .filter((s) => typeof s.rollingScore === 'number' && s.rollingScore < 74 && (s.confidence ?? 0) >= 0.22)
    .sort((a, b) => (a.rollingScore ?? 99) - (b.rollingScore ?? 99)) as ScenarioPerformanceSummary[]
  const out: string[] = []
  for (const s of rows.slice(0, 2)) {
    for (const w of (s.weakSubskills ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 3)) {
      if (!out.includes(w)) out.push(w)
      if (out.length >= max) return out
    }
  }
  return out.slice(0, max)
}

function isValidProfileId(raw: string | null | undefined): raw is ReadAloudPassagePersonalizationProfileId {
  if (!raw) return false
  const set = new Set<string>([
    'pronunciation_focus',
    'weak_sounds_focus',
    'weak_vocabulary_focus',
    'grammar_focus',
    'fluency_focus',
    'mixed_review',
    'everyday_dutch',
    'scenario_linked',
    'storytelling_focus',
    'confidence_build',
  ])
  return set.has(raw)
}

/** Extra English authoring texture from skills not fully captured by the chosen profile id. */
function appendSkillLayerReadAloudHints(doc: UserLearningProfile, bits: string[]): void {
  const m = doc.userSkillProfile?.metrics
  if (!m || doc.totalSessionsObserved < 2) return
  const top = rankWeakestSkillIdsFromProfile(doc, 4)
  const want = (id: SkillId) => {
    const row = m[id]
    return row && row.evidenceCount >= 2 && row.score < 55 && top.includes(id)
  }
  const nuanceFamily =
    want('nuance') || want('reasoning') || want('opinions') || want('contrast_comparison')
  if (nuanceFamily) {
    bits.push(
      'Skill steer: opinion / comparison texture — weave one light contrast or “pros vs cons” moment in natural prose (no debate framing); invite hedging (“deels”, “hangt ervan af”).',
    )
  }
  if (want('follow_up_questions') || want('asking_questions')) {
    bits.push(
      'Skill steer: questions — embed several natural Dutch questions in dialogue-flavored prose so the learner can mirror clean word order.',
    )
  }
}

export function inferReadAloudPassageProfileId(doc: UserLearningProfile): ReadAloudPassagePersonalizationProfileId {
  const fromSkills = inferReadAloudPassageProfileIdFromSkillMetrics(doc)
  if (fromSkills) return fromSkills
  const labels = topWeaknessLabels(doc, 12).join(' ').toLowerCase()
  const t = `${labels} ${doc.activeFocusAreas.join(' ')}`.toLowerCase()
  if (/pronun|klinker|medeklinker|tweeklank|stress|gch|sch|\bui\b|\beu\b|\bij\b|hard.*g|zachte g/i.test(t)) {
    return 'weak_sounds_focus'
  }
  if (doc.weakVocabulary.filter((v) => v.confidence >= LOW_CONFIDENCE_FOCUS_FLOOR).length >= 4) {
    return 'weak_vocabulary_focus'
  }
  if (/grammar|woordvolgorde|inversie|zin|werkwoord|tijd|vraag|vrag/i.test(t)) {
    return 'grammar_focus'
  }
  if (/pause|fluency|flow|ritme|tempo|vulsel|ehm|pace/i.test(t)) {
    return 'fluency_focus'
  }
  if (doc.totalSessionsObserved >= 4) return 'mixed_review'
  return 'everyday_dutch'
}

function chipsFor(profile: ReadAloudPassagePersonalizationProfileId, doc: UserLearningProfile): string[] {
  const chips: string[] = []
  if (profile === 'weak_sounds_focus' || profile === 'pronunciation_focus') {
    chips.push(UX_READ_ALOUD_UI_CHIP_SOUNDS)
  }
  if (profile === 'weak_vocabulary_focus') {
    chips.push(UX_READ_ALOUD_UI_CHIP_VOCAB)
  }
  if (profile === 'grammar_focus') {
    chips.push(UX_READ_ALOUD_UI_CHIP_GRAMMAR)
  }
  if (profile === 'fluency_focus') {
    chips.push(UX_READ_ALOUD_UI_CHIP_FLUENCY)
  }
  if (profile === 'mixed_review') {
    chips.push(UX_READ_ALOUD_UI_CHIP_MIXED)
  }
  if (profile === 'scenario_linked' || recentScenarioWeakHints(doc, 1).length) {
    chips.push(UX_READ_ALOUD_UI_CHIP_SCENARIO)
  }
  if (profile === 'storytelling_focus') {
    chips.push(UX_READ_ALOUD_UI_CHIP_STORY)
  }
  if (profile === 'confidence_build') {
    chips.push(UX_READ_ALOUD_UI_CHIP_CONFIDENCE)
  }
  if (profile === 'everyday_dutch' && chips.length === 0) {
    chips.push(UX_READ_ALOUD_UI_CHIP_EVERYDAY)
  }
  return [...new Set(chips)].slice(0, 3)
}

function genrePersonalizationHint(genre: ReadAloudPassageGenreId, patternLabels: string, weakText: string): string {
  if (/question|vrag|inversie/i.test(patternLabels) || /question|vrag/i.test(weakText)) {
    if (genre === 'everyday_conversation' || genre === 'social_chat' || genre === 'work') {
      return 'Shape the passage with a light dialogue rhythm in prose (turn-taking feel) so question forms appear naturally—no “A:” / “B:” labels.'
    }
    return 'Include several natural questions and brief answers in flowing prose (not a script header).'
  }
  if (/werk|kantoor|meeting|colleague/i.test(weakText) && genre !== 'work') {
    return 'Weave in a few workplace-appropriate Dutch words or situations even if the genre is broader—keep it plausible for the chosen genre.'
  }
  return ''
}

/**
 * Resolves profile id (client override or inferred) and builds English weaving hints + UI chips.
 */
export function resolveReadAloudPassagePersonalization(params: {
  doc: UserLearningProfile
  level: 'A1' | 'A2' | 'B1' | 'B2'
  genre: ReadAloudPassageGenreId
  topic?: string | null
  personalizationProfileOverride?: string | null
}): ReadAloudPassagePersonalizationResult {
  const { doc, level, genre, topic, personalizationProfileOverride } = params
  const cold = doc.totalSessionsObserved < 2
  const appliedProfileId: ReadAloudPassagePersonalizationProfileId = cold
    ? 'everyday_dutch'
    : isValidProfileId(personalizationProfileOverride)
      ? personalizationProfileOverride
      : inferReadAloudPassageProfileId(doc)

  const labelsJoined = topWeaknessLabels(doc, 10).join(' · ')
  const weakWords = weakVocabDisplay(doc, 8)
  const weakPatterns = weakPatternLabels(doc, 5)
  const prSurfaces = pronunciationSurfaces(doc, 6)
  const scenHints = recentScenarioWeakHints(doc, 5)
  const patternBlob = weakPatterns.join(' ').toLowerCase()
  const weakBlob = [...weakWords, ...doc.activeFocusAreas].join(' ').toLowerCase()
  const genreHint = genrePersonalizationHint(genre, patternBlob, weakBlob)

  const bits: string[] = [
    `Learner CEFR target for this passage: ${level}.`,
    cold
      ? 'Cold start: keep inviting, slightly simpler than midpoint for level; do not imply a long diagnosis.'
      : `Cross-session focus hints (uncertain): ${labelsJoined || 'general clarity'}.`,
  ]

  if (doc.activeFocusAreas.length && !cold) {
    bits.push(`Priority themes to weave naturally (not every sentence): ${doc.activeFocusAreas.slice(0, 5).join(', ')}.`)
  }
  if (weakWords.length) {
    bits.push(`Challenged lemmas to recycle in context (natural collocations): ${weakWords.join(', ')}.`)
  }
  if (weakPatterns.length) {
    bits.push(`Grammar textures to give practice opportunities in prose: ${weakPatterns.join(' · ')}.`)
  }
  if (prSurfaces.length) {
    bits.push(
      `Pronunciation / sound targets (natural Dutch recycling, not phonetics lecture): ${prSurfaces.join(', ')} — include g/ui/eu-type contrasts where idiomatic.`,
    )
  }
  if (scenHints.length) {
    bits.push(`Recent live-scene friction (English labels; internal): ${scenHints.join(' · ')}.`)
  }
  if (topic?.trim()) {
    bits.push(`Respect learner topic/genre focus: ${topic.trim().slice(0, 220)}`)
  }

  switch (appliedProfileId) {
    case 'weak_sounds_focus':
    case 'pronunciation_focus':
      bits.push(
        'Profile: sound focus — favour lines where the learner can rehearse tricky Dutch sounds in common words and short phrases; keep rhythm speakable.',
      )
      break
    case 'weak_vocabulary_focus':
      bits.push('Profile: vocabulary focus — repeat a small set of useful words across the passage with varied collocations.')
      break
    case 'grammar_focus':
      bits.push('Profile: grammar focus — a few contrasting sentence shapes (questions, negation, subclause) still as natural prose.')
      break
    case 'fluency_focus':
      bits.push('Profile: fluency — slightly shorter sentences, clean connectors, breath-friendly lines.')
      break
    case 'mixed_review':
      bits.push('Profile: mixed review — blend two light themes so practice feels varied.')
      break
    case 'scenario_linked':
      bits.push('Profile: scenario-linked — echo practical situations from recent weak subskills without naming scenarios.')
      break
    case 'storytelling_focus':
      bits.push(
        'Profile: storytelling — a compact arc (setup → turn → outcome) with clear time markers and speakable sentences; keep emotional range gentle.',
      )
      break
    case 'confidence_build':
      bits.push(
        'Profile: confidence build — high-frequency vocabulary, shorter clauses, one idea per sentence where possible; avoid stacked rare idioms; tone warm and success-oriented.',
      )
      break
    default:
      bits.push('Profile: everyday Dutch — grounded, friendly, readable aloud.')
  }

  appendSkillLayerReadAloudHints(doc, bits)

  if (appliedProfileId === 'storytelling_focus' && genre !== 'story') {
    bits.push(
      'Genre note: keep a short narrative spine (setup → turn → close) even when the chosen genre is not “story”, so sequencing practice still lands.',
    )
  }

  if (genreHint) bits.push(genreHint)

  const uiChips = cold ? [] : chipsFor(appliedProfileId, doc)

  return {
    appliedProfileId,
    personalizationEnglish: bits.join(' '),
    uiChips,
  }
}
