/**
 * Skill-metric → read-aloud passage profile inference.
 * Kept separate from `readAloudPersonalizationFromProfile` so `fluentLearningRecommendationEngine`
 * can import it without circular imports through `learningMemoryRecommendationService`.
 */
import { rankWeakestSkillIdsFromProfile } from '../skills/scenarioSkillTags'
import type { SkillId } from '../skills/skillTypes'
import type { UserLearningProfile } from './userLearningProfileDocument'

/** Subset of passage profiles that skill metrics alone can select. */
export type ReadAloudProfileInferredFromMetrics =
  | 'weak_sounds_focus'
  | 'fluency_focus'
  | 'grammar_focus'
  | 'weak_vocabulary_focus'
  | 'storytelling_focus'
  | 'confidence_build'

function metricRow(doc: UserLearningProfile, id: SkillId) {
  return doc.userSkillProfile?.metrics?.[id]
}

export function inferReadAloudPassageProfileIdFromSkillMetrics(
  doc: UserLearningProfile,
): ReadAloudProfileInferredFromMetrics | null {
  const m = doc.userSkillProfile?.metrics
  if (!m) return null

  const ranked = rankWeakestSkillIdsFromProfile(doc, 8)
  const fragile = ranked.filter((id) => {
    const row = metricRow(doc, id)
    return row && row.evidenceCount >= 2 && row.score < 48
  })
  if (fragile.length >= 3) return 'confidence_build'

  const story = metricRow(doc, 'storytelling')
  const seq = metricRow(doc, 'sequencing')
  if (story && story.evidenceCount >= 2 && story.score < 52) return 'storytelling_focus'
  if (seq && seq.evidenceCount >= 2 && seq.score < 52) return 'storytelling_focus'

  const pacing = m.pacing
  const flu = m.fluency
  if (pacing && pacing.score < 52 && pacing.evidenceCount >= 2) return 'fluency_focus'
  if (flu && flu.score < 52 && flu.evidenceCount >= 2 && (!pacing || pacing.score >= 52)) return 'fluency_focus'

  const pron = m.pronunciation
  if (pron && pron.score < 50 && pron.evidenceCount >= 2) return 'weak_sounds_focus'

  const gram = m.grammar
  const ss = metricRow(doc, 'sentence_structure')
  if (gram && gram.score < 50 && gram.evidenceCount >= 2) return 'grammar_focus'
  if (ss && ss.score < 50 && ss.evidenceCount >= 2) return 'grammar_focus'

  const vocab = m.vocabulary
  const wc = metricRow(doc, 'word_choice')
  if (vocab && vocab.score < 50 && vocab.evidenceCount >= 2) return 'weak_vocabulary_focus'
  if (wc && wc.score < 50 && wc.evidenceCount >= 2) return 'weak_vocabulary_focus'

  const react = metricRow(doc, 'reacting')
  const nd = metricRow(doc, 'natural_dutch')
  if (
    react &&
    nd &&
    react.evidenceCount >= 2 &&
    nd.evidenceCount >= 2 &&
    react.score < 50 &&
    nd.score < 50
  ) {
    return 'confidence_build'
  }

  return null
}
