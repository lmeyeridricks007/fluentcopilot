import { USER_SKILL_PROFILE_SCHEMA_VERSION, type UserSkillProfile } from './skillTypes'

function nowIso(): string {
  return new Date().toISOString()
}

export function createEmptyUserSkillProfile(userId: string): UserSkillProfile {
  const t = nowIso()
  return {
    schemaVersion: USER_SKILL_PROFILE_SCHEMA_VERSION,
    userId,
    overallSkillScore: null,
    strongestSkills: [],
    weakestSkills: [],
    currentFocusSkills: [],
    metrics: {},
    lastRecomputedAt: t,
    recentEvidence: [],
    snapshots: [],
    recommendations: null,
    displayPreferences: { showNumericScores: true },
  }
}
