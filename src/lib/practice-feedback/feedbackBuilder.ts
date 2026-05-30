import { analyzePracticeSession } from '@/lib/practice-feedback/feedbackAnalyzer'
import { extractStrengths } from '@/lib/practice-feedback/strengthsExtractor'
import { extractImprovements } from '@/lib/practice-feedback/improvementExtractor'
import { detectGrammarIssues } from '@/lib/practice-feedback/grammarIssueDetector'
import { detectWordOrderNotes } from '@/lib/practice-feedback/wordOrderDetector'
import { buildPhrasingUpgrades } from '@/lib/practice-feedback/phrasingUpgradeBuilder'
import { buildVocabSuggestions } from '@/lib/practice-feedback/vocabSuggestionBuilder'
import {
  buildNextPracticeSuggestion,
  buildFeedbackCtas,
} from '@/lib/practice-feedback/practiceRecommendationBuilder'
import type {
  PostConversationFeedbackInput,
  PracticeFeedbackBuildResult,
  PracticeFeedbackPresenterModel,
  PracticeFeedbackSideEffects,
  SessionOutcome,
} from '@/lib/practice-feedback/types'
import {
  buildRewardSignals,
  practiceQualifiesForStreak,
  resolveScenarioXpAmount,
} from '@/lib/practice-progress/practiceRewardCalculator'
import type { ScoringResult } from '@/lib/schemas/practice/scoringResult.schema'
import type { WeaknessSignal } from '@/lib/schemas/practice/scoringResult.schema'
import { reviewItemSchema } from '@/lib/schemas/reviewItem.schema'

function computeConfidencePercent(
  outcome: SessionOutcome,
  signals: ReturnType<typeof analyzePracticeSession>,
  mode: PostConversationFeedbackInput['mode']
): number {
  let base = outcome === 'success' ? 72 : outcome === 'partial' ? 58 : 42
  base += Math.min(12, signals.userTurnCount * 2)
  base -= Math.min(12, (signals.supportHeavy ? 3 : 0) * 4)
  base -= Math.min(10, signals.weakBranchCount * 5)
  base += Math.min(8, signals.strongBranchCount * 4)
  if (mode === 'guided') base += 5
  if (mode === 'free') base -= 2
  return Math.max(38, Math.min(94, Math.round(base)))
}

function bandFromPercent(p: number): ScoringResult['confidenceEstimate'] {
  if (p >= 74) return 'strong'
  if (p >= 55) return 'developing'
  return 'weak'
}

function verbalConfidence(p: number, outcome: SessionOutcome, supportHeavy: boolean): string {
  if (supportHeavy && outcome !== 'success') {
    return 'You used support wisely — next rep, try one turn on your own.'
  }
  if (p >= 80) return 'Strong session — your Dutch carried the scene.'
  if (p >= 65) return 'Solid work — a few focused tweaks will make this feel easy.'
  if (p >= 50) return 'You’re building momentum — short, clear sentences will unlock the next step.'
  return 'More reps in this scenario will boost confidence fast.'
}

function headlineFor(outcome: SessionOutcome, mode: PostConversationFeedbackInput['mode']): string {
  if (outcome === 'success') {
    return mode === 'guided'
      ? 'Scenario complete — goal achieved'
      : 'Nice work — you moved the conversation forward'
  }
  if (outcome === 'partial') {
    return 'Good progress — one more pass will lock it in'
  }
  return 'Keep going — this setting gets easier with rhythm'
}

function sublineFor(
  outcome: SessionOutcome,
  mode: PostConversationFeedbackInput['mode'],
  goal?: string
): string {
  const g = goal?.trim()
  const goalBit = g ? ` Tied to: ${g.length > 90 ? `${g.slice(0, 88)}…` : g}` : ''
  if (mode === 'guided') {
    return outcome === 'success'
      ? `Structured practice paid off.${goalBit}`
      : `Guided mode gives you clear steps on purpose — every run still counts.${goalBit}`
  }
  if (mode === 'semi_guided') {
    return `Semi-guided: you type more freely; open support when you need it.${goalBit}`
  }
  return `Open mode: stay in the situation — short, clear turns beat perfection.${goalBit}`
}

function buildWeaknessSignals(
  grammarCount: number,
  wordOrder: boolean,
  english: boolean
): WeaknessSignal[] {
  const w: WeaknessSignal[] = []
  if (wordOrder) w.push({ tag: 'word-order', severity: 2, evidence: 'time adverb pattern' })
  if (english) w.push({ tag: 'register', severity: 2, evidence: 'English tokens in Dutch' })
  if (grammarCount > 0) w.push({ tag: 'grammar-clarity', severity: 2 })
  return w
}

function buildStage4Items(
  scenarioId: string,
  lemmas: string[],
  grammar?: string
): import('@/lib/schemas/reviewItem.schema').ReviewItem[] {
  const lessonId = `practice-${scenarioId}`
  const items: import('@/lib/schemas/reviewItem.schema').ReviewItem[] = []
  const cleaned = [...new Set(lemmas.map((x) => x.trim().toLowerCase()).filter(Boolean))].slice(0, 6)
  for (const lemma of cleaned) {
    const id = `practice-${scenarioId}-lemma-${lemma.replace(/\s+/g, '-')}`
    const p = reviewItemSchema.safeParse({
      id,
      sourceLessonId: lessonId,
      type: 'vocab',
      prompt: `Recall / produce: “${lemma}” (from practice scenario).`,
      expectedAnswer: lemma,
      difficulty: 'A2_mid',
      tags: ['practice', 'scenario', scenarioId],
      metadata: { scenarioId, lemma },
    })
    if (p.success) items.push(p.data)
  }
  if (grammar) {
    const gid = `practice-${scenarioId}-grammar-pattern`
    const p = reviewItemSchema.safeParse({
      id: gid,
      sourceLessonId: lessonId,
      type: 'grammar',
      prompt: `Quick check: ${grammar}`,
      expectedAnswer: grammar,
      difficulty: 'A2_mid',
      tags: ['practice', 'grammar'],
      metadata: { scenarioId },
    })
    if (p.success) items.push(p.data)
  }
  return items
}

function computeSideEffects(
  scenarioId: string,
  signals: ReturnType<typeof analyzePracticeSession>,
  grammarLabel: string | undefined,
  vocabEntries: { lemma: string; translation?: string }[]
): PracticeFeedbackSideEffects {
  const rewardSignals = buildRewardSignals(
    signals.mode,
    signals.sessionOutcome,
    signals.userTurnCount,
    signals.supportHeavy
  )
  const qualifiesStreak = practiceQualifiesForStreak(rewardSignals)
  const weakTags: string[] = []
  if (signals.wordOrderRisk) weakTags.push('word-order')
  if (signals.englishTokensDetected) weakTags.push('register-mix')

  const lemmas = vocabEntries.map((e) => e.lemma)
  const stage4 = buildStage4Items(scenarioId, lemmas, grammarLabel)

  const xpAmount = resolveScenarioXpAmount(rewardSignals)

  return {
    xpAmount,
    reviewLemmas: lemmas,
    reviewVocabEntries: vocabEntries,
    reviewGrammarLabel: grammarLabel,
    weakTags,
    stage4Items: stage4,
    qualifiesStreak,
    userTurnCount: signals.userTurnCount,
    supportHeavy: signals.supportHeavy,
  }
}

/**
 * Full post-conversation feedback: presenter model + persistence side-effect hints.
 */
export function buildPostConversationFeedback(input: PostConversationFeedbackInput): PracticeFeedbackBuildResult {
  const signals = analyzePracticeSession(input)
  const premiumDepth = input.entitlementTier === 'premium' || input.entitlementTier === 'trial'

  const grammarNotes = detectGrammarIssues(signals)
  const wordOrderNotes = detectWordOrderNotes(signals)
  const hasLangNotes = grammarNotes.length > 0 || wordOrderNotes.length > 0

  const strengths = extractStrengths(signals, input)
  const improvements = extractImprovements(signals, input, hasLangNotes)

  const phrasingUpgrades = buildPhrasingUpgrades(signals, input.keyPhrases, premiumDepth)
  const vocabSuggestions = buildVocabSuggestions(signals, input.keyPhrases, premiumDepth)

  const nextPractice = buildNextPracticeSuggestion(signals, input)
  const ctas = buildFeedbackCtas(nextPractice, input, signals)

  const confidencePercent = computeConfidencePercent(signals.sessionOutcome, signals, input.mode)
  const proficiencyBand = bandFromPercent(confidencePercent)
  const scoringResult: ScoringResult = {
    overallScore: confidencePercent / 100,
    fluencyScore: Math.min(1, signals.avgUserTurnLength / 55),
    accuracyScore:
      signals.sessionOutcome === 'success' ? 0.82 : signals.sessionOutcome === 'partial' ? 0.65 : 0.48,
    completionScore: signals.sessionOutcome === 'success' ? 0.9 : signals.sessionOutcome === 'partial' ? 0.65 : 0.4,
    supportUsageScore: signals.supportHeavy ? 0.45 : 0.78,
    confidenceEstimate: proficiencyBand,
    weaknessSignals: buildWeaknessSignals(grammarNotes.length, signals.wordOrderRisk, signals.englishTokensDetected),
    strengths,
    subScores: {
      turns: Math.min(1, signals.userTurnCount / 6),
      phrases: Math.min(1, signals.usedKeyPhraseCount / 3),
    },
    metadata: { scenarioId: input.scenarioId, mode: input.mode },
  }

  let grammarLabel: string | undefined
  if (wordOrderNotes.length > 0) {
    grammarLabel = 'Dutch main clause word order (verb second)'
  } else if (grammarNotes.some((g) => g.id === 'register-mix')) {
    grammarLabel = 'Keeping output in Dutch'
  }

  const vocabEntriesForReview = vocabSuggestions
    .map((v) => {
      const word = (v.nl.split(/\s+/).find((w) => w.length > 3) ?? v.nl).replace(
        /^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu,
        ''
      )
      return { lemma: word, translation: v.en?.trim() || undefined }
    })
    .filter((entry) => entry.lemma.length > 0 && !/[,;:]/.test(entry.lemma))
    .slice(0, 5)

  const sideEffects = computeSideEffects(input.scenarioId, signals, grammarLabel, vocabEntriesForReview)

  const reviewQueuedCount = sideEffects.stage4Items.length

  const personalizationTags = [
    ...sideEffects.weakTags,
    ...(signals.supportHeavy ? ['conversation-repair'] : []),
    ...(signals.missedKeyPhrases.length >= 2 ? ['listening-fast', 'listening'] : []),
    ...(signals.wordOrderRisk ? ['word-order'] : []),
    ...(grammarNotes.length > 0 ? ['grammar'] : []),
  ]

  const presenter: PracticeFeedbackPresenterModel = {
    scenarioId: input.scenarioId,
    scenarioTitle: input.scenarioTitle,
    mode: input.mode,
    outcome: signals.sessionOutcome,
    headline: headlineFor(signals.sessionOutcome, input.mode),
    subline: sublineFor(signals.sessionOutcome, input.mode, input.scenarioGoal),
    confidencePercent,
    confidenceLabel: verbalConfidence(confidencePercent, signals.sessionOutcome, signals.supportHeavy),
    proficiencyBand,
    strengths: premiumDepth ? strengths : strengths.slice(0, 1),
    improvements: premiumDepth ? improvements : improvements.slice(0, 1),
    grammarNotes: premiumDepth ? grammarNotes : grammarNotes.slice(0, 1),
    wordOrderNotes,
    phrasingUpgrades,
    vocabSuggestions: premiumDepth ? vocabSuggestions : vocabSuggestions.slice(0, 2),
    nextPractice,
    reviewTeaser:
      reviewQueuedCount > 0
        ? `We queued ${reviewQueuedCount} short review ${reviewQueuedCount === 1 ? 'item' : 'items'} from this session.`
        : 'Open review anytime to reinforce what you practiced.',
    reviewQueuedCount,
    ctas,
    premiumDepth,
    scoringResult,
    personalizationTags,
  }

  return { presenter, sideEffects }
}
