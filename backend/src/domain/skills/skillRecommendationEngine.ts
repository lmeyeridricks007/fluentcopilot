/**
 * Skill-System-driven recommendation engine — ranks next scenario, read-aloud, coach, encouragement, focus chip.
 * Goals: weakness repair + confidence + variety; penalize fatigue on recent scenarios; respect metric confidence.
 */
import { buildPracticeRecommendations } from '../learningMemory/learningMemoryRecommendationService'
import { inferReadAloudPassageProfileIdFromSkillMetrics } from '../learningMemory/readAloudSkillProfileInference'
import type { ReadAloudPassagePersonalizationProfileId } from '../learningMemory/readAloudPersonalizationFromProfile'
import type { UserLearningProfile } from '../learningMemory/userLearningProfileDocument'
import { getSkillDefinition } from './skillDefinitions'
import { normalizeScenarioSlug, scenarioSlugsSupportingSkill, skillsForScenarioSlug } from './scenarioSkillTags'
import type {
  SkillDrivenRecommendationItemDTO,
  SkillDrivenRecommendationPlanDTO,
} from './skillRecommendationTypes'
import type { LanguageCoachStyleHint, SkillId, SkillMetric, SkillRecommendation, UserSkillProfile } from './skillTypes'

const VALID_READ_PROFILE = new Set<string>([
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

function metricQuality(m: SkillMetric): number {
  if (m.confidence === 'low') return 0.55
  if (m.confidence === 'medium') return 0.78
  return 1
}

function rankWeakest(metrics: Partial<Record<SkillId, SkillMetric>>, max: number): SkillId[] {
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

function rankStrongest(metrics: Partial<Record<SkillId, SkillMetric>>, max: number): SkillId[] {
  const rows = Object.values(metrics).filter(Boolean) as SkillMetric[]
  const filtered = rows.filter((m) => m.evidenceCount >= 2)
  const pool = filtered.length ? filtered : rows.filter((m) => m.evidenceCount >= 1)
  return [...pool]
    .sort((a, b) => {
      const sa = a.score * metricQuality(a)
      const sb = b.score * metricQuality(b)
      return sb - sa
    })
    .map((m) => m.skillId)
    .filter((id, i, a) => a.indexOf(id) === i)
    .slice(0, max)
}

/** Skills that are improving — worth reinforcing with aligned content. */
function rankImproving(metrics: Partial<Record<SkillId, SkillMetric>>, max: number): SkillId[] {
  const rows = Object.values(metrics).filter(Boolean) as SkillMetric[]
  const pool = rows.filter(
    (m) =>
      m.evidenceCount >= 2 &&
      (m.trend === 'up' || m.state === 'improving' || m.state === 'building'),
  )
  return [...pool]
    .sort((a, b) => a.score - b.score)
    .map((m) => m.skillId)
    .filter((id, i, a) => a.indexOf(id) === i)
    .slice(0, max)
}

function normSlug(s: string): string {
  return s.replace(/-/g, '_').toLowerCase()
}

function recentScenarioCount(doc: UserLearningProfile, slug: string): number {
  const want = normSlug(slug)
  let n = 0
  for (const s of doc.recentScenarioSlugs.slice(-8)) {
    if (normSlug(s) === want) n += 1
  }
  return n
}

function scenarioFatigueMultiplier(doc: UserLearningProfile, slug: string): number {
  const n = recentScenarioCount(doc, slug)
  return 1 - Math.min(0.3, n * 0.07)
}

function modalityVarietyMultiplier(
  doc: UserLearningProfile,
  kind: 'scenario' | 'read_aloud',
): number {
  const last = doc.lastSessionModality
  if (kind === 'scenario' && last === 'read_aloud') return 1.06
  if (kind === 'read_aloud' && (last === 'speak_live' || last === 'text_conversation')) return 1.05
  if (kind === 'scenario' && last === 'speak_live') return 0.97
  return 1
}

function confidenceMultiplierForSkills(metrics: Partial<Record<SkillId, SkillMetric>>, ids: SkillId[]): number {
  let acc = 0
  let n = 0
  for (const id of ids) {
    const m = metrics[id]
    if (!m) continue
    acc += metricQuality(m)
    n += 1
  }
  if (!n) return 0.88
  return Math.min(1.08, 0.85 + (acc / n) * 0.2)
}

function suggestCoachStyle(weakest: SkillId[], metrics: Partial<Record<SkillId, SkillMetric>>): LanguageCoachStyleHint {
  const slice = weakest.slice(0, 3)
  const scores = slice.map((id) => metrics[id]?.score ?? 52)
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 52
  if (avg < 46) return 'supportive'
  if (avg > 64) return 'challenging'
  return 'balanced'
}

function coachSubtitleForStyle(style: LanguageCoachStyleHint): string {
  if (style === 'supportive') return 'Warm pacing with short questions — good when several skills still feel fragile.'
  if (style === 'challenging') return 'A bit more stretch between friendly checks — good when your baseline is already solid.'
  return 'Balanced steering between comfort and stretch — flexible reps between scenes.'
}

function scoreScenarioCandidate(params: {
  doc: UserLearningProfile
  metrics: Partial<Record<SkillId, SkillMetric>>
  slug: string
  weakIds: SkillId[]
  improvingIds: SkillId[]
  fluentBonus: number
}): { score: number; explain: SkillDrivenRecommendationItemDTO['scoreExplain'] } {
  const { doc, metrics, slug, weakIds, improvingIds, fluentBonus } = params
  const tags = skillsForScenarioSlug(slug)
  let weaknessAlignment = 0
  for (const id of weakIds) {
    if (!tags.includes(id)) continue
    const m = metrics[id]
    if (!m) continue
    weaknessAlignment += (100 - m.score) * metricQuality(m) * 0.055
  }
  let improvingBoost = 0
  for (const id of improvingIds) {
    if (!tags.includes(id)) continue
    improvingBoost += 7
  }
  const fatigueMultiplier = scenarioFatigueMultiplier(doc, slug)
  const modalityMultiplier = modalityVarietyMultiplier(doc, 'scenario')
  const confidenceMultiplier = confidenceMultiplierForSkills(
    metrics,
    weakIds.filter((id) => tags.includes(id)),
  )
  const score =
    (18 + weaknessAlignment + improvingBoost + fluentBonus) *
    fatigueMultiplier *
    modalityMultiplier *
    confidenceMultiplier
  return {
    score,
    explain: {
      weaknessAlignment: Math.round(weaknessAlignment * 10) / 10,
      improvingBoost,
      fatigueMultiplier: Math.round(fatigueMultiplier * 100) / 100,
      modalityMultiplier: Math.round(modalityMultiplier * 100) / 100,
      confidenceMultiplier: Math.round(confidenceMultiplier * 100) / 100,
    },
  }
}

function collectScenarioCandidates(_doc: UserLearningProfile, weakIds: SkillId[]): string[] {
  const out: string[] = []
  for (const id of weakIds.slice(0, 4)) {
    for (const s of scenarioSlugsSupportingSkill(id, 4)) {
      const t = s.trim()
      if (t && !out.includes(t)) out.push(t)
    }
  }
  return out.slice(0, 14)
}

function pickReadAloudProfileForSkill(skillId: SkillId): ReadAloudPassagePersonalizationProfileId {
  const def = getSkillDefinition(skillId)
  for (const p of def.relatedReadAloudProfiles) {
    if (VALID_READ_PROFILE.has(p)) return p
  }
  return 'mixed_review'
}

function scoreReadProfile(params: {
  doc: UserLearningProfile
  metrics: Partial<Record<SkillId, SkillMetric>>
  profileId: ReadAloudPassagePersonalizationProfileId
  weakIds: SkillId[]
  improvingIds: SkillId[]
}): { score: number; explain: SkillDrivenRecommendationItemDTO['scoreExplain'] } {
  const { doc, metrics, profileId, weakIds, improvingIds } = params
  let weaknessAlignment = 0
  for (const id of weakIds) {
    const def = getSkillDefinition(id)
    if (!def.relatedReadAloudProfiles.includes(profileId)) continue
    const m = metrics[id]
    if (!m) continue
    weaknessAlignment += (100 - m.score) * metricQuality(m) * 0.05
  }
  let improvingBoost = 0
  for (const id of improvingIds) {
    const def = getSkillDefinition(id)
    if (def.relatedReadAloudProfiles.includes(profileId)) improvingBoost += 6
  }
  const inferred = inferReadAloudPassageProfileIdFromSkillMetrics(doc)
  if (inferred === profileId) weaknessAlignment += 10
  let fatigueMultiplier = 1
  if (doc.lastSessionModality === 'read_aloud' && inferred === profileId) fatigueMultiplier = 0.9
  const modalityMultiplier = modalityVarietyMultiplier(doc, 'read_aloud')
  const confidenceMultiplier = confidenceMultiplierForSkills(metrics, weakIds)
  const score =
    (6 + weaknessAlignment + improvingBoost) * fatigueMultiplier * modalityMultiplier * confidenceMultiplier
  return {
    score,
    explain: {
      weaknessAlignment: Math.round(weaknessAlignment * 10) / 10,
      improvingBoost,
      fatigueMultiplier: Math.round(fatigueMultiplier * 100) / 100,
      modalityMultiplier: Math.round(modalityMultiplier * 100) / 100,
      confidenceMultiplier: Math.round(confidenceMultiplier * 100) / 100,
    },
  }
}

function readProfileCandidates(doc: UserLearningProfile, weakIds: SkillId[], improvingIds: SkillId[]): string[] {
  const set = new Set<string>()
  for (const id of [...weakIds.slice(0, 4), ...improvingIds]) {
    for (const p of getSkillDefinition(id).relatedReadAloudProfiles) {
      if (VALID_READ_PROFILE.has(p)) set.add(p)
    }
  }
  const inferred = inferReadAloudPassageProfileIdFromSkillMetrics(doc)
  if (inferred) set.add(inferred)
  const fromPractice = doc.practiceRecommendations?.find((r) => r.type === 'read_aloud_profile')?.targetId
  if (fromPractice && VALID_READ_PROFILE.has(fromPractice)) set.add(fromPractice)
  if (!set.size) set.add('everyday_dutch')
  return [...set].slice(0, 10)
}

function buildFocusChipRecommendation(params: {
  doc: UserLearningProfile
  weakIds: SkillId[]
  workingOnChip: string | null
}): SkillRecommendation | null {
  const { doc, weakIds, workingOnChip } = params
  if (doc.totalSessionsObserved < 2) {
    return {
      kind: 'focus_chip',
      title: 'Finding your rhythm',
      subtitle: 'Two short sessions unlock skill-shaped suggestions here.',
      reason: 'cold_chip',
      targetId: null,
      relatedSkillIds: [],
      priorityScore: 38,
    }
  }
  const top = weakIds[0]
  const skillLine = top ? `Skill lens: ${getSkillDefinition(top).label.toLowerCase()}` : null
  const practiceLine = workingOnChip?.trim() || null
  const subtitle = [skillLine, practiceLine].filter(Boolean).join(' · ') || 'Keep one light focus per session.'
  return {
    kind: 'focus_chip',
    title: 'Today’s steer',
    subtitle: subtitle.length > 200 ? `${subtitle.slice(0, 197)}…` : subtitle,
    reason: 'skill_practice_chip',
    targetId: null,
    relatedSkillIds: top ? weakIds.slice(0, 3) : [],
    priorityScore: 58,
  }
}

export function buildSkillDrivenRecommendationPlan(params: {
  profile: UserLearningProfile
  metrics: Partial<Record<SkillId, SkillMetric>>
}): SkillDrivenRecommendationPlanDTO {
  const { profile: doc, metrics } = params
  const rec = buildPracticeRecommendations(doc)
  const weakIds = rankWeakest(metrics, 6)
  const improvingIds = rankImproving(metrics, 4)
  const strongIds = rankStrongest(metrics, 4)
  const cold = doc.totalSessionsObserved < 2
  const generatedAt = new Date().toISOString()

  const slugFromPractice = rec.recommendedNextScenarioSlug?.trim() || null
  const scenarioCandidates = new Set<string>(collectScenarioCandidates(doc, weakIds))
  if (slugFromPractice) scenarioCandidates.add(slugFromPractice)
  if (!scenarioCandidates.size) {
    for (const s of ['small_talk', 'train-station', 'ordering_food']) scenarioCandidates.add(s)
  }

  const items: SkillDrivenRecommendationItemDTO[] = []
  let rank = 1

  let bestScenario: { slug: string; score: number; explain: SkillDrivenRecommendationItemDTO['scoreExplain'] } | null =
    null
  for (const slug of scenarioCandidates) {
    const fluentBonus =
      slugFromPractice && normalizeScenarioSlug(slug) === normalizeScenarioSlug(slugFromPractice) ? 14 : 0
    const { score, explain } = scoreScenarioCandidate({
      doc,
      metrics,
      slug,
      weakIds,
      improvingIds,
      fluentBonus,
    })
    items.push({
      rank: rank++,
      type: 'scenario',
      targetId: slug,
      title: `Speak Live · ${slug.replace(/-/g, ' ')}`,
      subtitle: 'Structured Dutch dialogue with live feedback.',
      reason: 'skill_scenario_rank',
      relatedSkillIds: weakIds.filter((id) => skillsForScenarioSlug(slug).includes(id)).slice(0, 4),
      priorityScore: Math.round(Math.min(100, score)),
      scoreExplain: explain,
    })
    if (!bestScenario || score > bestScenario.score) bestScenario = { slug, score, explain }
  }

  const readIds = readProfileCandidates(doc, weakIds, improvingIds) as ReadAloudPassagePersonalizationProfileId[]
  let bestRead: { id: ReadAloudPassagePersonalizationProfileId; score: number; explain: SkillDrivenRecommendationItemDTO['scoreExplain'] } | null = null
  for (const rid of readIds) {
    const { score, explain } = scoreReadProfile({ doc, metrics, profileId: rid, weakIds, improvingIds })
    items.push({
      rank: rank++,
      type: 'read_aloud',
      targetId: rid,
      title: `Read aloud · ${rid.replace(/_/g, ' ')}`,
      subtitle: 'Calm audio reps that recycle sounds and sentence shapes.',
      reason: 'skill_read_rank',
      relatedSkillIds: weakIds.filter((id) => getSkillDefinition(id).relatedReadAloudProfiles.includes(rid)).slice(0, 4),
      priorityScore: Math.round(Math.min(100, score)),
      scoreExplain: explain,
    })
    if (!bestRead || score > bestRead.score) bestRead = { id: rid, score, explain }
  }

  const coachStyle = suggestCoachStyle(weakIds, metrics)
  const coachBase = cold
    ? 44
    : 52 + (weakIds.length ? (100 - (metrics[weakIds[0]!]?.score ?? 50)) * 0.12 : 0)
  const coachMult =
    doc.lastSessionModality === 'speak_live' ? 1.04 : doc.lastSessionModality === 'read_aloud' ? 1.02 : 1
  const coachScore = coachBase * coachMult
  items.push({
    rank: rank++,
    type: 'coach',
    targetId: 'language_coach',
    title: 'Language Coach',
    subtitle: coachSubtitleForStyle(coachStyle),
    reason: 'skill_coach_rank',
    relatedSkillIds: weakIds.slice(0, 3),
    priorityScore: Math.round(Math.min(100, coachScore)),
  })

  const encId = strongIds[0]
  if (encId) {
    items.push({
      rank: rank++,
      type: 'encouragement',
      targetId: null,
      title: 'Strength to lean on',
      subtitle: `You’re strong in ${getSkillDefinition(encId).label.toLowerCase()} — let that confidence carry the next session.`,
      reason: 'strength_echo',
      relatedSkillIds: [encId],
      priorityScore: 42,
    })
  }

  const focusChip = buildFocusChipRecommendation({ doc, weakIds, workingOnChip: rec.workingOnChip ?? null })
  if (focusChip) {
    items.push({
      rank: rank++,
      type: 'focus_chip',
      targetId: null,
      title: focusChip.title,
      subtitle: focusChip.subtitle,
      reason: focusChip.reason,
      relatedSkillIds: focusChip.relatedSkillIds,
      priorityScore: focusChip.priorityScore,
    })
  }

  items.sort((a, b) => b.priorityScore - a.priorityScore)
  items.forEach((it, i) => {
    it.rank = i + 1
  })

  const scenarioScore = bestScenario?.score ?? 0
  const readScore = bestRead?.score ?? 0
  const useScenarioPrimary =
    !cold &&
    Boolean(bestScenario) &&
    scenarioScore >= 20 &&
    (readScore < 8 || scenarioScore >= readScore * 0.82)
  const topWeak = weakIds[0] ?? null
  const secondWeak = weakIds[1] ?? null

  let primary: SkillRecommendation | null = null
  let secondary: SkillRecommendation | null = null

  if (useScenarioPrimary && bestScenario) {
    const slug = bestScenario.slug
    const scenarioSkillSet = new Set(skillsForScenarioSlug(slug))
    const overlap = weakIds.filter((id) => scenarioSkillSet.has(id)).slice(0, 4)
    const related = overlap.length ? overlap : topWeak ? [topWeak] : []
    primary = {
      kind: 'scenario',
      title: `Best next: ${slug.replace(/-/g, ' ')}`,
      subtitle:
        overlap.length >= 2
          ? `This scene trains ${overlap
              .slice(0, 2)
              .map((id) => getSkillDefinition(id).label.toLowerCase())
              .join(' and ')} — aligned with your tracked focus.`
          : topWeak
            ? `Supports your ${getSkillDefinition(topWeak).label.toLowerCase()} in real dialogue.`
            : 'A practical scene that matches where you are now.',
      reason: 'skill_alignment_ranked',
      targetId: slug,
      relatedSkillIds: related,
      priorityScore: Math.round(Math.min(100, scenarioScore + 8)),
    }
    const readPick = bestRead?.id ?? (topWeak ? pickReadAloudProfileForSkill(topWeak) : 'mixed_review')
    const rotateCoachSecondary =
      doc.lastSessionModality === 'read_aloud' ||
      (bestScenario && scenarioFatigueMultiplier(doc, bestScenario.slug) < 0.9)
    if (rotateCoachSecondary) {
      secondary = {
        kind: 'coach',
        title: 'Also great: Language Coach',
        subtitle: coachSubtitleForStyle(coachStyle),
        reason: 'variety_coach_after_read_or_fatigue',
        targetId: 'language_coach',
        relatedSkillIds: weakIds.slice(0, 3),
        priorityScore: 60,
        coachStyleHint: coachStyle,
      }
    } else {
      secondary = {
        kind: 'read_aloud',
        title: 'Also great: Read aloud',
        subtitle: secondWeak
          ? `Pairs with ${getSkillDefinition(secondWeak).label.toLowerCase()} — calm audio feedback.`
          : 'Low-stress reps to complement live speaking.',
        reason: 'skill_support_read',
        targetId: readPick,
        relatedSkillIds: secondWeak ? [secondWeak] : topWeak ? [topWeak] : [],
        priorityScore: 62,
      }
    }
  } else if (!cold && bestRead) {
    primary = {
      kind: 'read_aloud',
      title: 'Best next: Read aloud',
      subtitle: topWeak
        ? `A calm passage run supports ${getSkillDefinition(topWeak).label.toLowerCase()} with clear audio feedback.`
        : 'Calm audio feedback to settle sounds and rhythm before longer live scenes.',
      reason: 'skill_read_primary',
      targetId: bestRead.id,
      relatedSkillIds: topWeak ? [topWeak] : weakIds.slice(0, 2),
      priorityScore: Math.round(Math.min(100, readScore + 6)),
    }
    const slug = bestScenario?.slug ?? slugFromPractice ?? scenarioSlugsSupportingSkill(topWeak, 1)[0]
    if (slug) {
      secondary = {
        kind: 'scenario',
        title: `Also great: ${slug.replace(/-/g, ' ')}`,
        subtitle: 'Short live dialogue to land the same skills under light pressure.',
        reason: 'skill_scenario_after_read',
        targetId: slug,
        relatedSkillIds: weakIds.filter((id) => skillsForScenarioSlug(slug).includes(id)).slice(0, 3),
        priorityScore: 58,
      }
    } else {
      secondary = {
        kind: 'coach',
        title: 'Language Coach',
        subtitle: coachSubtitleForStyle(coachStyle),
        reason: 'skill_flex',
        targetId: 'language_coach',
        relatedSkillIds: weakIds.slice(0, 3),
        priorityScore: 56,
        coachStyleHint: coachStyle,
      }
    }
  } else {
    primary = {
      kind: 'coach',
      title: 'Best next: Language Coach',
      subtitle: coachSubtitleForStyle(coachStyle),
      reason: 'cold_or_soft_skill_coach',
      targetId: 'language_coach',
      relatedSkillIds: weakIds.slice(0, 3),
      priorityScore: cold ? 50 : 62,
      coachStyleHint: coachStyle,
    }
    secondary = {
      kind: 'read_aloud',
      title: 'Also great: Read aloud',
      subtitle: 'Easy warm-up lines while your skill picture keeps forming.',
      reason: 'skill_support_cold',
      targetId: 'everyday_dutch',
      relatedSkillIds: topWeak ? [topWeak] : [],
      priorityScore: 48,
    }
  }

  const encSkill = strongIds[0]
  const encouragement: SkillRecommendation | null = encSkill
    ? {
        kind: 'encouragement',
        title: 'Strength to lean on',
        subtitle: `You’re strong in ${getSkillDefinition(encSkill).label.toLowerCase()} — let that confidence carry the next session.`,
        reason: 'strength_echo',
        targetId: null,
        relatedSkillIds: [encSkill],
        priorityScore: 40,
      }
    : null

  if (primary?.kind === 'coach' && !primary.coachStyleHint) {
    primary = { ...primary, coachStyleHint: coachStyle }
  }

  return {
    items,
    bundle: {
      primary,
      secondary,
      encouragement,
      focusChip,
      generatedAt,
    },
  }
}

/** Persisted shape for {@link UserSkillProfile.recommendations}. */
export function buildSkillRecommendationsBundle(params: {
  profile: UserLearningProfile
  metrics: Partial<Record<SkillId, SkillMetric>>
}): NonNullable<UserSkillProfile['recommendations']> {
  const plan = buildSkillDrivenRecommendationPlan(params)
  const { bundle } = plan
  return {
    primary: bundle.primary,
    secondary: bundle.secondary,
    encouragement: bundle.encouragement,
    focusChip: bundle.focusChip ?? undefined,
    generatedAt: bundle.generatedAt,
  }
}
