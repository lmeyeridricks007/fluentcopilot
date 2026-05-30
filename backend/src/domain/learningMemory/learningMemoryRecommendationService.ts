import type { LiveSessionEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import {
  UX_BEST_NEXT_READ_ALOUD_FALLBACK,
  UX_COLD_BEST_NEXT_STEP,
  UX_COLD_START_MESSAGE,
  UX_RIBBON_CONFIDENCE_EARLY,
  UX_RIBBON_CONFIDENCE_STABLE,
  UX_REPORT_COLD_FALLBACK_LINE,
  uxBestNextScenarioTitle,
  uxRibbonFallbackRefining,
  uxRibbonImproving,
  uxRibbonRecurringPattern,
  uxRibbonSessionEcho,
  uxRibbonSteadyStrength,
  uxReportNextStepSessionAnchored,
  uxWorkingOnChipFallbackDual,
  uxWorkingOnChipFallbackSingle,
} from './conversationMemoryUxCopy'
import {
  buildFluentLearningRecommendations,
  fluentRecommendationsFromPracticeRows,
  type FluentLearningRecommendation,
  type ReadAloudGenProfileId,
} from './fluentLearningRecommendationEngine'
import { effectiveWeaknessItemScore, LOW_CONFIDENCE_FOCUS_FLOOR } from './learningMemoryMergeScoring'
import { LISTENING_MEMORY_SIGNAL_HINT_TAIL } from './listeningMemorySignalTypes'
import type { UserLearningProfile } from './userLearningProfileDocument'
import { buildSkillReportInsightLines } from '../skills/skillReportSurfaces'

export type { FluentLearningRecommendation, ReadAloudGenProfileId } from './fluentLearningRecommendationEngine'
export {
  buildSpeakingAdaptivePersonalizationHooksV1,
  type SpeakingAdaptivePersonalizationHooksV1,
} from './speakingAdaptivePersonalizationHooks'

const COLD_START_SESSIONS = 2

/** Aggregated coaching / UX hints derived from the profile (not persisted separately). */
export type PracticeRecommendations = {
  recommendedNextScenarioSlug: string | null
  recommendedNextScenarioBecause: string | null
  recommendedReadAloudProfile: ReadAloudGenProfileId | null
  recommendedReadAloudBecause: string | null
  recommendedFreeTalkThemes: string[]
  workingOnChip: string | null
  bestNextStep: string | null
  coldStart: boolean
  coldStartMessage: string | null
  /** Ranked structured recommendations (scenario, read-aloud, themes, chip, report step). */
  recommendations: FluentLearningRecommendation[]
}

function pronunciationLabel(p: { targetKey: string; issueType: string }): string {
  const i = p.targetKey.indexOf(':')
  const surface = i > 0 ? p.targetKey.slice(0, i).trim() : p.targetKey.trim()
  const readable = (surface || p.targetKey).trim()
  if (!readable) return p.targetKey.trim()
  const it = (p.issueType || '').trim().toLowerCase()
  /** Omit generic / unclassified types — "(unknown)" is confusing in hub copy. */
  if (!it || it === 'unknown') return readable
  return `${readable} (${it})`
}

/** Ranked human labels for weaknesses (vocabulary, grammar patterns, pronunciation). */
export function topWeaknessLabels(doc: UserLearningProfile, max: number): string[] {
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
    scored.push({
      label: p.label,
      score: effectiveWeaknessItemScore(p),
    })
  }
  for (const pr of doc.pronunciationIssues) {
    if (pr.confidence < LOW_CONFIDENCE_FOCUS_FLOOR) continue
    scored.push({
      label: pronunciationLabel(pr),
      score: effectiveWeaknessItemScore(pr),
    })
  }
  for (const ls of doc.listeningMemorySignals ?? []) {
    if (ls.confidence < LOW_CONFIDENCE_FOCUS_FLOOR) continue
    const tail = LISTENING_MEMORY_SIGNAL_HINT_TAIL[ls.signalId] ?? ''
    scored.push({
      label: tail.trim() ? `${ls.label} — ${tail}` : ls.label,
      score: effectiveWeaknessItemScore(ls),
    })
  }
  return [...scored]
    .sort((a, b) => b.score - a.score)
    .map((x) => x.label)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, max)
}

/** Top vocabulary rows by merge-engine score (for dashboards / debug). */
export function topWeakWordsForProfile(doc: UserLearningProfile, max: number) {
  return [...doc.weakVocabulary]
    .filter((v) => v.confidence >= 0.12)
    .sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a))
    .slice(0, max)
}

/** Top grammar pattern rows by merge-engine score. */
export function topWeakPatternsForProfile(doc: UserLearningProfile, max: number) {
  return [...doc.weakGrammarPatterns]
    .filter((p) => p.confidence >= 0.12)
    .sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a))
    .slice(0, max)
}

/** Top pronunciation issue rows by merge-engine score. */
export function topPronunciationIssuesForProfile(doc: UserLearningProfile, max: number) {
  return [...doc.pronunciationIssues]
    .filter((p) => p.confidence >= 0.12)
    .sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a))
    .slice(0, max)
}

type FocusCandidate = { label: string; score: number }

function bestLanguageFocus(doc: UserLearningProfile): FocusCandidate | null {
  const c: FocusCandidate[] = []
  for (const v of doc.weakVocabulary) {
    if (v.confidence < LOW_CONFIDENCE_FOCUS_FLOOR) continue
    c.push({ label: v.displayText || v.normalizedKey, score: effectiveWeaknessItemScore(v) })
  }
  for (const p of doc.weakGrammarPatterns) {
    if (p.confidence < LOW_CONFIDENCE_FOCUS_FLOOR) continue
    c.push({ label: p.label, score: effectiveWeaknessItemScore(p) })
  }
  return c.sort((a, b) => b.score - a.score)[0] ?? null
}

function bestPronunciationFocus(doc: UserLearningProfile): FocusCandidate | null {
  const c: FocusCandidate[] = []
  for (const pr of doc.pronunciationIssues) {
    if (pr.confidence < LOW_CONFIDENCE_FOCUS_FLOOR) continue
    c.push({ label: pronunciationLabel(pr), score: effectiveWeaknessItemScore(pr) })
  }
  return c.sort((a, b) => b.score - a.score)[0] ?? null
}

function bestListeningFocus(doc: UserLearningProfile): FocusCandidate | null {
  const c: FocusCandidate[] = []
  for (const s of doc.listeningMemorySignals ?? []) {
    if (s.confidence < LOW_CONFIDENCE_FOCUS_FLOOR) continue
    c.push({ label: `${s.label} (listening)`, score: effectiveWeaknessItemScore(s) * 0.93 })
  }
  return c.sort((a, b) => b.score - a.score)[0] ?? null
}

function bestScenarioFitFocus(doc: UserLearningProfile): FocusCandidate | null {
  const c: FocusCandidate[] = []
  for (const h of doc.hesitationPatterns) {
    if (h.confidence < LOW_CONFIDENCE_FOCUS_FLOOR) continue
    c.push({ label: `${h.label} (fluency)`, score: effectiveWeaknessItemScore(h) * 0.95 })
  }
  for (const s of Object.values(doc.scenarioPerformance)) {
    const roll = s.rollingScore ?? s.recentScore
    if (typeof roll !== 'number' || roll >= 76) continue
    const gap = Math.max(0, 78 - roll) / 22
    for (const w of s.weakSubskills ?? []) {
      const t = w.trim()
      if (!t) continue
      c.push({
        label: `${t} (scenario fit)`,
        score: gap * 0.55 * (s.confidence ?? 0.45) + 0.02,
      })
    }
  }
  return c.sort((a, b) => b.score - a.score)[0] ?? null
}

/**
 * At most three balanced focus strings: language, pronunciation, scenario/fluency.
 * Low-confidence evidence is excluded so noise does not dominate.
 */
export function computeBalancedActiveFocusAreas(doc: UserLearningProfile, max = 3): string[] {
  const lang = bestLanguageFocus(doc)
  const pron = bestPronunciationFocus(doc)
  const listen = bestListeningFocus(doc)
  const scen = bestScenarioFitFocus(doc)
  const picks: string[] = []
  const seen = new Set<string>()
  const tryAdd = (x: FocusCandidate | null) => {
    if (!x || x.score < 0.06) return
    const k = x.label.toLowerCase()
    if (seen.has(k)) return
    seen.add(k)
    picks.push(x.label)
  }
  tryAdd(lang)
  tryAdd(pron)
  tryAdd(listen)
  tryAdd(scen)
  if (picks.length < max) {
    for (const lab of topWeaknessLabels(doc, 14)) {
      if (picks.length >= max) break
      const k = lab.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      picks.push(lab)
    }
  }
  return picks.slice(0, max)
}

/**
 * Refreshes denormalized focus fields and structured `practiceRecommendations` on the profile.
 * Call after merges (or on read if you need guarantees — merge path already invokes this).
 */
export function recomputeDerivedAndRecommendations(doc: UserLearningProfile): void {
  const generatedAt = new Date().toISOString()
  doc.activeFocusAreas = computeBalancedActiveFocusAreas(doc, 3)

  const strong: string[] = []
  for (const s of Object.values(doc.scenarioPerformance)) {
    if (typeof s.rollingScore === 'number' && s.rollingScore >= 78 && s.confidence >= 0.28) {
      for (const sub of s.strongSubskills ?? []) {
        const t = sub.trim()
        if (t && !strong.includes(t)) strong.push(t)
      }
      if (s.scenarioSlug) strong.push(s.scenarioSlug.replace(/-/g, ' '))
    }
  }
  const mergedStrong: string[] = [...strong]
  for (const x of doc.strongestAreas ?? []) {
    const t = x.trim()
    if (t && !mergedStrong.includes(t)) mergedStrong.push(t)
  }
  doc.strongestAreas = mergedStrong.slice(0, 10)

  const fluent = buildFluentLearningRecommendations(doc)
  doc.practiceRecommendations = fluent.map((f) => ({
    type: f.type,
    targetId: f.targetId,
    reason: f.reason,
    confidence: f.confidence,
    generatedAt,
    title: f.title,
    subtitle: f.subtitle,
    priorityScore: f.priorityScore,
  }))
}

export function buildPracticeRecommendations(doc: UserLearningProfile): PracticeRecommendations {
  recomputeDerivedAndRecommendations(doc)
  const cold = doc.totalSessionsObserved < COLD_START_SESSIONS
  const recommendations = fluentRecommendationsFromPracticeRows(doc.practiceRecommendations)
  const scenarioRec = doc.practiceRecommendations.find((r) => r.type === 'speak_live_scenario')
  const readRec = doc.practiceRecommendations.find((r) => r.type === 'read_aloud_profile')
  const chipRec = doc.practiceRecommendations.find((r) => r.type === 'focus_chip')
  const reportRec = doc.practiceRecommendations.find((r) => r.type === 'report_next_step')
  const top = topWeaknessLabels(doc, 2)
  const themes = doc.practiceRecommendations.filter((r) => r.type === 'free_talk_theme').map((r) => r.targetId ?? '')
  return {
    recommendedNextScenarioSlug: cold ? null : scenarioRec?.targetId ?? null,
    recommendedNextScenarioBecause: cold ? null : scenarioRec?.reason ?? null,
    recommendedReadAloudProfile: cold ? 'everyday_dutch' : ((readRec?.targetId as ReadAloudGenProfileId) ?? 'everyday_dutch'),
    recommendedReadAloudBecause: cold ? null : readRec?.reason ?? null,
    recommendedFreeTalkThemes: cold ? [] : themes.filter(Boolean),
    workingOnChip:
      chipRec?.subtitle?.trim() ??
      (cold || !top.length
        ? null
        : top.length === 1
          ? uxWorkingOnChipFallbackSingle(top[0])
          : uxWorkingOnChipFallbackDual(top[0], top[1])),
    bestNextStep: cold
      ? UX_COLD_BEST_NEXT_STEP
      : reportRec?.subtitle?.trim() ||
        (scenarioRec?.title?.trim()
          ? uxBestNextScenarioTitle(scenarioRec.title.trim())
          : UX_BEST_NEXT_READ_ALOUD_FALLBACK),
    coldStart: cold,
    coldStartMessage: cold ? UX_COLD_START_MESSAGE : null,
    recommendations,
  }
}

export function extractSessionWeakHintsForRibbon(evaluation: LiveSessionEvaluation): string[] {
  const hints: string[] = []
  const focus = evaluation.focusArea?.label?.trim()
  if (focus) hints.push(focus)
  for (const t of evaluation.turnEvaluations?.slice(-3) ?? []) {
    const first = t.transcriptCoaching?.issues?.[0]
    if (first) hints.push(`${first.area}: ${first.issue}`.slice(0, 120))
  }
  return [...new Set(hints)].slice(0, 4)
}

/** Session-only hints for read-aloud reports (no Speak Live evaluation shape). */
export function extractReadAloudWeakHintsForRibbon(result: {
  coaching?: { focusArea?: string }
  weakWords?: string[]
}): string[] {
  const hints: string[] = []
  const fa = result.coaching?.focusArea?.trim()
  if (fa) hints.push(fa)
  for (const w of result.weakWords ?? []) {
    const t = w.trim()
    if (t) hints.push(t)
  }
  return [...new Set(hints)].slice(0, 4)
}

export type ReportMemorySurfaces = {
  sessionEcho: string | null
  currentFocus: string | null
  recurringPattern: string | null
  improving: string | null
}

export type ReportRibbonNextPractice = {
  kind: 'speak_live' | 'read_aloud' | 'talk_hub'
  href: string
  label: string
}

/** API payload for subtle cross-session context on scenario, coach, and read-aloud reports. */
export type ReportLearningMemoryRibbon = {
  /** Legacy prose lines — kept small for older clients; prefer `surfaces` when present. */
  lines: string[]
  surfaces: ReportMemorySurfaces | null
  confidenceNote: string | null
  coldStart: boolean
  /** True when cross-session profile signals informed the ribbon (not cold start). */
  basedOnRecentSessions: boolean
  nextStep: { title: string; subtitle: string; reason: string } | null
  nextPractice?: ReportRibbonNextPractice | null
  /** Max 1–3 persistent skill insights; distinct from session-only surfaces. */
  skillInsights?: string[]
}

function normRibbonHint(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 96)
}

function buildSpeakLiveRunHref(scenarioId: string, level: string): string {
  const q = new URLSearchParams({
    scenarioId: scenarioId.trim(),
    level: (level.trim() || 'A2').slice(0, 12),
  })
  return `/app/talk/live/run?${q.toString()}`
}

function resolveRibbonNextPractice(
  rec: PracticeRecommendations,
  doc: UserLearningProfile,
  practiceLevel: string | null | undefined,
): ReportRibbonNextPractice | null {
  if (rec.coldStart) return null
  const level = practiceLevel?.trim() || 'A2'
  const slug = rec.recommendedNextScenarioSlug?.trim()
  const scenarioRow = doc.practiceRecommendations.find((r) => r.type === 'speak_live_scenario')
  const readRow = doc.practiceRecommendations.find((r) => r.type === 'read_aloud_profile')
  if (slug) {
    const title = scenarioRow?.title?.trim() || 'Speak Live'
    return { kind: 'speak_live', href: buildSpeakLiveRunHref(slug, level), label: `Start ${title}` }
  }
  if (readRow) {
    const t = readRow.title?.trim() || 'Read aloud'
    return { kind: 'read_aloud', href: '/app/talk/read-aloud', label: `Open ${t}` }
  }
  return null
}

function ribbonHintsOverlap(a: string, b: string): boolean {
  const na = normRibbonHint(a)
  const nb = normRibbonHint(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.length >= 12 && nb.length >= 12 && (na.includes(nb) || nb.includes(na))) return true
  return false
}

function improvingRibbonLine(doc: UserLearningProfile): string | null {
  const labels: string[] = []
  const push = (x: string) => {
    const t = x.trim()
    if (t && !labels.some((e) => ribbonHintsOverlap(e, t))) labels.push(t)
  }
  for (const v of doc.weakVocabulary) {
    if (!v.improving || v.confidence < LOW_CONFIDENCE_FOCUS_FLOOR) continue
    push(v.displayText || v.normalizedKey)
    if (labels.length >= 2) break
  }
  for (const p of doc.weakGrammarPatterns) {
    if (!p.improving || p.confidence < LOW_CONFIDENCE_FOCUS_FLOOR) continue
    push(p.label)
    if (labels.length >= 2) break
  }
  for (const pr of doc.pronunciationIssues) {
    if (!pr.improving || pr.confidence < LOW_CONFIDENCE_FOCUS_FLOOR) continue
    const i = pr.targetKey.indexOf(':')
    const surface = (i > 0 ? pr.targetKey.slice(0, i) : pr.targetKey).trim()
    if (surface) push(surface)
    if (labels.length >= 2) break
  }
  if (labels.length) {
    return uxRibbonImproving(labels.slice(0, 2))
  }
  const s = doc.strongestAreas?.[0]?.trim()
  if (s) return uxRibbonSteadyStrength(s)
  return null
}

export function buildReportPersonalizationRibbon(params: {
  doc: UserLearningProfile
  sessionWeakHints: string[]
  /** CEFR level for Speak Live deep links (session target level or read-aloud level). */
  practiceLevel?: string | null
}): ReportLearningMemoryRibbon {
  const rec = buildPracticeRecommendations(params.doc)
  const reportNext = rec.recommendations.find((r) => r.type === 'report_next_step')
  let nextStep = reportNext
    ? { title: reportNext.title, subtitle: reportNext.subtitle, reason: reportNext.reason }
    : null
  const primaryThread = params.sessionWeakHints.map((h) => h.trim()).find(Boolean) ?? ''
  if (nextStep && primaryThread) {
    const scenarioRec = rec.recommendations.find((r) => r.type === 'speak_live_scenario')
    const readRec = rec.recommendations.find((r) => r.type === 'read_aloud_profile')
    nextStep = {
      ...nextStep,
      subtitle: uxReportNextStepSessionAnchored(primaryThread, scenarioRec?.title ?? null, readRec?.title ?? null),
    }
  }
  if (rec.coldStart) {
    const line = rec.bestNextStep ?? UX_REPORT_COLD_FALLBACK_LINE
    return {
      lines: [line],
      surfaces: null,
      confidenceNote: null,
      coldStart: true,
      basedOnRecentSessions: false,
      nextStep: null,
      nextPractice: null,
      skillInsights: [],
    }
  }

  const weakLabels = topWeaknessLabels(params.doc, 4)
  const sessionEcho =
    params.sessionWeakHints.length > 0 ? uxRibbonSessionEcho(params.sessionWeakHints) : null

  const focusFromRec = rec.workingOnChip?.trim() || null
  const focusFromAreas = params.doc.activeFocusAreas[0]?.trim() || null
  const focusFromWeak = weakLabels[0] ?? null
  const focusCandidates = [focusFromRec, focusFromAreas, focusFromWeak].filter((x): x is string => Boolean(x?.trim()))
  let currentFocus: string | null = null
  for (const c of focusCandidates) {
    if (!sessionEcho || !ribbonHintsOverlap(c, sessionEcho)) {
      currentFocus = c
      break
    }
  }

  let recurringPattern: string | null = null
  for (const label of weakLabels) {
    if (!label) continue
    if (currentFocus && ribbonHintsOverlap(label, currentFocus)) continue
    if (sessionEcho && ribbonHintsOverlap(label, sessionEcho)) continue
    recurringPattern = uxRibbonRecurringPattern(label)
    break
  }

  let improving = improvingRibbonLine(params.doc)
  if (improving) {
    if (currentFocus && ribbonHintsOverlap(improving, currentFocus)) improving = null
    if (recurringPattern && improving && ribbonHintsOverlap(improving, recurringPattern)) improving = null
    if (sessionEcho && improving && ribbonHintsOverlap(improving, sessionEcho)) improving = null
  }

  const surfaces: ReportMemorySurfaces = {
    sessionEcho,
    currentFocus,
    recurringPattern,
    improving,
  }
  const hasSurface = Boolean(sessionEcho || currentFocus || recurringPattern || improving)
  const basedOnRecentSessions = Boolean(currentFocus || recurringPattern || improving)

  let confidenceNote: string | null = null
  if (recurringPattern && params.doc.totalSessionsObserved < 6) {
    confidenceNote = UX_RIBBON_CONFIDENCE_EARLY
  } else if (recurringPattern || (currentFocus && weakLabels.some((l) => l && currentFocus && ribbonHintsOverlap(l, currentFocus)))) {
    confidenceNote = UX_RIBBON_CONFIDENCE_STABLE
  }

  const lines: string[] = []
  if (!hasSurface) {
    if (sessionEcho) lines.push(sessionEcho)
    const top = params.doc.activeFocusAreas[0] ?? weakLabels[0]
    if (top) lines.push(uxRibbonFallbackRefining(top))
    if (rec.bestNextStep && lines.length < 2) lines.push(rec.bestNextStep)
    if (rec.recommendedReadAloudBecause && lines.length < 3) lines.push(rec.recommendedReadAloudBecause)
  }

  const skillInsights = buildSkillReportInsightLines({
    userSkillProfile: params.doc.userSkillProfile,
    sessionWeakHints: params.sessionWeakHints,
    coldStart: params.doc.totalSessionsObserved < COLD_START_SESSIONS,
    max: 3,
  })

  const nextPractice = resolveRibbonNextPractice(rec, params.doc, params.practiceLevel)

  return {
    lines: lines.slice(0, 3),
    surfaces: hasSurface ? surfaces : null,
    confidenceNote,
    coldStart: false,
    basedOnRecentSessions,
    nextStep,
    nextPractice,
    skillInsights,
  }
}
