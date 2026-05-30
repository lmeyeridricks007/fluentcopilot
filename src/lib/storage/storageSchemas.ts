import { z } from 'zod'
import {
  DRAFTS_DOCUMENT_SCHEMA_VERSION,
  PROGRESS_MANIFEST_SCHEMA_VERSION,
  SESSION_DOCUMENT_SCHEMA_VERSION,
  USER_PROFILE_SCHEMA_VERSION,
} from './storageTypes'

export const storageSyncMetaV1Schema = z
  .object({
    documentVersion: z.literal(1),
    lastSyncedAt: z.string().optional(),
    serverRevision: z.string().optional(),
    dirty: z.boolean().optional(),
  })
  .passthrough()

const routinePreferencesV1Schema = z
  .object({
    studyRhythmId: z.string(),
    dailyMinutesCommitted: z.number().finite().optional(),
  })
  .passthrough()

const onboardingStartExperienceV1Schema = z
  .object({
    pathwayKey: z.string(),
    route: z.string(),
    emphasis: z.string(),
    decisionTrace: z.string(),
    welcomeHeadline: z.string(),
    welcomeSubline: z.string(),
    resolvedAt: z.string(),
    targetPath: z.string().optional(),
    primaryGoal: z.string().optional(),
    learningReason: z.string().optional(),
  })
  .passthrough()

export const userProfileDocumentV1Schema = z
  .object({
    schemaVersion: z.literal(USER_PROFILE_SCHEMA_VERSION),
    userId: z.string().min(1),
    createdAt: z.string(),
    updatedAt: z.string(),
    onboardingComplete: z.boolean(),
    onboardingStep: z.number(),
    onboardingData: z.record(z.string(), z.unknown()).default({}),
    onboardingCompletedAt: z.string().optional(),
    primaryGoalId: z.string().optional(),
    learnerGoals: z.array(z.string()).optional(),
    currentLevelSelfReportId: z.string().optional(),
    learningReasonId: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    plan: z.string().optional(),
    betaAccessAllowed: z.boolean().optional(),
    authProviderType: z.string().optional(),
    selectedPath: z.string().optional(),
    currentLevel: z.string().optional(),
    desiredLevel: z.string().optional(),
    focusAreas: z.array(z.string()).optional(),
    studyRhythm: z.string().optional(),
    routinePreferences: routinePreferencesV1Schema.optional(),
    onboardingStartExperienceV1: onboardingStartExperienceV1Schema.optional(),
    firstPersonalizedHandoffShownAt: z.string().optional(),
    preferences: z.record(z.string(), z.unknown()).optional(),
    isNewUser: z.boolean().optional(),
    firstLoginAt: z.string().optional(),
    syncMeta: storageSyncMetaV1Schema.optional(),
  })
  .passthrough()

export const progressDomainsRegistryV1Schema = z
  .object({
    retentionProfile: z.string(),
    reviewBank: z.string(),
    reviewSrs: z.string(),
    reviewMistakes: z.string(),
    reviewMastery: z.string(),
    abilityMastery: z.string(),
    missionRuntime: z.string(),
    schemaMistakesPattern: z.string(),
  })
  .passthrough()

export const progressManifestV1Schema = z
  .object({
    schemaVersion: z.literal(PROGRESS_MANIFEST_SCHEMA_VERSION),
    userId: z.string().min(1),
    createdAt: z.string(),
    updatedAt: z.string(),
    domains: progressDomainsRegistryV1Schema,
    syncMeta: storageSyncMetaV1Schema.optional(),
  })
  .passthrough()

export const draftsDocumentV1Schema = z
  .object({
    schemaVersion: z.literal(DRAFTS_DOCUMENT_SCHEMA_VERSION),
    userId: z.string().min(1),
    updatedAt: z.string(),
    writingDrafts: z
      .record(
        z.object({
          updatedAt: z.string(),
          payload: z.unknown(),
        })
      )
      .optional(),
    activeExamSession: z.unknown().optional(),
    activeLessonState: z.record(z.string(), z.unknown()).optional(),
    onboardingDraftLocation: z.literal('profile').optional(),
    syncMeta: storageSyncMetaV1Schema.optional(),
  })
  .passthrough()

export const sessionDocumentV1Schema = z
  .object({
    schemaVersion: z.literal(SESSION_DOCUMENT_SCHEMA_VERSION),
    updatedAt: z.string(),
    userId: z.string().min(1),
    email: z.string().min(1),
    displayName: z.string(),
    plan: z.string().optional(),
    authProviderType: z.string().optional(),
    loginAt: z.string().optional(),
    betaAccessAllowed: z.boolean(),
    onboardingComplete: z.boolean(),
    zustandPersistVersion: z.number().optional(),
  })
  .passthrough()
