/**
 * Adaptive personalization layer for dedicated Speak Live scenarios (FluentCopilot).
 * Read-only over {@link UserLearningProfile} — does not change scenario assets, routing, or eval wiring.
 */
import { UX_SCENARIO_ONE_LINER_COLD, uxScenarioAdaptiveUserLine } from './conversationMemoryUxCopy'
import { listeningMemoryScenarioMerge } from './listeningMemoryAdaptation'
import { effectiveWeaknessItemScore } from './learningMemoryMergeScoring'
import { topWeaknessLabels } from './learningMemoryRecommendationService'
import type { ScenarioPerformanceSummary, UserLearningProfile } from './userLearningProfileDocument'

export type ScenarioLiveDimensionPack = {
  vocabularyComplexity: 'simpler' | 'neutral' | 'richer'
  responseLength: 'shorter' | 'normal' | 'longer_ok'
  followUpDepth: 'confirm_more' | 'normal' | 'deeper'
  pressure: 'low' | 'normal' | 'higher'
  naturalnessExpectation: 'natural' | 'normal' | 'forgiving'
  tolerance: 'patient' | 'normal' | 'tighter_pacing'
  /** High-level stance for this session beat — maps to reinforce / stretch / balanced. */
  sessionStance: 'reinforce' | 'stretch' | 'balanced'
}

export type ScenarioLivePersonalizationPayload = {
  scenarioId: string
  scenarioSlug: string
  userLevel: string | null
  scenarioRollingScore: number | null
  scenarioConfidence: number | null
  scenarioStrengthSignals: string[]
  scenarioWeaknessSignals: string[]
  /** 0 = fresh, 1 = heavy repetition of this slug in recent history. */
  repetitionFatigue01: number
  reinforcementTargets: string[]
  stretchTargets: string[]
  dimensions: ScenarioLiveDimensionPack
  adaptivePromptHints: string[]
  /** Notes for downstream scoring / QA (English; optional consumers). */
  scoringEmphasisNotes: string[]
}

function normSlug(s: string): string {
  return s.trim().toLowerCase().replace(/-/g, '_')
}

function resolveScenarioPerformanceEntry(
  doc: UserLearningProfile,
  scenarioId: string,
  slugNorm: string,
): ScenarioPerformanceSummary | null {
  const direct = doc.scenarioPerformance[scenarioId]
  if (direct) return direct
  for (const p of Object.values(doc.scenarioPerformance)) {
    const slug = normSlug(p.scenarioSlug ?? '')
    if (slug && slug === slugNorm) return p
  }
  return null
}

function repetitionFatigue(doc: UserLearningProfile, slugNorm: string): number {
  let n = 0
  for (const s of doc.recentScenarioSlugs.slice(-8)) {
    if (normSlug(s) === slugNorm) n += 1
  }
  return Math.min(1, n / 5)
}

function topWeakVocabLabels(doc: UserLearningProfile, max: number): string[] {
  return [...doc.weakVocabulary]
    .filter((v) => v.confidence >= 0.22)
    .sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a))
    .map((v) => v.displayText || v.normalizedKey)
    .filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, max)
}

function topWeakPatternLabels(doc: UserLearningProfile, max: number): string[] {
  return [...doc.weakGrammarPatterns]
    .filter((p) => p.confidence >= 0.22)
    .sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a))
    .map((p) => p.label)
    .filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, max)
}

function globalWeakText(doc: UserLearningProfile): string {
  return [...doc.activeFocusAreas, ...topWeaknessLabels(doc, 8)].join(' ').toLowerCase()
}

function slugHints(slugNorm: string, globalWeak: string): string[] {
  const h: string[] = []
  if (slugNorm === 'directions_getting_somewhere' || slugNorm === 'train_station' || slugNorm === 'train-station') {
    if (/prep|route|richting|naar |tussen |achter /i.test(globalWeak)) {
      h.push('Prefer short route legs with one confirmation (“dus …?”) before adding the next move.')
    }
    if (/question|vrag|wie |wat |hoe /i.test(globalWeak)) {
      h.push('Model clean question shapes the learner can mirror in Dutch without naming grammar.')
    }
  }
  if (slugNorm === 'ordering_food' || slugNorm === 'supermarket_shop') {
    if (/polite|beleefd|alstublieft|graag|mag ik/i.test(globalWeak)) {
      h.push('Weave polite request forms naturally in your Dutch lines.')
    }
  }
  if (slugNorm === 'phone_call' || slugNorm === 'small_talk') {
    h.push('Keep turns compact; one follow-up at a time to reduce cognitive load.')
  }
  return h.slice(0, 4)
}

/**
 * Builds a structured payload for the active scenario. Safe when profile rows are sparse (neutral dimensions).
 */
export function buildScenarioLivePersonalizationPayload(
  doc: UserLearningProfile,
  scenarioId: string,
  scenarioSlugNorm: string,
): ScenarioLivePersonalizationPayload {
  const slug = normSlug(scenarioSlugNorm)
  const perf = resolveScenarioPerformanceEntry(doc, scenarioId, slug)
  const rolling = perf?.rollingScore ?? perf?.recentScore ?? null
  const conf = perf?.confidence ?? null
  const strongSubs = [...(perf?.strongSubskills ?? [])].map((s) => s.trim()).filter(Boolean).slice(0, 4)
  const weakSubs = [...(perf?.weakSubskills ?? [])].map((s) => s.trim()).filter(Boolean).slice(0, 4)
  const fatigue01 = repetitionFatigue(doc, slug)
  const globalWeak = globalWeakText(doc)

  let sessionStance: ScenarioLiveDimensionPack['sessionStance'] = 'balanced'
  if (rolling != null && rolling < 70) sessionStance = 'reinforce'
  else if (rolling != null && rolling >= 83 && (conf ?? 0) >= 0.28) sessionStance = 'stretch'

  const dims: ScenarioLiveDimensionPack = {
    vocabularyComplexity: 'neutral',
    responseLength: 'normal',
    followUpDepth: 'normal',
    pressure: 'normal',
    naturalnessExpectation: 'natural',
    tolerance: 'normal',
    sessionStance,
  }

  if (sessionStance === 'reinforce') {
    dims.vocabularyComplexity = 'simpler'
    dims.responseLength = 'shorter'
    dims.followUpDepth = 'confirm_more'
    dims.pressure = 'low'
    dims.tolerance = 'patient'
    dims.naturalnessExpectation = 'forgiving'
  } else if (sessionStance === 'stretch') {
    dims.vocabularyComplexity = 'richer'
    dims.responseLength = 'longer_ok'
    dims.followUpDepth = 'deeper'
    dims.pressure = 'higher'
    dims.naturalnessExpectation = 'natural'
  }

  if (fatigue01 >= 0.45) {
    dims.tolerance = 'patient'
    dims.pressure = 'low'
  }

  const reinforcementTargets: string[] = []
  for (const w of weakSubs) {
    if (!reinforcementTargets.includes(w)) reinforcementTargets.push(w)
  }
  for (const l of topWeakPatternLabels(doc, 2)) {
    if (!reinforcementTargets.includes(l)) reinforcementTargets.push(l)
  }
  for (const v of topWeakVocabLabels(doc, 2)) {
    if (!reinforcementTargets.includes(v)) reinforcementTargets.push(v)
  }
  if (!reinforcementTargets.length && doc.activeFocusAreas.length) {
    reinforcementTargets.push(...doc.activeFocusAreas.slice(0, 2))
  }

  const stretchTargets: string[] = []
  if (sessionStance === 'stretch') {
    if (slug === 'train_station' || slug === 'train-station') {
      stretchTargets.push('Add one realistic transfer or platform-detail beat without stacking questions.')
    } else if (slug === 'directions_getting_somewhere') {
      stretchTargets.push('Add a second short leg (still one confirmation per leg).')
    } else {
      stretchTargets.push('Offer one optional extra detail the learner may decline.')
    }
  }

  const adaptivePromptHints: string[] = [
    ...slugHints(slug, globalWeak),
    fatigue01 >= 0.45
      ? 'Rotate stems and openings — repetition fatigue for this scene; avoid déjà-vu questions.'
      : '',
    sessionStance === 'reinforce'
      ? 'Prioritize clarity and success over density; model phrasing the learner can echo.'
      : sessionStance === 'stretch'
        ? 'Invite richer but still scene-realistic Dutch; keep follow-ups single-threaded.'
        : 'Balance warmth with light challenge; default scene pacing.',
  ].filter(Boolean)

  const scoringEmphasisNotes: string[] = []
  if (sessionStance === 'reinforce') {
    scoringEmphasisNotes.push('Prefer rewarding intelligibility and task completion over micro-error density.')
  } else if (sessionStance === 'stretch') {
    scoringEmphasisNotes.push('Allow slightly longer learner turns; weight richer vocabulary use when natural.')
  }
  if (fatigue01 >= 0.45) {
    scoringEmphasisNotes.push('Down-weight repeated identical prompts in automated QA if present.')
  }

  const listeningMerge = listeningMemoryScenarioMerge(doc, slug, { sessionStance: dims.sessionStance })
  Object.assign(dims, listeningMerge.dimensionPatches)
  adaptivePromptHints.push(...listeningMerge.hints)
  scoringEmphasisNotes.push(...listeningMerge.scoringNotes)

  return {
    scenarioId,
    scenarioSlug: slug,
    userLevel: doc.levelEstimate,
    scenarioRollingScore: rolling,
    scenarioConfidence: conf,
    scenarioStrengthSignals: strongSubs,
    scenarioWeaknessSignals: weakSubs,
    repetitionFatigue01: fatigue01,
    reinforcementTargets: reinforcementTargets.slice(0, 5),
    stretchTargets: stretchTargets.slice(0, 3),
    dimensions: dims,
    adaptivePromptHints: adaptivePromptHints.slice(0, 12),
    scoringEmphasisNotes: scoringEmphasisNotes.slice(0, 7),
  }
}

/** Long English block appended to structured scenario system prompts (non–Language Coach). */
export function formatScenarioLivePersonalizationForPrompt(p: ScenarioLivePersonalizationPayload): string {
  const d = p.dimensions
  return [
    '--- FluentCopilot adaptive scenario layer (English; INTERNAL — never read as a learner-facing list) ---',
    `scenarioId=${p.scenarioId} · slug=${p.scenarioSlug}`,
    `Learner level (estimate): ${p.userLevel ?? 'unknown'} · rollingScore=${p.scenarioRollingScore ?? 'n/a'} · profileConfidence=${p.scenarioConfidence != null ? p.scenarioConfidence.toFixed(2) : 'n/a'} · repetitionFatigue=${p.repetitionFatigue01.toFixed(2)}`,
    `Scene strengths (subskills/heuristics): ${p.scenarioStrengthSignals.length ? p.scenarioStrengthSignals.join(' · ') : '(none recorded)'}`,
    `Scene weaknesses (subskills/heuristics): ${p.scenarioWeaknessSignals.length ? p.scenarioWeaknessSignals.join(' · ') : '(none recorded)'}`,
    `Reinforcement targets (max a few across the session): ${p.reinforcementTargets.length ? p.reinforcementTargets.join(' · ') : '(derive gently from global focus)'}.`,
    `Stretch ideas (only if stance is stretch): ${p.stretchTargets.length ? p.stretchTargets.join(' · ') : '(none)'}.`,
    'Adjustable dimensions for this session (obey without announcing):',
    `- vocabularyComplexity=${d.vocabularyComplexity}; responseLength=${d.responseLength}; followUpDepth=${d.followUpDepth}`,
    `- pressure=${d.pressure}; naturalnessExpectation=${d.naturalnessExpectation}; tolerance=${d.tolerance}; sessionStance=${d.sessionStance}`,
    'Adaptive hints:',
    ...p.adaptivePromptHints.map((h) => `- ${h}`),
    p.scoringEmphasisNotes.length ? `Scoring / QA emphasis (internal): ${p.scoringEmphasisNotes.join(' | ')}` : '',
    '--- End adaptive scenario layer ---',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Ultra-compact tail for micro / ultra-lean prompts. */
export function formatScenarioLiveMicroTail(p: ScenarioLivePersonalizationPayload): string {
  const d = p.dimensions
  const r0 = p.reinforcementTargets[0]?.replace(/\s+/g, ' ').slice(0, 48) ?? ''
  const parts = [
    `st:${d.sessionStance}`,
    `v:${d.vocabularyComplexity}`,
    `fu:${d.followUpDepth}`,
    `fat:${p.repetitionFatigue01.toFixed(1)}`,
    r0 ? `t:${r0}` : '',
  ].filter(Boolean)
  return parts.join('|')
}

/** One consumer-friendly line for hubs (Talk continue, etc.). */
export function formatScenarioAdaptiveOneLiner(doc: UserLearningProfile, scenarioSlugNorm: string): string | null {
  const slug = normSlug(scenarioSlugNorm)
  const scenarioId =
    Object.keys(doc.scenarioPerformance).find((id) => normSlug(doc.scenarioPerformance[id]?.scenarioSlug ?? '') === slug) ??
    slug
  const p = buildScenarioLivePersonalizationPayload(doc, scenarioId, slug)
  if (doc.totalSessionsObserved < 2) {
    return UX_SCENARIO_ONE_LINER_COLD
  }
  const stance = p.dimensions.sessionStance
  const rt = p.reinforcementTargets[0]?.trim() || null
  return uxScenarioAdaptiveUserLine(stance, rt)
}
