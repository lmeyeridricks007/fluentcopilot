/**
 * Developer-only snapshot of the Skill System for QA (never returned in production builds).
 */
import type { UserLearningProfile } from '../learningMemory/userLearningProfileDocument'
import type { TrainingLoopDevDiagnosticsSnapshot } from '../trainingLoops/trainingLoopTypes'
import { buildTalkSkillsPreview } from './skillPublicSummary'
import { buildSkillDrivenRecommendationPlan } from './skillRecommendationEngine'
import type { SkillDrivenRecommendationPlanDTO } from './skillRecommendationTypes'
import { createEmptyUserSkillProfile } from './skillProfileDefaults'
import type { SkillMetric, UserSkillProfile } from './skillTypes'

const MAX_RECENT_EVIDENCE = 24
const MAX_SNAPSHOTS = 10

export type SkillSystemDebugScoreRow = {
  skillId: string
  score: number
  state: string
  trend: string
  confidence: string
  evidenceCount: number
}

export type SkillSystemDebugPayload = {
  generatedAt: string
  learningMeta: {
    totalSessionsObserved: number
    lastSessionModality: string | null
    recentScenarioSlugs: string[]
  }
  /** Profile JSON as stored (recent evidence / snapshots may be truncated below). */
  userSkillProfile: UserSkillProfile
  truncation: {
    recentEvidenceTotal: number
    recentEvidenceReturned: number
    snapshotsTotal: number
    snapshotsReturned: number
  }
  scoresTable: SkillSystemDebugScoreRow[]
  activeFocus: {
    overallSkillScore: number | null
    currentFocusSkills: string[]
    strongestSkills: string[]
    weakestSkills: string[]
  }
  persistedRecommendations: UserSkillProfile['recommendations']
  /** Recomputed plan (compare to persisted slots on profile). */
  skillDrivenPlanFresh: SkillDrivenRecommendationPlanDTO
  /** Same shape as Talk hub / landing strip preview. */
  talkSkillsPreview: ReturnType<typeof buildTalkSkillsPreview>
  /** Personalized training loops — generation + lifecycle (only when Dev Tools skill debug is on). */
  personalizedTrainingLoops?: TrainingLoopDevDiagnosticsSnapshot
}

export function buildSkillSystemDevDebugPayload(doc: UserLearningProfile): SkillSystemDebugPayload {
  const uid = doc.userId ?? 'unknown'
  const full = doc.userSkillProfile ?? createEmptyUserSkillProfile(uid)
  const evidence = full.recentEvidence ?? []
  const snapshots = full.snapshots ?? []
  const evidenceTail = evidence.slice(-MAX_RECENT_EVIDENCE)
  const snapshotsTail = snapshots.slice(-MAX_SNAPSHOTS)
  const sp: UserSkillProfile = {
    ...full,
    recentEvidence: evidenceTail,
    snapshots: snapshotsTail,
  }
  const metrics = full.metrics ?? {}
  const scoresTable: SkillSystemDebugScoreRow[] = Object.values(metrics)
    .filter((m): m is SkillMetric => Boolean(m))
    .map((m) => ({
      skillId: m.skillId,
      score: m.score,
      state: m.state,
      trend: m.trend,
      confidence: m.confidence,
      evidenceCount: m.evidenceCount,
    }))
    .sort((a, b) => a.score - b.score)

  return {
    generatedAt: new Date().toISOString(),
    learningMeta: {
      totalSessionsObserved: doc.totalSessionsObserved,
      lastSessionModality: doc.lastSessionModality ?? null,
      recentScenarioSlugs: [...(doc.recentScenarioSlugs ?? [])].slice(-12),
    },
    userSkillProfile: sp,
    truncation: {
      recentEvidenceTotal: evidence.length,
      recentEvidenceReturned: evidenceTail.length,
      snapshotsTotal: snapshots.length,
      snapshotsReturned: snapshotsTail.length,
    },
    scoresTable,
    activeFocus: {
      overallSkillScore: full.overallSkillScore,
      currentFocusSkills: [...full.currentFocusSkills],
      strongestSkills: [...full.strongestSkills],
      weakestSkills: [...full.weakestSkills],
    },
    persistedRecommendations: full.recommendations,
    skillDrivenPlanFresh: buildSkillDrivenRecommendationPlan({ profile: doc, metrics }),
    talkSkillsPreview: buildTalkSkillsPreview(doc),
  }
}
