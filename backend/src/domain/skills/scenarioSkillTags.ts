/**
 * Scenario → skill coverage for recommendations, Speak Live adaptation, and “good for this skill” UX.
 * Keys use underscore-normalized slugs (see {@link normalizeScenarioSlug}).
 */
import type { UserLearningProfile } from '../learningMemory/userLearningProfileDocument'
import type { SkillId, SkillMetric } from './skillTypes'

const PUBLIC_TRANSPORT_TAGS: SkillId[] = [
  'asking_questions',
  'repair_clarification',
  'fluency',
  'vocabulary',
  'turn_taking',
  'natural_dutch',
  'gist_understanding',
  'detail_recognition',
  'fast_speech_handling',
  'numbers_and_times',
  'route_words',
]

const TAGS: Record<string, SkillId[]> = {
  train_station: [...PUBLIC_TRANSPORT_TAGS],
  train_station_classic: [...PUBLIC_TRANSPORT_TAGS],
  directions_getting_somewhere: [
    'asking_questions',
    'repair_clarification',
    'fluency',
    'vocabulary',
    'follow_up_questions',
    'natural_dutch',
    'route_words',
    'gist_understanding',
    'detail_recognition',
  ],
  ordering_food: ['reacting', 'vocabulary', 'pronunciation', 'keeping_flow', 'natural_dutch', 'asking_questions'],
  supermarket_shop: [
    'asking_questions',
    'vocabulary',
    'repair_clarification',
    'reacting',
    'natural_dutch',
    'service_replies',
    'quantities_and_items',
    'instruction_following',
  ],
  storytelling: ['storytelling', 'sequencing', 'fluency', 'natural_dutch', 'keeping_flow'],
  small_talk: ['reacting', 'keeping_flow', 'follow_up_questions', 'natural_dutch', 'fluency'],
  meeting_new_people: ['reacting', 'follow_up_questions', 'keeping_flow', 'natural_dutch', 'asking_questions'],
  party_social: ['reacting', 'keeping_flow', 'follow_up_questions', 'fluency', 'natural_dutch'],
  work_colleague: [
    'sentence_structure',
    'asking_questions',
    'response_structure',
    'turn_taking',
    'word_choice',
    'softer_disagreement',
    'natural_dutch',
  ],
  work_colleague_interaction: [
    'sentence_structure',
    'asking_questions',
    'response_structure',
    'turn_taking',
    'word_choice',
    'softer_disagreement',
    'natural_dutch',
  ],
  phone_call: ['repair_clarification', 'pronunciation', 'response_structure', 'turn_taking', 'asking_questions'],
  store_service_issue: ['repair_clarification', 'explaining', 'softer_disagreement', 'vocabulary', 'response_structure'],
  explaining_something: ['explaining', 'sequencing', 'step_by_step_speaking', 'response_structure', 'sentence_structure'],
  opinions_discussions: [
    'opinions',
    'reasoning',
    'nuance',
    'contrast_comparison',
    'softer_disagreement',
    'response_structure',
  ],
  booking_reservations: ['asking_questions', 'repair_clarification', 'response_structure', 'vocabulary', 'natural_dutch'],
  doctor_pharmacy: ['vocabulary', 'asking_questions', 'fluency', 'natural_dutch', 'repair_clarification'],
  housing_landlord: ['vocabulary', 'asking_questions', 'softer_disagreement', 'explaining', 'response_structure'],
  language_coach: [
    'keeping_flow',
    'follow_up_questions',
    'natural_dutch',
    'fluency',
    'grammar',
    'pronunciation',
  ],
  read_aloud: ['pronunciation', 'pacing', 'fluency', 'grammar', 'vocabulary'],
}

function metricQuality(m: SkillMetric): number {
  if (m.confidence === 'low') return 0.55
  if (m.confidence === 'medium') return 0.78
  return 1
}

/** Ranks weakest skills from persisted metrics (same spirit as skill recommendation bundle). */
export function rankWeakestSkillIdsFromProfile(doc: UserLearningProfile, max: number): SkillId[] {
  const metrics = doc.userSkillProfile?.metrics
  if (!metrics) return []
  const rows = Object.values(metrics).filter(Boolean) as SkillMetric[]
  const filtered = rows.filter((m) => m.evidenceCount >= 2)
  const pool = filtered.length ? filtered : rows.filter((m) => m.evidenceCount >= 1)
  return [...pool]
    .sort((a, b) => {
      const wa = a.score * metricQuality(a)
      const wb = b.score * metricQuality(b)
      return wa - wb
    })
    .map((m) => m.skillId)
    .filter((id, i, a) => a.indexOf(id) === i)
    .slice(0, max)
}

/** Count of top weak skills (see {@link rankWeakestSkillIdsFromProfile}) that this scenario explicitly trains. */
export function weakSkillScenarioOverlapHits(doc: UserLearningProfile, scenarioSlug: string): number {
  const scenarioSkills = new Set(skillsForScenarioSlug(scenarioSlug))
  if (!scenarioSkills.size) return 0
  let n = 0
  for (const id of rankWeakestSkillIdsFromProfile(doc, 5)) {
    if (scenarioSkills.has(id)) n += 1
  }
  return n
}

export function normalizeScenarioSlug(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw.trim().toLowerCase().replace(/-/g, '_')
}

export function skillsForScenarioSlug(slug: string | null | undefined): SkillId[] {
  const k = normalizeScenarioSlug(slug)
  if (!k) return []
  if (k === 'opinions_light') {
    const row = TAGS.opinions_discussions
    return row ? [...row] : []
  }
  const row = TAGS[k]
  return row ? [...row] : []
}

/** Canonical hyphenated slug for routing / APIs. */
export function scenarioSlugForDisplay(normalizedKey: string): string {
  return normalizedKey.replace(/_/g, '-')
}

export function scenarioSlugsSupportingSkill(skillId: SkillId, max = 8): string[] {
  const out: string[] = []
  for (const [slug, skills] of Object.entries(TAGS)) {
    if (!skills.includes(skillId)) continue
    const display = scenarioSlugForDisplay(slug)
    if (!out.includes(display)) out.push(display)
    if (out.length >= max) break
  }
  return out
}
