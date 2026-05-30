/**
 * Personalization Engine — public API.
 */

export * from './types/index.js'
export {
  getRecommendations,
  getLearningPath,
  getSkillProfile,
  postActivityEvent,
} from './services/personalizationService.js'
export { getProfile, setProfile, getProgressSnapshot, setProgressSnapshot } from './models/profileStore.js'
export { seedMockProfile, seedMockProgress, seedMock, MOCK_USER_ID } from './models/seed.js'
export { computeSkillProfile } from './scoring/skillScoring.js'
export { detectWeakSkills, getWeakAndStrongSkills } from './scoring/weaknessDetection.js'
export { getDifficultyRecommendation, aggregateRecentPerformance } from './adaptive/difficulty.js'
export { selectScenariosForUser } from './learning-path/scenarioPersonalization.js'
export { generateDailyPath, generateWeeklyPath } from './learning-path/pathGenerator.js'
export { recordRecall, getDueForReview } from './learning-path/spacedRepetition.js'
export { ingestActivityEvent } from './telemetry/ingestion.js'
export { getRetentionTriggers } from './retention/triggers.js'
