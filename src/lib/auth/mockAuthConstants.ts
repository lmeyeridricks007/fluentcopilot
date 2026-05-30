/**
 * Closed-beta mock auth constants.
 *
 * SECURITY: `MOCK_BETA_TEMPORARY_PASSWORD` is intentionally weak and lives in source.
 * Replace with real auth + server-side verification before any production launch.
 */
export const MOCK_BETA_TEMPORARY_PASSWORD = 'password' as const

export const MOCK_BETA_AUTH_SOURCE = 'mock_beta' as const

export type MockBetaAuthSource = typeof MOCK_BETA_AUTH_SOURCE
