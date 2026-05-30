import type { SessionInsightHesitation, SessionInsightStrength, SessionLearningInsights } from './sessionLearningInsightTypes'
import type {
  HesitationPatternSummary,
  PronunciationIssue,
  ScenarioPerformanceSummary,
  UserLearningProfile,
  WeakGrammarPattern,
  WeakVocabularyItem,
} from './userLearningProfileDocument'
import { createEmptyUserLearningProfile } from './userLearningProfileDocument'
import {
  effectiveWeaknessItemScore,
  incomingConfidenceMultiplier,
  RECOVERY_IMPROVING_THRESHOLD,
  type MergeSessionType,
} from './learningMemoryMergeScoring'
import { recomputeDerivedAndRecommendations } from './learningMemoryRecommendationService'
import type { SkillEvidence } from '../skills/skillTypes'
import { mergeUserSkillProfileFromSession } from '../skills/skillProfileMerge'
import { mergeSpeakingTrendSignalsIntoProfile } from './speakingTrendSignalsMerge'

const MAX_VOCAB = 48
const MAX_PATTERNS = 32
const MAX_PRON = 36
const MAX_HES = 14

/** After this many consecutive misses, recovery gains accelerate slightly. */
const RECOVERY_MISS_BOOST_AFTER = 2
/** Max conservative severity decay per missed session (multiplicative cap). */
const MAX_SESSION_MISS_DECAY = 0.045

export type { MergeSessionType } from './learningMemoryMergeScoring'
export { effectiveWeaknessItemScore, incomingConfidenceMultiplier } from './learningMemoryMergeScoring'

export type MergeContext = {
  nowIso: string
  scenarioId: string | null
  sessionTypeWeight: number
  sessionType: MergeSessionType
  /**
   * Optional evidence mapped directly from session reports (atoms layer).
   * Appended after insight-derived evidence in the skill merge.
   */
  additionalSkillEvidence?: SkillEvidence[] | undefined
}

function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(aIso)
  const b = Date.parse(bIso)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.max(0, (b - a) / 86400000)
}

function applyMissDecayAndRecovery<T extends { lastSeenAt: string; severityScore: number; confidence: number; recoveryScore: number; mergeMissStreak?: number; improving?: boolean }>(
  row: T,
  nowIso: string,
  incomingHit: boolean,
): T {
  if (incomingHit) {
    return {
      ...row,
      mergeMissStreak: 0,
      improving: false,
    }
  }
  const miss = (row.mergeMissStreak ?? 0) + 1
  const days = daysBetween(row.lastSeenAt, nowIso)
  let sev = row.severityScore
  let conf = row.confidence
  let rec = row.recoveryScore

  const sessionDecay = 1 - Math.min(MAX_SESSION_MISS_DECAY, 0.0065 * Math.min(miss, 12))
  sev = Math.max(0, sev * sessionDecay)

  if (days >= 10) {
    sev = Math.max(0, sev * 0.994 - 0.012)
    conf = Math.max(0.1, conf * 0.993)
  }
  if (days >= 28) {
    sev = Math.max(0, sev * 0.992 - 0.01)
    conf = Math.max(0.08, conf * 0.991)
  }
  if (days >= 56) {
    sev = Math.max(0, sev * 0.99 - 0.008)
  }

  if (miss >= RECOVERY_MISS_BOOST_AFTER) {
    rec = Math.min(0.95, rec + 0.028 + 0.006 * Math.min(miss, 14))
  }
  const improving = rec >= RECOVERY_IMPROVING_THRESHOLD || (miss >= 4 && sev < 1.15)

  if (improving && rec >= RECOVERY_IMPROVING_THRESHOLD) {
    sev = Math.max(0, sev * 0.987)
  }

  return { ...row, mergeMissStreak: miss, severityScore: sev, confidence: conf, recoveryScore: rec, improving }
}

function mergeVocab(prev: WeakVocabularyItem[], incoming: SessionLearningInsights['weakWords'], ctx: MergeContext): WeakVocabularyItem[] {
  const map = new Map<string, WeakVocabularyItem>()
  for (const v of prev) map.set(v.normalizedKey, { ...v })

  const hitKeys = new Set(incoming.map((i) => i.normalizedKey))
  const now = ctx.nowIso

  for (const s of incoming) {
    const existing = map.get(s.normalizedKey)
    const incConf = Math.min(0.95, s.confidence * incomingConfidenceMultiplier(s.source, ctx.sessionType))
    if (existing) {
      const repBoost = Math.min(1.12, 1 + 0.035 * Math.min(8, s.severityScore))
      const nextConf = Math.min(0.95, (existing.confidence * 0.9 + incConf * repBoost) / 1.9 + 0.015)
      map.set(s.normalizedKey, {
        ...existing,
        displayText: s.displayText || existing.displayText,
        category: s.category || existing.category,
        occurrences: existing.occurrences + 1,
        severityScore: Math.min(3, existing.severityScore * 0.87 + s.severityScore * ctx.sessionTypeWeight),
        lastSeenAt: now,
        scenarioIds: uniqPush(existing.scenarioIds, ctx.scenarioId, 12),
        evidenceRefs: uniqPushMany(existing.evidenceRefs, s.evidenceRefs, 16),
        confidence: nextConf,
        recoveryScore: Math.max(0.08, existing.recoveryScore * 0.93),
        signalSource: s.source ?? existing.signalSource,
        supportingText: s.supportingText ?? existing.supportingText,
        mergeMissStreak: 0,
        improving: false,
      })
    } else {
      map.set(s.normalizedKey, {
        normalizedKey: s.normalizedKey,
        displayText: s.displayText,
        category: s.category || 'general',
        severityScore: Math.min(3, s.severityScore * ctx.sessionTypeWeight),
        confidence: Math.min(0.9, incConf * (ctx.sessionTypeWeight >= 0.95 ? 1 : 0.9)),
        firstSeenAt: now,
        lastSeenAt: now,
        occurrences: 1,
        scenarioIds: ctx.scenarioId ? [ctx.scenarioId] : [],
        evidenceRefs: [...s.evidenceRefs],
        recoveryScore: 0.22,
        signalSource: s.source,
        supportingText: s.supportingText ?? null,
        mergeMissStreak: 0,
        improving: false,
      })
    }
  }

  for (const [key, v] of [...map.entries()]) {
    if (!hitKeys.has(key)) {
      map.set(key, applyMissDecayAndRecovery(v, now, false))
    }
  }

  return prune(
    [...map.values()].sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a)),
    MAX_VOCAB,
  )
}

function mergePatterns(prev: WeakGrammarPattern[], incoming: SessionLearningInsights['weakPatterns'], ctx: MergeContext): WeakGrammarPattern[] {
  const map = new Map<string, WeakGrammarPattern>()
  for (const p of prev) map.set(p.patternId, { ...p })
  const hit = new Set(incoming.map((i) => i.patternId))
  const now = ctx.nowIso

  for (const s of incoming) {
    const existing = map.get(s.patternId)
    const incConf = Math.min(0.92, s.confidence * incomingConfidenceMultiplier(s.source, ctx.sessionType))
    if (existing) {
      map.set(s.patternId, {
        ...existing,
        occurrences: existing.occurrences + 1,
        severityScore: Math.min(3, existing.severityScore * 0.88 + s.severityScore * ctx.sessionTypeWeight),
        lastSeenAt: now,
        scenarioIds: uniqPush(existing.scenarioIds, ctx.scenarioId, 12),
        evidenceRefs: uniqPushMany(existing.evidenceRefs, s.evidenceRefs, 16),
        confidence: Math.min(0.92, existing.confidence * 0.88 + incConf * 0.22),
        recoveryScore: Math.max(0.08, existing.recoveryScore * 0.93),
        explanation: s.explanation ?? existing.explanation,
        label: s.label || existing.label,
        signalSource: s.source ?? existing.signalSource,
        supportingText: s.supportingText ?? existing.supportingText,
        mergeMissStreak: 0,
        improving: false,
      })
    } else {
      map.set(s.patternId, {
        patternId: s.patternId,
        label: s.label,
        explanation: s.explanation,
        severityScore: Math.min(3, s.severityScore * ctx.sessionTypeWeight),
        confidence: incConf * 0.94,
        firstSeenAt: now,
        lastSeenAt: now,
        occurrences: 1,
        scenarioIds: ctx.scenarioId ? [ctx.scenarioId] : [],
        evidenceRefs: [...s.evidenceRefs],
        recoveryScore: 0.22,
        signalSource: s.source,
        supportingText: s.supportingText ?? null,
        mergeMissStreak: 0,
        improving: false,
      })
    }
  }

  for (const [key, p] of [...map.entries()]) {
    if (!hit.has(key)) map.set(key, applyMissDecayAndRecovery(p, now, false))
  }

  return prune([...map.values()].sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a)), MAX_PATTERNS)
}

function mergePron(prev: PronunciationIssue[], incoming: SessionLearningInsights['pronunciationIssues'], ctx: MergeContext): PronunciationIssue[] {
  const map = new Map<string, PronunciationIssue>()
  for (const p of prev) map.set(p.targetKey, { ...p })
  const hit = new Set(incoming.map((i) => i.targetKey))
  const now = ctx.nowIso

  for (const s of incoming) {
    const existing = map.get(s.targetKey)
    const incConf = Math.min(0.95, s.confidence * incomingConfidenceMultiplier(s.source, ctx.sessionType))
    if (existing) {
      map.set(s.targetKey, {
        ...existing,
        occurrences: existing.occurrences + 1,
        severityScore: Math.min(3, existing.severityScore * 0.84 + s.severityScore * ctx.sessionTypeWeight * 1.04),
        lastSeenAt: now,
        scenarioIds: uniqPush(existing.scenarioIds, ctx.scenarioId, 12),
        evidenceRefs: uniqPushMany(existing.evidenceRefs, s.evidenceRefs, 16),
        confidence: Math.min(0.95, existing.confidence * 0.88 + incConf * 0.26),
        recoveryScore: Math.max(0.08, existing.recoveryScore * 0.93),
        signalSource: s.source ?? existing.signalSource,
        supportingText: s.supportingText ?? existing.supportingText,
        mergeMissStreak: 0,
        improving: false,
      })
    } else {
      map.set(s.targetKey, {
        targetKey: s.targetKey,
        issueType: s.issueType,
        severityScore: Math.min(3, s.severityScore * ctx.sessionTypeWeight * 1.04),
        confidence: incConf,
        firstSeenAt: now,
        lastSeenAt: now,
        occurrences: 1,
        scenarioIds: ctx.scenarioId ? [ctx.scenarioId] : [],
        evidenceRefs: [...s.evidenceRefs],
        recoveryScore: 0.22,
        signalSource: s.source,
        supportingText: s.supportingText ?? null,
        mergeMissStreak: 0,
        improving: false,
      })
    }
  }

  for (const [key, p] of [...map.entries()]) {
    if (!hit.has(key)) map.set(key, applyMissDecayAndRecovery(p, now, false))
  }

  return prune([...map.values()].sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a)), MAX_PRON)
}

function mergeHesitationPatterns(
  prev: HesitationPatternSummary[],
  incoming: SessionInsightHesitation[],
  ctx: MergeContext,
): HesitationPatternSummary[] {
  const map = new Map<string, HesitationPatternSummary>()
  for (const p of prev) map.set(p.patternId, { ...p })
  const hit = new Set(incoming.map((i) => i.patternId))
  const now = ctx.nowIso

  for (const raw of incoming) {
    const s = raw as SessionInsightHesitation
    const existing = map.get(s.patternId)
    if (existing) {
      map.set(s.patternId, {
        ...existing,
        occurrences: existing.occurrences + s.occurrences,
        severityScore: Math.min(3, existing.severityScore * 0.87 + s.severityScore * ctx.sessionTypeWeight),
        lastSeenAt: now,
        scenarioIds: uniqPush(existing.scenarioIds, ctx.scenarioId, 12),
        evidenceRefs: uniqPushMany(existing.evidenceRefs, s.evidenceRefs, 16),
        confidence: Math.min(0.9, (existing.confidence * 0.92 + s.confidence * 0.2)),
        recoveryScore: Math.max(0.08, existing.recoveryScore * 0.94),
        label: s.label || existing.label,
        signalSource: s.source ?? existing.signalSource,
        supportingText: s.supportingText ?? existing.supportingText,
        mergeMissStreak: 0,
        improving: false,
      })
    } else {
      const { source: _src, ...rest } = s
      map.set(s.patternId, {
        ...rest,
        lastSeenAt: now,
        signalSource: s.source,
        supportingText: s.supportingText ?? null,
        mergeMissStreak: 0,
        improving: false,
      })
    }
  }

  for (const [key, p] of [...map.entries()]) {
    if (!hit.has(key)) map.set(key, applyMissDecayAndRecovery(p, now, false))
  }

  return prune([...map.values()].sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a)), MAX_HES)
}

function mergeScenarioPerformance(
  prev: UserLearningProfile['scenarioPerformance'],
  perf: SessionLearningInsights['scenarioPerformance'],
  ctx: MergeContext,
): UserLearningProfile['scenarioPerformance'] {
  if (!perf?.scenarioId) return prev
  const key = perf.scenarioId
  const existing = prev[key]
  const now = ctx.nowIso
  const attempts = (existing?.attempts ?? 0) + (perf.attempts || 1)
  const recent = perf.recentScore ?? perf.rollingScore ?? existing?.recentScore ?? null
  const rolling =
    existing?.rollingScore != null && perf.rollingScore != null
      ? existing.rollingScore * 0.65 + perf.rollingScore * 0.35
      : perf.rollingScore ?? existing?.rollingScore ?? null
  const next: ScenarioPerformanceSummary = {
    scenarioId: perf.scenarioId,
    scenarioSlug: perf.scenarioSlug ?? existing?.scenarioSlug ?? null,
    attempts,
    recentScore: recent,
    rollingScore: rolling,
    confidence: Math.min(0.92, (existing?.confidence ?? 0.45) * 0.9 + 0.12),
    strongSubskills: uniqStrings([...(existing?.strongSubskills ?? []), ...perf.strongSubskills], 8),
    weakSubskills: uniqStrings([...(existing?.weakSubskills ?? []), ...perf.weakSubskills], 10),
    lastAttemptAt: now,
  }
  return { ...prev, [key]: next }
}

function uniqPush(arr: string[], v: string | null, max: number): string[] {
  if (!v) return arr
  const s = [...arr.filter((x) => x !== v), v]
  return s.slice(-max)
}

function uniqPushMany(arr: string[], add: string[], max: number): string[] {
  const s = [...arr]
  for (const a of add) {
    if (a && !s.includes(a)) s.push(a)
  }
  return s.slice(-max)
}

function uniqStrings(a: string[], max: number): string[] {
  const out: string[] = []
  for (const x of a) {
    const t = x.trim()
    if (!t || out.includes(t)) continue
    out.push(t)
    if (out.length >= max) break
  }
  return out
}

function mergeStrengthLabels(prev: string[], incoming: SessionInsightStrength[], max: number): string[] {
  const labels = incoming.filter((s) => s.label.trim() && s.confidence >= 0.2).map((s) => s.label.trim())
  return uniqStrings([...prev, ...labels], max)
}

function prune<T>(arr: T[], max: number): T[] {
  return arr.slice(0, max)
}

export function mergeSessionInsightsIntoProfile(
  base: UserLearningProfile,
  insights: SessionLearningInsights,
  ctx: MergeContext,
): UserLearningProfile {
  let doc: UserLearningProfile = {
    ...createEmptyUserLearningProfile(base.userId),
    ...base,
    schemaVersion: base.schemaVersion,
    userId: base.userId ?? insights.userId,
    updatedAt: ctx.nowIso,
    version: (base.version ?? 0) + 1,
    totalSessionsObserved: base.totalSessionsObserved + 1,
    weakVocabulary: mergeVocab(base.weakVocabulary, insights.weakWords, ctx),
    weakGrammarPatterns: mergePatterns(base.weakGrammarPatterns, insights.weakPatterns, ctx),
    pronunciationIssues: mergePron(base.pronunciationIssues, insights.pronunciationIssues, ctx),
    hesitationPatterns: mergeHesitationPatterns(base.hesitationPatterns, insights.hesitationIssues, ctx),
    scenarioPerformance: mergeScenarioPerformance(base.scenarioPerformance, insights.scenarioPerformance, ctx),
    practiceRecommendations: [...base.practiceRecommendations],
    strongestAreas: mergeStrengthLabels(base.strongestAreas, insights.strengths ?? [], 36),
    activeFocusAreas: [...base.activeFocusAreas],
    levelEstimate: base.levelEstimate,
    recentScenarioSlugs: (() => {
      const slug = insights.scenarioPerformance?.scenarioSlug
      if (!slug) return base.recentScenarioSlugs
      return [...base.recentScenarioSlugs.filter((s) => s !== slug), slug].slice(-24)
    })(),
    lastSessionModality: insights.sessionType,
  }
  doc = mergeSpeakingTrendSignalsIntoProfile(doc, insights, ctx.nowIso)
  recomputeDerivedAndRecommendations(doc)
  mergeUserSkillProfileFromSession(doc, insights, ctx)
  return doc
}
