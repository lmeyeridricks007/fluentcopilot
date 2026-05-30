/**
 * Feature flags for gradual rollout.
 * Replace with env or remote config when backend exists.
 */
export const featureFlags = {
  voiceTutor: true,
  reflection: true,
  examPrep: true,
  premiumUpsell: true,
} as const
