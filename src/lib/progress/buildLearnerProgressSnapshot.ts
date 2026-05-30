import { readPostA2PathwayState } from '@/lib/post-a2-pathways/postA2PathwayState'
import { readScenarioProgressStateForUserId } from '@/lib/practice/scenarioProgressStorage'
import { loadRetentionProfileSync } from '@/lib/retention/persistence'
import { readKmnProgressStoreForUserId } from '@/lib/exam-prep/kmn/kmnProgressService'
import { loadPracticeExamAttemptsForUserId } from '@/lib/exam-prep/practice-exams/practiceExamAttemptService'
import { loadExamReadinessAttemptsForUserId } from '@/lib/exam-readiness/examReadinessHistory'
import { loadAbilityMasteryState } from '@/lib/mastery/abilityMasteryStorage'
import { loadMissionRuntimeStateSync } from '@/lib/missions/missionPersistence'
import { readSkillTrackProgressStateForUserId } from '@/lib/skill-tracks/skillTrackProgressStorage'
import { getUserDrafts } from '@/lib/storage/draftStorage'
import {
  SCHEMA_MISTAKES_KEY_PREFIX,
  reviewStorageKeys,
} from '@/lib/storage/storageKeys'
import type { ProgressManifestV1 } from '@/lib/storage/storageTypes'
import type { UserMastery } from '@/lib/schemas/userMastery.schema'
import {
  LEARNER_PROGRESS_SNAPSHOT_VERSION,
  type LearnerProgressSnapshotV1,
} from './progressTypes'

function countJsonArrayAtKey(key: string): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return 0
    const v = JSON.parse(raw) as unknown
    return Array.isArray(v) ? v.length : 0
  } catch {
    return 0
  }
}

function loadUserMasterySummary(userId: string): { vocab: number; grammar: number } {
  if (typeof window === 'undefined') return { vocab: 0, grammar: 0 }
  try {
    const raw = localStorage.getItem(reviewStorageKeys.mastery(userId))
    if (!raw) return { vocab: 0, grammar: 0 }
    const m = JSON.parse(raw) as Partial<UserMastery>
    if (!m || typeof m !== 'object') return { vocab: 0, grammar: 0 }
    const vocab = m.vocabMasteryMap && typeof m.vocabMasteryMap === 'object' ? Object.keys(m.vocabMasteryMap).length : 0
    const grammar =
      m.grammarMasteryMap && typeof m.grammarMasteryMap === 'object' ? Object.keys(m.grammarMasteryMap).length : 0
    return { vocab, grammar }
  } catch {
    return { vocab: 0, grammar: 0 }
  }
}

function estimateSchemaMistakeKeys(userId: string): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(`${SCHEMA_MISTAKES_KEY_PREFIX}${userId}`)
    if (!raw) return 0
    const v = JSON.parse(raw) as unknown
    if (v && typeof v === 'object' && !Array.isArray(v)) return Object.keys(v as object).length
    return 0
  } catch {
    return 0
  }
}

function emptySnapshot(userId: string, manifest: ProgressManifestV1, builtAt: string): LearnerProgressSnapshotV1 {
  return {
    snapshotVersion: LEARNER_PROGRESS_SNAPSHOT_VERSION,
    userId,
    builtAt,
    manifest,
    lessons: {
      completedLessonIds: [],
      completedModuleIds: [],
      abilityUnlockCount: 0,
      milestonesSeenCount: 0,
    },
    practice: {
      scenariosWithAnyProgress: 0,
      qualifyingSuccessScenarioCount: 0,
      practiceUnlockedScenarioCount: 0,
      skillTracksWithProgress: 0,
      skillTrackSessionsCompletedTotal: 0,
      abilityMasteryTrackedCount: 0,
    },
    review: {
      bankItemCount: 0,
      srsItemCount: 0,
      mistakeEventCount: 0,
      masteryVocabCount: 0,
      masteryGrammarCount: 0,
    },
    exams: {
      practiceExamAttemptCount: 0,
      kmnTopicsWithActivity: 0,
      readinessAttemptCount: 0,
    },
    missions: { runtime: null },
    engagement: {
      totalXp: 0,
      streakCurrent: 0,
      streakLongest: 0,
      lastActiveLocalDate: null,
      weeklyXp: 0,
      weekKey: '',
    },
    learningSettings: {
      learningUi: manifest.learningUi,
      postA2PathwayChoice: null,
      postA2PathwayChosenAt: null,
    },
    readiness: { schemaMistakePatternKeysEstimate: 0 },
    active: {
      hasActiveExamSession: false,
      activeLessonStateKeys: 0,
      writingDraftCount: 0,
    },
  }
}

/**
 * Build a synchronous aggregate of all user-scoped progress domains for `userId`.
 * Call only on the client after session `userId` is known (or pass `manifest` from bootstrap).
 */
export function buildLearnerProgressSnapshot(
  userId: string,
  manifest: ProgressManifestV1
): LearnerProgressSnapshotV1 {
  const builtAt = new Date().toISOString()
  if (typeof window === 'undefined') {
    return emptySnapshot(userId, manifest, builtAt)
  }

  const retention = loadRetentionProfileSync(userId)
  const postA2 = readPostA2PathwayState(retention)
  const scenarioShape = readScenarioProgressStateForUserId(userId)
  const skillState = readSkillTrackProgressStateForUserId(userId)
  const abilityState = loadAbilityMasteryState(userId)
  const kmn = readKmnProgressStoreForUserId(userId)
  const kmnActiveTopics = Object.keys(kmn.topics ?? {}).filter((k) => {
    const row = kmn.topics[k as keyof typeof kmn.topics]
    if (!row) return false
    return (
      (row.quizAttempts ?? 0) > 0 ||
      (row.scenarioAttempts ?? 0) > 0 ||
      (row.flashCardsGraded ?? 0) > 0
    )
  })
  const skillTracks = skillState.tracks ?? {}
  const skillTrackIds = Object.keys(skillTracks)
  let skillSessions = 0
  for (const id of skillTrackIds) {
    skillSessions += skillTracks[id]?.sessionsCompleted ?? 0
  }

  const masterySummary = loadUserMasterySummary(userId)
  const drafts = getUserDrafts(userId)
  const lessonState = drafts.activeLessonState
  const lessonKeys =
    lessonState && typeof lessonState === 'object' ? Object.keys(lessonState).length : 0

  return {
    snapshotVersion: LEARNER_PROGRESS_SNAPSHOT_VERSION,
    userId,
    builtAt,
    manifest,
    lessons: {
      completedLessonIds: [...retention.completedLessonIds],
      completedModuleIds: [...retention.completedModuleIds],
      abilityUnlockCount: retention.abilities.length,
      milestonesSeenCount: retention.milestones.seenIds.length,
    },
    practice: {
      scenariosWithAnyProgress: Object.keys(scenarioShape.scenarios).length,
      qualifyingSuccessScenarioCount: scenarioShape.global.successfulScenarioIds.length,
      practiceUnlockedScenarioCount: scenarioShape.global.practiceUnlockedScenarioIds.length,
      skillTracksWithProgress: skillTrackIds.length,
      skillTrackSessionsCompletedTotal: skillSessions,
      abilityMasteryTrackedCount: Object.keys(abilityState.byAbility ?? {}).length,
    },
    review: {
      bankItemCount: countJsonArrayAtKey(reviewStorageKeys.bank(userId)),
      srsItemCount: countJsonArrayAtKey(reviewStorageKeys.srs(userId)),
      mistakeEventCount: countJsonArrayAtKey(reviewStorageKeys.mistakes(userId)),
      masteryVocabCount: masterySummary.vocab,
      masteryGrammarCount: masterySummary.grammar,
    },
    exams: {
      practiceExamAttemptCount: loadPracticeExamAttemptsForUserId(userId).length,
      kmnTopicsWithActivity: kmnActiveTopics.length,
      readinessAttemptCount: loadExamReadinessAttemptsForUserId(userId).length,
    },
    missions: {
      runtime: loadMissionRuntimeStateSync(userId),
    },
    engagement: {
      totalXp: retention.totalXp,
      streakCurrent: retention.streak.current,
      streakLongest: retention.streak.longest,
      lastActiveLocalDate: retention.streak.lastActiveLocalDate,
      weeklyXp: retention.leaderboard.weeklyXp,
      weekKey: retention.leaderboard.weekKey,
    },
    learningSettings: {
      learningUi: manifest.learningUi,
      postA2PathwayChoice: postA2.choice,
      postA2PathwayChosenAt: postA2.chosenAt,
    },
    readiness: {
      schemaMistakePatternKeysEstimate: estimateSchemaMistakeKeys(userId),
    },
    active: {
      hasActiveExamSession: drafts.activeExamSession != null,
      activeLessonStateKeys: lessonKeys,
      writingDraftCount: drafts.writingDrafts ? Object.keys(drafts.writingDrafts).length : 0,
    },
  }
}
