/**
 * Closed-beta mock identity registry, session helpers, and auth provider.
 *
 * **Identity source:** registry + `validateMockBetaCredentials` (swap for IdP later).
 * **Session UI source:** `AuthProvider` + `useAuth()` (wraps Zustand `useAuthStore` + persist).
 */

export {
  MOCK_BETA_AUTH_SOURCE,
  MOCK_BETA_TEMPORARY_PASSWORD,
  type MockBetaAuthSource,
} from './mockAuthConstants'
export type {
  BetaPlanId,
  MockBetaRegistryRecord,
  MockOnboardingDefaultState,
} from './mockAuthTypes'
export type {
  AuthSessionUser,
  MockSignInSuccess,
  MockCredentialFailureCode,
  MockAuthLoginError,
} from './authTypes'
export { isMockAuthLoginError } from './authTypes'
export type { AuthPort } from './authPort'
export { MOCK_BETA_INVITED_USERS } from './mockUsers'
export {
  normalizeBetaEmail,
  getMockBetaUserByEmail,
  getMockUserByEmail,
  isInvitedBetaUser,
  getMockUserPlan,
  canAccessClosedBeta,
  validateMockBetaCredentials,
  validateMockUserCredentials,
  validateMockCredentials,
  canLoginToClosedBeta,
  listMockBetaInviteEmails,
  type ValidateMockBetaCredentialsResult,
} from './mockUserLookup'
export {
  AUTH_STORAGE_KEY,
  readRawAuthStorage,
  parseAuthStorageEnvelope,
  isValidSessionUserProfile,
  validatePersistedAuthState,
  removeAuthStorageKey,
  type PersistedAuthUserSnapshot,
} from './sessionStorage'
export {
  clearSessionStorage,
  getSessionDocumentFromStorage,
  listInspectableKeysForUser,
} from '@/lib/storage/authPersistStorage'
export { messageForMockCredentialFailure, messageForSessionRestoreFailure } from './loginFailureMessages'
export { mockAuthService } from './mockAuthService'
export { applyMockSignInSession } from './applyMockSignInSession'
export { AuthProvider, AuthContext, type AuthContextValue } from './AuthContext'
export { useAuth } from './useAuth'
export {
  clearMockAuthSession,
  clearLearnerBootstrapDataForCurrentUser,
  devSimulateFirstLoginWipeForCurrentUser,
} from './devSession'
