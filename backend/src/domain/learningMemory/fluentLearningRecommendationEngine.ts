/**
 * FluentCopilot learning recommendations — ranked next steps from {@link UserLearningProfile}.
 * Kept separate from {@link learningMemoryRecommendationService} to avoid circular imports.
 */
import {
  FLUENT_FREE_TALK_UX_BY_ID,
  FLUENT_READ_ALOUD_UX,
  FLUENT_SCENARIO_UX_RULES,
  FLUENT_WEAK_SCENARIO_REASON,
  FLUENT_WEAK_SCENARIO_SUBTITLE,
  FLUENT_WEAK_SCENARIO_TITLE,
  UX_FOCUS_CHIP_REASON,
  UX_FOCUS_CHIP_TITLE,
  UX_REPORT_NEXT_STEP_DEFAULT,
  UX_REPORT_NEXT_STEP_REASON,
  UX_REPORT_NEXT_STEP_TITLE,
  uxFocusChipSubtitleBalance,
  uxFocusChipSubtitleCold,
  uxFocusChipSubtitleSingle,
  uxReportNextStepCold,
  uxReportNextStepWithRead,
  uxReportNextStepWithScenario,
} from './conversationMemoryUxCopy'
import type { MergeSessionType } from './learningMemoryMergeScoring'
import { LISTENING_MEMORY_SIGNAL_HINT_TAIL } from './listeningMemorySignalTypes'
import { effectiveWeaknessItemScore, LOW_CONFIDENCE_FOCUS_FLOOR } from './learningMemoryMergeScoring'
import type { UserLearningProfile } from './userLearningProfileDocument'
import { inferReadAloudPassageProfileIdFromSkillMetrics } from './readAloudSkillProfileInference'
import { weakSkillScenarioOverlapHits } from '../skills/scenarioSkillTags'

export type FluentRecommendationType =
  | 'speak_live_scenario'
  | 'read_aloud_profile'
  | 'free_talk_theme'
  | 'focus_chip'
  | 'report_next_step'

export type FluentLearningRecommendation = {
  type: FluentRecommendationType
  targetId: string
  title: string
  subtitle: string
  reason: string
  confidence: number
  /** Higher = surfaced first (0–100 scale for UX). */
  priorityScore: number
}

export type ReadAloudGenProfileId =
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

const COLD_START_SESSIONS = 2

function pronunciationLabel(p: { targetKey: string; issueType: string }): string {
  const i = p.targetKey.indexOf(':')
  const surface = i > 0 ? p.targetKey.slice(0, i).trim() : p.targetKey.trim()
  const readable = surface || p.targetKey
  return `${readable} (${p.issueType})`
}

/** Lightweight weakness labels for rule matching (mirrors recommendation service thresholds). */
function weaknessLabelStrings(doc: UserLearningProfile, max: number): string[] {
  const scored: Array<{ label: string; score: number }> = []
  for (const v of doc.weakVocabulary) {
    if (v.confidence < LOW_CONFIDENCE_FOCUS_FLOOR) continue
    scored.push({
      label: v.displayText || v.normalizedKey,
      score: effectiveWeaknessItemScore(v),
    })
  }
  for (const p of doc.weakGrammarPatterns) {
    if (p.confidence < LOW_CONFIDENCE_FOCUS_FLOOR) continue
    scored.push({ label: p.label, score: effectiveWeaknessItemScore(p) })
  }
  for (const pr of doc.pronunciationIssues) {
    if (pr.confidence < LOW_CONFIDENCE_FOCUS_FLOOR) continue
    scored.push({ label: pronunciationLabel(pr), score: effectiveWeaknessItemScore(pr) })
  }
  return [...scored]
    .sort((a, b) => b.score - a.score)
    .map((x) => x.label)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, max)
}

function listeningHintText(doc: UserLearningProfile): string {
  return (doc.listeningMemorySignals ?? [])
    .filter((s) => s.confidence >= LOW_CONFIDENCE_FOCUS_FLOOR)
    .sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a))
    .slice(0, 4)
    .map((s) => LISTENING_MEMORY_SIGNAL_HINT_TAIL[s.signalId] ?? '')
    .join(' ')
}

function weaknessText(doc: UserLearningProfile): string {
  return [
    ...doc.activeFocusAreas,
    ...weaknessLabelStrings(doc, 12),
    ...doc.strongestAreas.slice(0, 4),
    listeningHintText(doc),
  ]
    .join(' ')
    .toLowerCase()
}

type ScenarioRule = (typeof FLUENT_SCENARIO_UX_RULES)[number]

/** Scenario ids aligned with `speakLiveScenarios` / launcher (mostly snake_case; train is hyphenated). */
const SCENARIO_RULES: ScenarioRule[] = FLUENT_SCENARIO_UX_RULES

const READ_ALOUD_COPY = FLUENT_READ_ALOUD_UX as Record<
  ReadAloudGenProfileId,
  { title: string; subtitle: string; reason: string; base: number }
>

function normSlug(s: string): string {
  return s.replace(/-/g, '_').toLowerCase()
}

function countRecentSlugFatigue(doc: UserLearningProfile, slug: string): number {
  const want = normSlug(slug)
  let n = 0
  for (const s of doc.recentScenarioSlugs.slice(-6)) {
    if (normSlug(s) === want) n += 1
  }
  return n
}

function modalityBonus(doc: UserLearningProfile, kind: 'scenario' | 'read_aloud'): number {
  const last = doc.lastSessionModality as MergeSessionType | null | undefined
  if (!last) return 1
  if (kind === 'read_aloud' && (last === 'speak_live' || last === 'text_conversation')) return 1.06
  if (kind === 'read_aloud' && last === 'listening') return 1.04
  if (kind === 'scenario' && last === 'read_aloud') return 1.05
  if (kind === 'scenario' && last === 'listening') return 1.05
  if (kind === 'scenario' && last === 'speak_live') return 0.97
  return 1
}

function pickReadAloudId(labels: string): ReadAloudGenProfileId {
  const t = labels.toLowerCase()
  if (/pronun|klinker|vowel|consonant|stress|gch|sch|\bui\b|\beu\b|\bij\b|hard.*g|zachte g/i.test(t)) {
    return 'weak_sounds_focus'
  }
  if (/woordenschat|lexiek|vocabulary|sticky words|herhaalde woorden/i.test(t)) return 'weak_vocabulary_focus'
  if (/grammar|woordvolgorde|zin|tijd|werkwoord|vraag|vrag/i.test(t)) return 'grammar_focus'
  if (/pause|fluency|flow|ritme|tempo|vulsel|ehm/i.test(t)) return 'fluency_focus'
  if (/scenario|scene|speak live|platform|station|winkel/i.test(t)) return 'scenario_linked'
  if (t.length > 40) return 'mixed_review'
  return 'everyday_dutch'
}

function freeTalkCandidates(doc: UserLearningProfile): FluentLearningRecommendation[] {
  const out: FluentLearningRecommendation[] = []
  const labels = weaknessText(doc)
  const push = (id: string) => {
    const row = FLUENT_FREE_TALK_UX_BY_ID[id]
    if (!row) return
    out.push({
      type: 'free_talk_theme',
      targetId: id,
      title: row.title,
      subtitle: row.subtitle,
      reason: row.reason,
      confidence: 0.48,
      priorityScore: row.pr,
    })
  }
  if (/prep|naar |van |tussen /i.test(labels)) {
    push('prepositions_in_short_replies')
  }
  if (/question|vrag|wie |wat |hoe /i.test(labels)) {
    push('natural_question_openers')
  }
  if (doc.pronunciationIssues.some((p) => p.confidence >= LOW_CONFIDENCE_FOCUS_FLOOR)) {
    push('clear_word_shaping')
  }
  if (/afspraak|plan|agenda|tijd/i.test(labels)) {
    push('appointments_and_plans')
  }
  return out.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 2)
}

function scenarioCandidates(doc: UserLearningProfile, cold: boolean): FluentLearningRecommendation[] {
  if (cold) return []
  const text = weaknessText(doc)
  const scored: FluentLearningRecommendation[] = []
  const signalStrength = Math.min(
    1.2,
    0.5 + 0.035 * (doc.weakVocabulary.length + doc.weakGrammarPatterns.length + doc.pronunciationIssues.length),
  )
  for (const rule of SCENARIO_RULES) {
    if (!rule.re.test(text)) continue
    const fatigue = countRecentSlugFatigue(doc, rule.slug)
    const fatiguePenalty = 1 - Math.min(0.22, fatigue * 0.07)
    const overlap = weakSkillScenarioOverlapHits(doc, rule.slug)
    const skillScenarioBoost = 1 + Math.min(0.14, overlap * 0.045)
    const priority =
      rule.basePriority *
      fatiguePenalty *
      modalityBonus(doc, 'scenario') *
      (0.92 + 0.08 * Math.min(1, signalStrength)) *
      skillScenarioBoost
    scored.push({
      type: 'speak_live_scenario',
      targetId: rule.slug,
      title: rule.title,
      subtitle: rule.subtitle,
      reason: rule.reason,
      confidence: Math.min(0.9, 0.52 + fatiguePenalty * 0.18),
      priorityScore: Math.round(Math.min(100, priority)),
    })
  }
  const weakest = Object.values(doc.scenarioPerformance)
    .filter((s) => typeof s.rollingScore === 'number' && s.rollingScore < 72 && s.confidence >= 0.25)
    .sort((a, b) => (a.rollingScore ?? 100) - (b.rollingScore ?? 100))[0]
  if (weakest?.scenarioSlug) {
    const sid = weakest.scenarioSlug
    if (!scored.some((s) => normSlug(s.targetId) === normSlug(sid))) {
      const fatigue = countRecentSlugFatigue(doc, sid)
      const fatiguePenalty = 1 - Math.min(0.2, fatigue * 0.065)
      const overlapWeak = weakSkillScenarioOverlapHits(doc, sid)
      const skillScenarioBoost = 1 + Math.min(0.14, overlapWeak * 0.045)
      scored.push({
        type: 'speak_live_scenario',
        targetId: sid,
        title: FLUENT_WEAK_SCENARIO_TITLE,
        subtitle: FLUENT_WEAK_SCENARIO_SUBTITLE,
        reason: FLUENT_WEAK_SCENARIO_REASON,
        confidence: Math.min(0.85, 0.48 + (weakest.confidence ?? 0.4) * 0.35),
        priorityScore: Math.round(58 * fatiguePenalty * modalityBonus(doc, 'scenario') * skillScenarioBoost),
      })
    }
  }
  return scored.sort((a, b) => b.priorityScore - a.priorityScore)
}

function readAloudCandidate(doc: UserLearningProfile, cold: boolean): FluentLearningRecommendation | null {
  const labels = weaknessText(doc)
  const id: ReadAloudGenProfileId =
    !cold ? inferReadAloudPassageProfileIdFromSkillMetrics(doc) ?? pickReadAloudId(labels) : pickReadAloudId(labels)
  const copy = READ_ALOUD_COPY[cold ? 'everyday_dutch' : id]
  const priority = Math.round(copy.base * modalityBonus(doc, 'read_aloud') * (cold ? 0.85 : 1))
  return {
    type: 'read_aloud_profile',
    targetId: cold ? 'everyday_dutch' : id,
    title: copy.title,
    subtitle: copy.subtitle,
    reason: copy.reason,
    confidence: cold ? 0.42 : Math.min(0.88, 0.55 + (doc.totalSessionsObserved >= 4 ? 0.06 : 0)),
    priorityScore: Math.min(100, priority),
  }
}

function focusChip(doc: UserLearningProfile, cold: boolean): FluentLearningRecommendation | null {
  const areas = doc.activeFocusAreas ?? []
  const chip =
    cold || !areas.length
      ? uxFocusChipSubtitleCold()
      : areas.length === 1
        ? uxFocusChipSubtitleSingle(areas[0])
        : uxFocusChipSubtitleBalance(areas[0], areas[1])
  const conf = cold ? 0.35 : Math.min(0.82, 0.45 + Math.min(areas.length, 3) * 0.08)
  return {
    type: 'focus_chip',
    targetId: 'focus_chip',
    title: UX_FOCUS_CHIP_TITLE,
    subtitle: chip,
    reason: UX_FOCUS_CHIP_REASON,
    confidence: conf,
    priorityScore: Math.round(55 + (cold ? 0 : conf * 28)),
  }
}

function reportNextStep(doc: UserLearningProfile, cold: boolean): FluentLearningRecommendation {
  const scenario = scenarioCandidates(doc, cold)[0]
  const read = readAloudCandidate(doc, cold)
  const body = cold
    ? uxReportNextStepCold()
    : scenario
      ? uxReportNextStepWithScenario(scenario.title)
      : read
        ? uxReportNextStepWithRead(read.title)
        : UX_REPORT_NEXT_STEP_DEFAULT
  const skillContinuityBoost =
    !cold && scenario ? Math.min(8, weakSkillScenarioOverlapHits(doc, scenario.targetId) * 3) : 0
  return {
    type: 'report_next_step',
    targetId: 'report_continuity',
    title: UX_REPORT_NEXT_STEP_TITLE,
    subtitle: body,
    reason: UX_REPORT_NEXT_STEP_REASON,
    confidence: cold ? 0.4 : 0.62,
    priorityScore: cold ? 42 : 64 + skillContinuityBoost,
  }
}

/**
 * Builds ranked recommendations. Call after `activeFocusAreas` is refreshed (see {@link recomputeDerivedAndRecommendations}).
 *
 * **Ranking (priorityScore):** rule `basePriority` × repetition-fatigue factor × last-modality bonus ×
 * a mild signal-strength multiplier for scenarios × overlap between weakest skill metrics and scenario skill tags;
 * read-aloud uses profile + modality; chips use fixed bands; report next step adds a small continuity boost when that overlap is strong.
 */
export function buildFluentLearningRecommendations(doc: UserLearningProfile): FluentLearningRecommendation[] {
  const cold = doc.totalSessionsObserved < COLD_START_SESSIONS
  const items: FluentLearningRecommendation[] = []

  const chip = focusChip(doc, cold)
  if (chip) items.push(chip)

  const ra = readAloudCandidate(doc, cold)
  if (ra) items.push(ra)

  for (const s of scenarioCandidates(doc, cold).slice(0, 2)) {
    items.push(s)
  }

  if (!cold) {
    for (const f of freeTalkCandidates(doc)) items.push(f)
  }

  items.push(reportNextStep(doc, cold))

  const seen = new Set<string>()
  const deduped: FluentLearningRecommendation[] = []
  for (const it of items.sort((a, b) => b.priorityScore - a.priorityScore)) {
    const k = `${it.type}:${it.targetId}`
    if (seen.has(k)) continue
    seen.add(k)
    deduped.push(it)
  }
  return deduped.slice(0, 10)
}

export function fluentRecommendationsFromPracticeRows(
  rows: Array<{
    type: string
    targetId: string | null
    reason: string
    confidence: number
    title?: string | null
    subtitle?: string | null
    priorityScore?: number | null
  }>,
): FluentLearningRecommendation[] {
  return rows.map((r) => ({
    type: r.type as FluentRecommendationType,
    targetId: r.targetId ?? '',
    title: (r.title && String(r.title).trim()) || r.reason.slice(0, 72),
    subtitle: (r.subtitle && String(r.subtitle).trim()) || '',
    reason: r.reason,
    confidence: r.confidence,
    priorityScore: typeof r.priorityScore === 'number' && Number.isFinite(r.priorityScore) ? r.priorityScore : 50,
  }))
}
