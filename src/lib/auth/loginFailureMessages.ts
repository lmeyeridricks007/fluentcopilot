import type { MockCredentialFailureCode } from './authTypes'

/**
 * User-facing copy for mock credential validation. Kept out of UI components.
 */
export function messageForMockCredentialFailure(code: MockCredentialFailureCode): string {
  switch (code) {
    case 'not_found':
      return "We couldn't find that email on the invite list for this closed beta. If you haven't been invited yet, you can request access from the waitlist below."
    case 'password_invalid':
      return "That email and password don't match. Double-check your invite details, or request access if you haven't joined the beta yet."
    case 'inactive':
    case 'access_denied':
      return "This account doesn't have active beta access yet. If you think that's wrong, reply to your invite email or contact support."
    default:
      return 'Something went wrong. Please try again.'
  }
}

export function messageForSessionRestoreFailure(): string {
  return 'Your saved session could not be restored. Please sign in again.'
}
