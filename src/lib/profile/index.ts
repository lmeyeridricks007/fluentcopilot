export type { RoutinePreferencesV1, UserProfileDocumentV1 } from './profileTypes'
export type { SelectedPathwayId } from './profileTypes'
export { SELECTED_PATHWAY_IDS, isSelectedPathwayId } from './profileTypes'
export type { LearnerProfileStoreStatus } from './profileStore'
export { useLearnerProfileStore } from './profileStore'
export {
  beginLearnerProfileHydration,
  clearLearnerProfileStore,
  finalizeLearnerProfileHydration,
  mergeLearnerProfilePatch,
  mergeLearnerPreferences,
  persistLearnerProfileDocument,
  replaceLearnerProfileDocument,
  resetLearnerProfileForDev,
  setLearnerSelectedPathway,
  setLearnerSelectedPathwayIfValid,
} from './profileActions'
export { useProfile } from './useProfile'
export { routinePreferencesV1Schema } from './profileSchema'
export {
  buildPreferencesPatchFromMergedOnboarding,
  desiredLevelFromTargetPath,
  mapMergedOnboardingToExplicitProfileFields,
  mapOnboardingAnswersToProfilePatch,
} from './onboardingProfileMapper'
export { mergeOnboardingAnswersIntoProfileDocument } from './profileUpdates'
export {
  diffOnboardingProfileSignals,
  getCurrentPlan,
  getSelectedPathway,
  getUserCurrentLevelSelfReportId,
  getUserFocusAreaIds,
  getUserGoals,
  getUserLearningReasonId,
  getUserPrimaryGoal,
  getUserRoutinePreferences,
  getUserTargetPathId,
  isOnboardingComplete,
  isOnboardingExplicitlyComplete,
  listPopulatedOnboardingSignalFields,
} from './profileSelectors'
