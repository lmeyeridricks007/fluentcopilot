import type { MockSignInSuccess } from './authTypes'

/**
 * Future real auth (Clerk, Supabase, custom API) should implement this port
 * and return the same `MockSignInSuccess` shape (or map server session → this snapshot).
 */
export type AuthPort = {
  signIn(input: { email: string; password: string }): Promise<MockSignInSuccess>
  signOut(): Promise<void> | void
}
