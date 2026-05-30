/**
 * Sent on selected API requests from Dev Tools UI. The backend only honors this when
 * `NODE_ENV !== 'production'` so production builds never return extended payloads.
 */
export const FLUENT_DEV_TOOLS_API_HEADER = 'x-fluentcopilot-dev-tools'
export const FLUENT_DEV_TOOLS_API_HEADER_VALUE = '1'

/**
 * Gates internal QA / dev utilities. Never enable in production builds for real users.
 *
 * Enable locally:
 * - Default: `NODE_ENV === 'development'`
 * - Or set `NEXT_PUBLIC_DEV_TOOLS=true` (e.g. staging QA builds)
 */
export function isDevToolsRouteEnabled(): boolean {
  if (process.env.NODE_ENV === 'development') return true
  return process.env.NEXT_PUBLIC_DEV_TOOLS === 'true'
}

/** Client-only check (avoids SSR mismatch). */
export function isDevToolsEnabledClient(): boolean {
  if (typeof window === 'undefined') return false
  return isDevToolsRouteEnabled()
}
