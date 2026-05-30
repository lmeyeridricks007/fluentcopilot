import { ROUTES } from '@/lib/routing/authRedirects'
import type { OnboardingResolution } from './types'

/** Post-bootstrap navigation target (guards enforce the same rules). */
export function resolvePostBootstrapRoute(onboarding: OnboardingResolution): string {
  if (onboarding.kind === 'complete') return ROUTES.appHome
  return ROUTES.onboarding
}
