import { ONBOARDING_START_HANDOFF_STORAGE_KEY } from './constants'

export type OnboardingHandoffPayload = {
  route: string
  pathwayKey: string
  headline: string
  subline: string
}

export function readPendingOnboardingHandoff(expectedRoute: string): OnboardingHandoffPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(ONBOARDING_START_HANDOFF_STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as OnboardingHandoffPayload
    if (typeof p.route !== 'string' || p.route !== expectedRoute) return null
    return p
  } catch {
    sessionStorage.removeItem(ONBOARDING_START_HANDOFF_STORAGE_KEY)
    return null
  }
}

export function clearOnboardingStartHandoff(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(ONBOARDING_START_HANDOFF_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function writeOnboardingStartHandoff(payload: OnboardingHandoffPayload): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(ONBOARDING_START_HANDOFF_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}
