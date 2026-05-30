import type {
  ProgressManifestV1,
  UserProfileDocumentV1,
} from '@/lib/storage/storageTypes'
import {
  PROGRESS_MANIFEST_SCHEMA_VERSION,
  USER_PROFILE_SCHEMA_VERSION,
} from '@/lib/storage/storageTypes'
import type { OnboardingData } from '@/store/onboardingStore'

export const LEARNER_PROFILE_SCHEMA_VERSION = USER_PROFILE_SCHEMA_VERSION
export const PROGRESS_ROOT_SCHEMA_VERSION = PROGRESS_MANIFEST_SCHEMA_VERSION

/** @deprecated Prefer `UserProfileDocumentV1` — alias retained for bootstrap call sites. */
export type LearnerProfileRecord = UserProfileDocumentV1

/** @deprecated Prefer `ProgressManifestV1` — alias retained for bootstrap call sites. */
export type ProgressRootRecord = ProgressManifestV1

export type OnboardingResolution =
  | { kind: 'complete' }
  | { kind: 'fresh' }
  | { kind: 'resume'; step: number; data: Partial<OnboardingData> }

export type AccountBootstrapResult = {
  userId: string
  profile: LearnerProfileRecord
  onboarding: OnboardingResolution
  /** True when this bootstrap ran device-local cold start (empty slate) for this user. */
  firstLoginColdStart: boolean
  recovery: {
    profileReset: boolean
    progressReset: boolean
    onboardingReset: boolean
  }
  targetRoute: string
}
