/**
 * Low-level persistence + merge helpers for `dbo.UserLearningProfiles` / `SessionLearningInsights`.
 *
 * **Product contract:** Prefer `createFluentCopilotLearningMemoryService` in `fluentCopilotLearningMemoryService.ts`
 * for the consolidated FluentCopilot learning-memory API (profile read, merge, recommendations, personalization).
 */
import type sql from 'mssql'
import type { SessionLearningInsights } from '../../domain/learningMemory/sessionLearningInsightTypes'
import { effectiveWeaknessItemScore } from '../../domain/learningMemory/learningMemoryMergeScoring'
import { mergeSessionInsightsIntoProfile, type MergeContext } from '../../domain/learningMemory/userLearningProfileMergeService'
import type { FluentLearningRecommendation } from '../../domain/learningMemory/fluentLearningRecommendationEngine'
import { buildPracticeRecommendations } from '../../domain/learningMemory/learningMemoryRecommendationService'
import {
  parseUserLearningProfileDocument,
  serializeUserLearningProfileDocument,
  USER_LEARNING_PROFILE_SCHEMA_VERSION,
  type UserLearningProfile,
  type WeakGrammarPattern,
  type WeakVocabularyItem,
  type PronunciationIssue,
  type HesitationPatternSummary,
  type ScenarioPerformanceSummary,
  type PracticeRecommendation,
} from '../../domain/learningMemory/userLearningProfileDocument'
import type { SkillEvidence } from '../../domain/skills/skillTypes'
import * as learningRepo from '../../repositories/userLearningMemoryRepository'

export type ActiveWeaknesses = {
  vocabulary: WeakVocabularyItem[]
  grammarPatterns: WeakGrammarPattern[]
  pronunciation: PronunciationIssue[]
  hesitation: HesitationPatternSummary[]
}

function sessionWeight(t: learningRepo.SessionLearningSessionType): number {
  if (t === 'speak_live') return 1
  if (t === 'read_aloud') return 0.92
  if (t === 'listening') return 0.88
  if (t === 'quick_capture') return 0.68
  return 0.85
}

export async function getUserLearningProfile(pool: sql.ConnectionPool, userId: string): Promise<UserLearningProfile> {
  const raw = await learningRepo.getUserLearningProfileJson(pool, userId)
  return parseUserLearningProfileDocument(raw, userId)
}

export async function upsertUserLearningProfile(
  pool: sql.ConnectionPool,
  userId: string,
  profile: UserLearningProfile,
): Promise<void> {
  const doc: UserLearningProfile = { ...profile, userId: profile.userId ?? userId }
  const json = serializeUserLearningProfileDocument(doc)
  await learningRepo.upsertUserLearningProfile(pool, userId, json, USER_LEARNING_PROFILE_SCHEMA_VERSION)
}

export async function saveSessionLearningInsights(params: {
  pool: sql.ConnectionPool
  userId: string
  sessionType: learningRepo.SessionLearningSessionType
  threadId: string | null
  scenarioId: string | null
  insights: SessionLearningInsights
  signals?: Record<string, unknown> | null
}): Promise<string> {
  return learningRepo.insertSessionLearningInsight({
    pool: params.pool,
    userId: params.userId,
    sessionType: params.sessionType,
    threadId: params.threadId,
    scenarioId: params.scenarioId,
    insightsJson: JSON.stringify(params.insights),
    signalsJson: params.signals ? JSON.stringify(params.signals) : null,
  })
}

export async function mergeSessionInsightsIntoProfilePersisted(params: {
  pool: sql.ConnectionPool
  userId: string
  insights: SessionLearningInsights
  sessionType: learningRepo.SessionLearningSessionType
  scenarioId: string | null
  additionalSkillEvidence?: SkillEvidence[] | null
}): Promise<UserLearningProfile> {
  const prevJson = await learningRepo.getUserLearningProfileJson(params.pool, params.userId)
  const base = parseUserLearningProfileDocument(prevJson, params.userId)
  const nowIso = new Date().toISOString()
  const mergeCtx: MergeContext = {
    nowIso,
    scenarioId: params.scenarioId,
    sessionTypeWeight: sessionWeight(params.sessionType),
    sessionType: params.sessionType,
    additionalSkillEvidence: params.additionalSkillEvidence ?? undefined,
  }
  const merged = mergeSessionInsightsIntoProfile(base, params.insights, mergeCtx)
  await upsertUserLearningProfile(params.pool, params.userId, merged)
  return merged
}

export async function getUserActiveWeaknesses(pool: sql.ConnectionPool, userId: string): Promise<ActiveWeaknesses> {
  const doc = await getUserLearningProfile(pool, userId)
  const score = effectiveWeaknessItemScore
  const vocab = [...doc.weakVocabulary].sort((a, b) => score(b) - score(a)).slice(0, 24)
  const grammar = [...doc.weakGrammarPatterns].sort((a, b) => score(b) - score(a)).slice(0, 16)
  const pronunciation = [...doc.pronunciationIssues].sort((a, b) => score(b) - score(a)).slice(0, 16)
  const hesitation = [...doc.hesitationPatterns].sort((a, b) => score(b) - score(a)).slice(0, 10)
  return { vocabulary: vocab, grammarPatterns: grammar, pronunciation, hesitation }
}

export async function getScenarioPerformance(
  pool: sql.ConnectionPool,
  userId: string,
  scenarioId: string,
): Promise<ScenarioPerformanceSummary | null> {
  const doc = await getUserLearningProfile(pool, userId)
  return doc.scenarioPerformance[scenarioId] ?? null
}

export async function getPracticeRecommendations(
  pool: sql.ConnectionPool,
  userId: string,
): Promise<PracticeRecommendation[]> {
  const doc = await getUserLearningProfile(pool, userId)
  return [...doc.practiceRecommendations]
}

/** Ranked FluentCopilot recommendations (scenario, read-aloud profile, themes, chip, report step). */
export async function getFluentLearningRecommendations(
  pool: sql.ConnectionPool,
  userId: string,
): Promise<FluentLearningRecommendation[]> {
  const doc = await getUserLearningProfile(pool, userId)
  return buildPracticeRecommendations(doc).recommendations
}

/**
 * Optional offline backfill: re-merge historical session rows into the profile.
 * Safe to skip at launch; callers should run in a job / admin path, not on the hot path.
 */
export async function backfillProfileFromSessionInsights(params: {
  pool: sql.ConnectionPool
  userId: string
  /** Insight rows newest-first; each InsightsJson must be schema v2 SessionLearningInsights. */
  rows: Array<{
    insightsJson: string
    sessionType: learningRepo.SessionLearningSessionType
    scenarioId: string | null
  }>
}): Promise<UserLearningProfile> {
  let doc = await getUserLearningProfile(params.pool, params.userId)
  const ordered = [...params.rows].reverse()
  for (const row of ordered) {
    try {
      const insights = JSON.parse(row.insightsJson) as SessionLearningInsights
      if (insights.schemaVersion !== 2 || !insights.sessionId || !insights.userId) continue
      if (!Array.isArray(insights.strengths)) (insights as { strengths: unknown }).strengths = []
      const mergeCtx: MergeContext = {
        nowIso: insights.extractedAt || new Date().toISOString(),
        scenarioId: row.scenarioId,
        sessionTypeWeight: sessionWeight(row.sessionType),
        sessionType: row.sessionType,
      }
      doc = mergeSessionInsightsIntoProfile(doc, insights, mergeCtx)
    } catch {
      /* skip bad row */
    }
  }
  await upsertUserLearningProfile(params.pool, params.userId, doc)
  return doc
}
