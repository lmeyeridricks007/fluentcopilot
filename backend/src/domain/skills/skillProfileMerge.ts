/**
 * Persists skill evidence + metrics on {@link UserLearningProfile.userSkillProfile}.
 */
import type { SessionLearningInsights } from '../learningMemory/sessionLearningInsightTypes'
import type { UserLearningProfile } from '../learningMemory/userLearningProfileDocument'
import type { MergeContext } from '../learningMemory/userLearningProfileMergeService'
import type { SkillEvidence, UserSkillProfile } from './skillTypes'
import { mapSessionInsightsToSkillEvidence } from './sessionSkillEvidenceMapper'
import { applySessionEvidenceToMetrics, overallSkillScoreFromMetrics } from './skillScoreEngine'
import { buildSkillRecommendationsBundle } from './skillRecommendationBuilder'
import { normalizeScenarioSlug } from './scenarioSkillTags'
import { rankStrongestWeakestAndFocus } from './skillProfileRank'
import { createEmptyUserSkillProfile } from './skillProfileDefaults'

export { createEmptyUserSkillProfile } from './skillProfileDefaults'

export type MergeUserSkillProfileOptions = {
  /** When false, skips snapshot append (e.g. bulk recompute from history). Default true. */
  appendSnapshot?: boolean
}

export function mergeUserSkillProfileFromSession(
  doc: UserLearningProfile,
  insights: SessionLearningInsights,
  ctx: MergeContext,
  options?: MergeUserSkillProfileOptions,
): void {
  const uid = (doc.userId ?? insights.userId) as string
  const slugNorm = normalizeScenarioSlug(insights.scenarioPerformance?.scenarioSlug ?? null)

  const sessionEvidence = [
    ...mapSessionInsightsToSkillEvidence(insights, {
      nowIso: ctx.nowIso,
      scenarioId: ctx.scenarioId,
      scenarioSlugNorm: slugNorm || null,
      sessionType: insights.sessionType,
      sessionTypeWeight: ctx.sessionTypeWeight,
    }),
    ...(ctx.additionalSkillEvidence ?? []),
  ]

  const base = doc.userSkillProfile ?? createEmptyUserSkillProfile(uid)
  const metrics = applySessionEvidenceToMetrics({
    prev: base.metrics,
    sessionEvidence,
    recentEvidenceRing: base.recentEvidence,
    sessionTypeWeight: ctx.sessionTypeWeight,
    nowIso: ctx.nowIso,
  })

  const recentEvidence = [...base.recentEvidence, ...sessionEvidence].slice(-48)
  const overallSkillScore = overallSkillScoreFromMetrics(metrics)
  const { strongestSkills, weakestSkills, currentFocusSkills } = rankStrongestWeakestAndFocus(metrics)
  const recommendations = buildSkillRecommendationsBundle({ profile: doc, metrics })

  const appendSnapshot = options?.appendSnapshot !== false
  const snapshots = appendSnapshot
    ? base.snapshots.length >= 12
      ? [...base.snapshots.slice(-11), snapshotFrom(metrics, overallSkillScore, ctx.nowIso)]
      : [...base.snapshots, snapshotFrom(metrics, overallSkillScore, ctx.nowIso)]
    : base.snapshots

  doc.userSkillProfile = {
    ...base,
    userId: uid,
    metrics,
    recentEvidence,
    overallSkillScore,
    strongestSkills,
    weakestSkills,
    currentFocusSkills,
    lastRecomputedAt: ctx.nowIso,
    snapshots,
    recommendations,
  }
}

/** One consolidated snapshot after bulk replay (recompute). */
/** Small positive nudge (e.g. training loop completed) without a full session merge. */
export function applyStandaloneSkillEvidence(
  doc: UserLearningProfile,
  evidence: SkillEvidence[],
  nowIso: string,
  sessionTypeWeight = 0.82,
): void {
  const uid = (doc.userId ?? '') as string
  if (!uid || !evidence.length) return
  const base = doc.userSkillProfile ?? createEmptyUserSkillProfile(uid)
  const metrics = applySessionEvidenceToMetrics({
    prev: base.metrics,
    sessionEvidence: evidence,
    recentEvidenceRing: base.recentEvidence,
    sessionTypeWeight,
    nowIso,
  })
  const recentEvidence = [...base.recentEvidence, ...evidence].slice(-48)
  const overallSkillScore = overallSkillScoreFromMetrics(metrics)
  const { strongestSkills, weakestSkills, currentFocusSkills } = rankStrongestWeakestAndFocus(metrics)
  const recommendations = buildSkillRecommendationsBundle({ profile: doc, metrics })
  doc.userSkillProfile = {
    ...base,
    userId: uid,
    metrics,
    recentEvidence,
    overallSkillScore,
    strongestSkills,
    weakestSkills,
    currentFocusSkills,
    lastRecomputedAt: nowIso,
    snapshots: base.snapshots,
    recommendations,
  }
}

export function appendConsolidatedSkillSnapshot(doc: UserLearningProfile, nowIso: string): void {
  const sp = doc.userSkillProfile
  if (!sp || !Object.keys(sp.metrics).length) return
  const snap = snapshotFrom(sp.metrics, sp.overallSkillScore ?? overallSkillScoreFromMetrics(sp.metrics), nowIso)
  sp.snapshots = [...sp.snapshots.slice(-11), snap]
}

function snapshotFrom(
  metrics: UserSkillProfile['metrics'],
  overall: number | null,
  at: string,
): UserSkillProfile['snapshots'][number] {
  const m: UserSkillProfile['snapshots'][number]['metrics'] = {}
  for (const [k, v] of Object.entries(metrics)) {
    if (!v) continue
    m[k as keyof typeof m] = { score: v.score, state: v.state, trend: v.trend }
  }
  return {
    capturedAt: at,
    overallSkillScore: overall,
    metrics: m,
  }
}
