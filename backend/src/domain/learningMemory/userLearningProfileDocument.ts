/**
 * Canonical persisted JSON for dbo.UserLearningProfiles.ProfileJson (User Learning Profile).
 * schemaVersion 2 — field names aligned with product domain model.
 */
import type { MergeSessionType } from './learningMemoryMergeScoring'
import type { ListeningMemorySignalRow } from './listeningMemorySignalTypes'
import { isListeningMemorySignalId, LISTENING_MEMORY_SIGNAL_LABELS } from './listeningMemorySignalTypes'
import {
  ALL_SKILL_IDS,
  type SkillId,
  type UserSkillProfile,
  type UserSkillProfileDisplayPreferences,
} from '../skills/skillTypes'
import { createEmptyUserSkillProfile } from '../skills/skillProfileDefaults'
import {
  SpeakLiveSpeakingTrendSignalsV1Schema,
  type SpeakLiveSpeakingTrendSignalsV1,
} from './speakLiveLearningEvaluationArtifacts.schema'

export const USER_LEARNING_PROFILE_SCHEMA_VERSION = 2 as const

/** Previous on-disk schema (still migrated on read). */
export const USER_LEARNING_PROFILE_SCHEMA_VERSION_V1 = 1 as const

/** 0–1 confidence / recovery scale. */
export type Score01 = number

export type WeakVocabularyItem = {
  normalizedKey: string
  displayText: string
  category: string
  severityScore: number
  confidence: Score01
  firstSeenAt: string
  lastSeenAt: string
  occurrences: number
  scenarioIds: string[]
  evidenceRefs: string[]
  recoveryScore: Score01
  /** Optional: which extractor path produced this row (session merge). */
  signalSource?: string | null
  supportingText?: string | null
  /** Consecutive merges where this weakness did not appear in session insights. */
  mergeMissStreak?: number
  /** Deprioritized in active focus when recovery is high / issue fades. */
  improving?: boolean
}

export type WeakGrammarPattern = {
  patternId: string
  label: string
  explanation: string | null
  severityScore: number
  confidence: Score01
  firstSeenAt: string
  lastSeenAt: string
  occurrences: number
  scenarioIds: string[]
  evidenceRefs: string[]
  recoveryScore: Score01
  signalSource?: string | null
  supportingText?: string | null
  mergeMissStreak?: number
  improving?: boolean
}

export type PronunciationIssue = {
  targetKey: string
  issueType: string
  severityScore: number
  confidence: Score01
  firstSeenAt: string
  lastSeenAt: string
  occurrences: number
  scenarioIds: string[]
  evidenceRefs: string[]
  recoveryScore: Score01
  signalSource?: string | null
  supportingText?: string | null
  mergeMissStreak?: number
  improving?: boolean
}

export type HesitationPatternSummary = {
  patternId: string
  label: string
  severityScore: number
  confidence: Score01
  firstSeenAt: string
  lastSeenAt: string
  occurrences: number
  scenarioIds: string[]
  evidenceRefs: string[]
  recoveryScore: Score01
  signalSource?: string | null
  supportingText?: string | null
  mergeMissStreak?: number
  improving?: boolean
}

export type ScenarioPerformanceSummary = {
  scenarioId: string
  /** Optional denormalized slug for UX / routing. */
  scenarioSlug?: string | null
  attempts: number
  rollingScore: number | null
  recentScore: number | null
  confidence: Score01
  strongSubskills: string[]
  weakSubskills: string[]
  lastAttemptAt: string | null
}

export type PracticeRecommendation = {
  type: string
  targetId: string | null
  reason: string
  confidence: Score01
  generatedAt: string
  /** Rich UX fields from the Fluent recommendation engine (optional on older rows). */
  title?: string | null
  subtitle?: string | null
  priorityScore?: number | null
}

/**
 * Root aggregate persisted in ProfileJson.
 * `userId` mirrors dbo.Users.Id (string UUID) when known — set by service on read/write.
 */
export type UserLearningProfile = {
  schemaVersion: typeof USER_LEARNING_PROFILE_SCHEMA_VERSION
  userId: string | null
  levelEstimate: string | null
  activeFocusAreas: string[]
  strongestAreas: string[]
  updatedAt: string
  /** Monotonic logical version for optimistic concurrency / debugging (incremented each successful merge). */
  version: number
  weakVocabulary: WeakVocabularyItem[]
  weakGrammarPatterns: WeakGrammarPattern[]
  pronunciationIssues: PronunciationIssue[]
  hesitationPatterns: HesitationPatternSummary[]
  scenarioPerformance: Record<string, ScenarioPerformanceSummary>
  practiceRecommendations: PracticeRecommendation[]
  /** Cross-session count of ingested insight rows (Speak Live + text + read-aloud). */
  totalSessionsObserved: number
  recentScenarioSlugs: string[]
  /** Last merged session modality — feeds recommendation variety / modality bonuses. */
  lastSessionModality?: MergeSessionType | null
  /** Persistent skill metrics + evidence (FluentCopilot Skill System). */
  userSkillProfile?: UserSkillProfile | null
  /** Listening-mode memory signals (merged from completed listening sessions). */
  listeningMemorySignals?: ListeningMemorySignalRow[]
  /** Rolled-up Speak Live score series + deltas (merged from session artifact snapshots). */
  speakingTrendSignalsV1?: SpeakLiveSpeakingTrendSignalsV1 | null
}

/** @deprecated use UserLearningProfile */
export type UserLearningProfileDocument = UserLearningProfile

function nowIso(): string {
  return new Date().toISOString()
}

export function createEmptyUserLearningProfile(userId: string | null = null): UserLearningProfile {
  const t = nowIso()
  return {
    schemaVersion: USER_LEARNING_PROFILE_SCHEMA_VERSION,
    userId,
    levelEstimate: null,
    activeFocusAreas: [],
    strongestAreas: [],
    updatedAt: t,
    version: 0,
    weakVocabulary: [],
    weakGrammarPatterns: [],
    pronunciationIssues: [],
    hesitationPatterns: [],
    scenarioPerformance: {},
    practiceRecommendations: [],
    totalSessionsObserved: 0,
    recentScenarioSlugs: [],
    lastSessionModality: null,
    userSkillProfile: null,
    listeningMemorySignals: [],
  }
}

function mapIssueTypeStr(raw: unknown): string {
  const s = String(raw ?? '').toLowerCase()
  if (/stress|klemtoon/i.test(s)) return 'stress'
  if (/consonant|medeklinker|cluster/i.test(s)) return 'consonant'
  if (/vowel|klinker|tweeklank|diphthong|diphtong|ui|eu|ij/i.test(s)) return 'vowel'
  if (/pace|tempo|speed|rhythm|ritme/i.test(s)) return 'pacing'
  if (/clear|helder|mumble|unclear|word|surface|intonation/i.test(s)) return 'clarity'
  return 'unknown'
}

function recoveryScoreFromLegacyStatus(s: string | undefined): Score01 {
  if (s === 'resolved') return 0.92
  if (s === 'improving') return 0.55
  return 0.25
}

function migrateV1RowToWeakVocab(v: Record<string, unknown>): WeakVocabularyItem | null {
  const key = (v.key ?? v.normalizedKey) as string
  if (!key || typeof key !== 'string') return null
  const display = (v.wordOrPhrase ?? v.displayText ?? key) as string
  return {
    normalizedKey: (v.normalizedKey as string) || key,
    displayText: display,
    category: (v.category as string) || (v.exampleErrorType as string) || 'general',
    severityScore: typeof v.severityScore === 'number' ? v.severityScore : Number(v.severity ?? 0) || 0,
    confidence: typeof v.confidence === 'number' ? v.confidence : 0.5,
    firstSeenAt: (v.firstSeenAt as string) || (v.lastSeenAt as string) || nowIso(),
    lastSeenAt: (v.lastSeenAt as string) || nowIso(),
    occurrences: typeof v.occurrences === 'number' ? v.occurrences : Number(v.count ?? v.sessionsSeen ?? 1) || 1,
    scenarioIds: Array.isArray(v.scenarioIds) ? (v.scenarioIds as string[]) : [],
    evidenceRefs: Array.isArray(v.evidenceRefs) ? (v.evidenceRefs as string[]) : [],
    recoveryScore:
      typeof v.recoveryScore === 'number' ? v.recoveryScore : recoveryScoreFromLegacyStatus(v.recovery as string),
  }
}

function migrateV1RowToPattern(p: Record<string, unknown>): WeakGrammarPattern | null {
  const id = (p.patternId as string) || ''
  if (!id) return null
  return {
    patternId: id,
    label: (p.label as string) || (p.humanLabel as string) || id,
    explanation: (p.explanation as string) ?? null,
    severityScore: typeof p.severityScore === 'number' ? p.severityScore : Number(p.severity ?? 0) || 0,
    confidence: typeof p.confidence === 'number' ? p.confidence : 0.5,
    firstSeenAt: (p.firstSeenAt as string) || (p.lastSeenAt as string) || nowIso(),
    lastSeenAt: (p.lastSeenAt as string) || nowIso(),
    occurrences: typeof p.occurrences === 'number' ? p.occurrences : Number(p.count ?? p.sessionsSeen ?? 1) || 1,
    scenarioIds: Array.isArray(p.scenarioIds) ? (p.scenarioIds as string[]) : [],
    evidenceRefs: Array.isArray(p.evidenceRefs) ? (p.evidenceRefs as string[]) : [],
    recoveryScore:
      typeof p.recoveryScore === 'number' ? p.recoveryScore : recoveryScoreFromLegacyStatus(p.recovery as string),
  }
}

function migrateV1RowToPronunciation(p: Record<string, unknown>): PronunciationIssue | null {
  const tk =
    (p.targetKey as string) ||
    ((p.surface as string) && (p.issueType as string) ? `${(p.surface as string).trim()}:${mapIssueTypeStr(p.issueType)}` : null) ||
    (p.key as string)
  if (!tk) return null
  return {
    targetKey: tk,
    issueType: mapIssueTypeStr(p.issueType),
    severityScore: typeof p.severityScore === 'number' ? p.severityScore : Number(p.severity ?? 0) || 0,
    confidence: typeof p.confidence === 'number' ? p.confidence : 0.5,
    firstSeenAt: (p.firstSeenAt as string) || (p.lastSeenAt as string) || nowIso(),
    lastSeenAt: (p.lastSeenAt as string) || nowIso(),
    occurrences: typeof p.occurrences === 'number' ? p.occurrences : Number(p.count ?? p.sessionsSeen ?? 1) || 1,
    scenarioIds: Array.isArray(p.scenarioIds) ? (p.scenarioIds as string[]) : [],
    evidenceRefs: Array.isArray(p.evidenceRefs) ? (p.evidenceRefs as string[]) : [],
    recoveryScore: typeof p.recoveryScore === 'number' ? p.recoveryScore : 0.35,
  }
}

function migrateV1Hesitation(h: Record<string, unknown>): HesitationPatternSummary[] {
  const out: HesitationPatternSummary[] = []
  const t = nowIso()
  const push = (patternId: string, label: string, n: number) => {
    if (!n) return
    out.push({
      patternId,
      label,
      severityScore: Math.min(3, n / 3),
      confidence: 0.45,
      firstSeenAt: t,
      lastSeenAt: t,
      occurrences: n,
      scenarioIds: [],
      evidenceRefs: [],
      recoveryScore: 0.3,
    })
  }
  push('hes_long_pause', 'Long pauses', Number(h.longPauses ?? 0))
  push('hes_restart', 'Restarts / rushed endings', Number(h.restarts ?? 0))
  push('hes_filler', 'Filler tendency', Number(h.fillerTendency ?? 0))
  push('hes_before_key', 'Hesitation before key words', Number(h.beforeKeyWords ?? 0))
  push('hes_before_verb', 'Hesitation before verbs', Number(h.beforeVerbs ?? 0))
  push('hes_before_prep', 'Hesitation before prepositions', Number(h.beforePrepositions ?? 0))
  push('hes_before_q', 'Hesitation before question openers', Number(h.beforeQuestionOpeners ?? 0))
  return out
}

function migrateV1ScenarioSummaries(
  raw: Record<string, unknown> | undefined,
): Record<string, ScenarioPerformanceSummary> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, ScenarioPerformanceSummary> = {}
  for (const [k, val] of Object.entries(raw)) {
    const s = val as Record<string, unknown>
    if (!s || typeof s !== 'object') continue
    out[k] = {
      scenarioId: (s.scenarioId as string) || k,
      scenarioSlug: (s.scenarioSlug as string) ?? null,
      attempts: Number(s.attempts ?? 0) || 0,
      rollingScore: typeof s.rollingScore === 'number' ? s.rollingScore : null,
      recentScore: typeof s.recentScore === 'number' ? s.recentScore : null,
      confidence: typeof s.confidence === 'number' ? s.confidence : 0.4,
      strongSubskills: Array.isArray(s.strongSubskills) ? (s.strongSubskills as string[]) : [],
      weakSubskills: Array.isArray(s.weakSubskills) ? (s.weakSubskills as string[]) : [],
      lastAttemptAt: (s.lastAttemptAt as string) ?? null,
    }
  }
  return out
}

function migrateV1ToV2(v: Record<string, unknown>): UserLearningProfile {
  const derived = (v.derived as Record<string, unknown>) || {}
  const base = createEmptyUserLearningProfile((v.userId as string) || null)
  base.updatedAt = (v.updatedAt as string) || nowIso()
  base.version = Number(v.version ?? 0) || 0
  base.totalSessionsObserved = Number(v.totalSessionsObserved ?? 0) || 0
  base.recentScenarioSlugs = Array.isArray(v.recentScenarioSlugs) ? (v.recentScenarioSlugs as string[]).slice(-24) : []
  base.levelEstimate = (derived.estimatedLevel as string) || (v.levelEstimate as string) || null
  base.strongestAreas = Array.isArray(derived.strongestAreas)
    ? (derived.strongestAreas as string[])
    : Array.isArray(v.strongestAreas)
      ? (v.strongestAreas as string[])
      : []
  base.activeFocusAreas = Array.isArray(derived.topWeaknessLabels)
    ? (derived.topWeaknessLabels as string[])
    : Array.isArray(v.activeFocusAreas)
      ? (v.activeFocusAreas as string[])
      : []

  for (const row of Array.isArray(v.weakVocabulary) ? v.weakVocabulary : []) {
    const m = migrateV1RowToWeakVocab(row as Record<string, unknown>)
    if (m) base.weakVocabulary.push(m)
  }
  const patterns = Array.isArray(v.weakGrammarPatterns) ? v.weakGrammarPatterns : v.weakPatterns
  for (const row of Array.isArray(patterns) ? patterns : []) {
    const m = migrateV1RowToPattern(row as Record<string, unknown>)
    if (m) base.weakGrammarPatterns.push(m)
  }
  for (const row of Array.isArray(v.pronunciationIssues) ? v.pronunciationIssues : []) {
    const r = row as Record<string, unknown>
    const withTarget = { ...r, targetKey: r.targetKey ?? r.key, issueType: r.issueType ?? 'unknown' }
    const m = migrateV1RowToPronunciation(withTarget)
    if (m) base.pronunciationIssues.push(m)
  }
  if (Array.isArray(v.hesitationPatterns) && v.hesitationPatterns.length) {
    for (const row of v.hesitationPatterns as unknown[]) {
      const h = row as HesitationPatternSummary
      if (h?.patternId) base.hesitationPatterns.push(h)
    }
  } else if (v.hesitation && typeof v.hesitation === 'object') {
    base.hesitationPatterns = migrateV1Hesitation(v.hesitation as Record<string, unknown>)
  }
  const fromPerf = migrateV1ScenarioSummaries(v.scenarioPerformance as Record<string, unknown>)
  const fromSum = migrateV1ScenarioSummaries(v.scenarioSummaries as Record<string, unknown>)
  base.scenarioPerformance = Object.keys(fromPerf).length > 0 ? fromPerf : fromSum
  return base
}

function normalizeListeningMemorySignals(raw: unknown): ListeningMemorySignalRow[] {
  if (!Array.isArray(raw)) return []
  const out: ListeningMemorySignalRow[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const sid = typeof r.signalId === 'string' ? r.signalId.trim() : ''
    if (!isListeningMemorySignalId(sid)) continue
    const label =
      typeof r.label === 'string' && r.label.trim()
        ? r.label.trim()
        : LISTENING_MEMORY_SIGNAL_LABELS[sid]
    out.push({
      signalId: sid,
      label,
      severityScore: typeof r.severityScore === 'number' ? r.severityScore : Number(r.severity ?? 0) || 0,
      confidence: typeof r.confidence === 'number' ? r.confidence : 0.45,
      firstSeenAt: (r.firstSeenAt as string) || (r.lastSeenAt as string) || nowIso(),
      lastSeenAt: (r.lastSeenAt as string) || nowIso(),
      occurrences: typeof r.occurrences === 'number' ? r.occurrences : Number(r.count ?? 1) || 1,
      evidenceRefs: Array.isArray(r.evidenceRefs) ? (r.evidenceRefs as string[]) : [],
      recoveryScore: typeof r.recoveryScore === 'number' ? r.recoveryScore : 0.28,
      mergeMissStreak: typeof r.mergeMissStreak === 'number' ? r.mergeMissStreak : undefined,
      improving: typeof r.improving === 'boolean' ? r.improving : undefined,
    })
  }
  return out
}

function normalizeSpeakingTrendSignalsV1(raw: unknown): SpeakLiveSpeakingTrendSignalsV1 | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const p = SpeakLiveSpeakingTrendSignalsV1Schema.safeParse(raw)
  return p.success ? p.data : undefined
}

function normalizeV2Partial(v: Record<string, unknown>): UserLearningProfile {
  const empty = createEmptyUserLearningProfile((v.userId as string) || null)
  return {
    ...empty,
    ...v,
    schemaVersion: USER_LEARNING_PROFILE_SCHEMA_VERSION,
    weakVocabulary: Array.isArray(v.weakVocabulary)
      ? (v.weakVocabulary as WeakVocabularyItem[]).filter((x) => x?.normalizedKey)
      : [],
    weakGrammarPatterns: Array.isArray(v.weakGrammarPatterns)
      ? (v.weakGrammarPatterns as WeakGrammarPattern[]).filter((x) => x?.patternId)
      : [],
    pronunciationIssues: Array.isArray(v.pronunciationIssues)
      ? (v.pronunciationIssues as PronunciationIssue[]).filter((x) => x?.targetKey)
      : [],
    hesitationPatterns: Array.isArray(v.hesitationPatterns) ? (v.hesitationPatterns as HesitationPatternSummary[]) : [],
    scenarioPerformance:
      v.scenarioPerformance && typeof v.scenarioPerformance === 'object'
        ? (v.scenarioPerformance as Record<string, ScenarioPerformanceSummary>)
        : {},
    practiceRecommendations: Array.isArray(v.practiceRecommendations)
      ? (v.practiceRecommendations as PracticeRecommendation[])
      : [],
    recentScenarioSlugs: Array.isArray(v.recentScenarioSlugs) ? (v.recentScenarioSlugs as string[]).slice(-24) : [],
    activeFocusAreas: Array.isArray(v.activeFocusAreas) ? (v.activeFocusAreas as string[]) : [],
    strongestAreas: Array.isArray(v.strongestAreas) ? (v.strongestAreas as string[]) : [],
    version: typeof v.version === 'number' && Number.isFinite(v.version) ? Math.floor(v.version) : 0,
    userSkillProfile: normalizeUserSkillProfile(v.userSkillProfile, (v.userId as string) || null),
    listeningMemorySignals: normalizeListeningMemorySignals(v.listeningMemorySignals),
    speakingTrendSignalsV1: normalizeSpeakingTrendSignalsV1(v.speakingTrendSignalsV1),
  }
}

function isSkillId(s: string): s is SkillId {
  return (ALL_SKILL_IDS as readonly string[]).includes(s)
}

function normalizeDisplayPreferences(raw: unknown): UserSkillProfileDisplayPreferences | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.showNumericScores !== 'boolean') return { showNumericScores: true }
  return { showNumericScores: o.showNumericScores }
}

function normalizeUserSkillProfile(raw: unknown, userId: string | null): UserSkillProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (Number(o.schemaVersion) !== 1) return null
  const uid = typeof o.userId === 'string' ? o.userId : userId ?? ''
  const base = createEmptyUserSkillProfile(uid || 'unknown')
  const skillList = (a: unknown): SkillId[] =>
    Array.isArray(a) ? (a as string[]).map((x) => String(x).trim()).filter(isSkillId) : []
  return {
    ...base,
    ...o,
    schemaVersion: 1,
    userId: uid || base.userId,
    strongestSkills: skillList(o.strongestSkills),
    weakestSkills: skillList(o.weakestSkills),
    currentFocusSkills: skillList(o.currentFocusSkills),
    metrics: o.metrics && typeof o.metrics === 'object' ? (o.metrics as UserSkillProfile['metrics']) : {},
    recentEvidence: Array.isArray(o.recentEvidence) ? (o.recentEvidence as UserSkillProfile['recentEvidence']) : [],
    snapshots: Array.isArray(o.snapshots) ? (o.snapshots as UserSkillProfile['snapshots']) : [],
    recommendations:
      o.recommendations && typeof o.recommendations === 'object'
        ? (o.recommendations as UserSkillProfile['recommendations'])
        : null,
    displayPreferences: normalizeDisplayPreferences(o.displayPreferences) ?? base.displayPreferences ?? null,
  }
}

export function parseUserLearningProfileDocument(raw: string | null | undefined, userId?: string | null): UserLearningProfile {
  if (!raw?.trim()) return createEmptyUserLearningProfile(userId ?? null)
  try {
    const v = JSON.parse(raw) as Record<string, unknown>
    if (!v || typeof v !== 'object') return createEmptyUserLearningProfile(userId ?? null)
    const sv = Number(v.schemaVersion)
    let profile: UserLearningProfile
    if (sv === USER_LEARNING_PROFILE_SCHEMA_VERSION_V1) {
      profile = migrateV1ToV2(v)
    } else if (sv === USER_LEARNING_PROFILE_SCHEMA_VERSION) {
      profile = normalizeV2Partial(v)
    } else {
      return createEmptyUserLearningProfile(userId ?? null)
    }
    if (userId) profile.userId = userId
    else if (!profile.userId && typeof v.userId === 'string') profile.userId = v.userId
    return profile
  } catch {
    return createEmptyUserLearningProfile(userId ?? null)
  }
}

export function serializeUserLearningProfileDocument(doc: UserLearningProfile): string {
  return JSON.stringify({
    ...doc,
    schemaVersion: USER_LEARNING_PROFILE_SCHEMA_VERSION,
    updatedAt: doc.updatedAt,
  })
}
