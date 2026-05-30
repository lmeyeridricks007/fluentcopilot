/**
 * Auth feature types — aligned with authStore and mock API contract.
 */

import type { BetaPlanId } from '@/lib/auth/mockAuthTypes'

export interface AuthUser {
  id: string
  name: string
  email: string
  nativeLanguage: string
  currentLevel: string
  targetLevel: string
  /** From closed-beta registry or future billing; drives entitlements when synced to premium store. */
  plan?: BetaPlanId
  betaAccessAllowed?: boolean
  loginAt?: string
  authProviderType?: string
  targetObjective?: string
  country?: string
  timeInNetherlands?: string
  familyStatus?: string
  ageRange?: string
  workRole?: string
  industry?: string
  hobbies?: string[]
  notificationPreferences?: { email: boolean; push: boolean }
  dailyLearningGoalMinutes?: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignUpPayload {
  name: string
  email: string
  password: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface AuthApiResponse {
  user: AuthUser
  token?: string
}

export interface AuthApiError {
  code: string
  message: string
}
