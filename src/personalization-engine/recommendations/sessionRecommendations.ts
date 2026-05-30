/**
 * Personalization Engine — session-opening recommendation set (Continue Learning, Daily Practice, etc.).
 */

import type { SessionRecommendationSet } from '../types/recommendations.js'
import type { LearnerProfile } from '../types/profile.js'
import type { LearnerSkillProfile } from '../types/skills.js'
import type { ProgressSnapshot } from '../types/progress.js'
import type { DetectedWeakness } from '../scoring/weaknessDetection.js'
import { generateRecommendations } from './engine.js'
import { selectScenariosForUser } from '../learning-path/scenarioPersonalization.js'

export function getSessionRecommendationSet(
  userId: string,
  profile: LearnerProfile,
  skillProfile: LearnerSkillProfile,
  progress: ProgressSnapshot | null,
  weaknesses: DetectedWeakness[]
): SessionRecommendationSet {
  const all = generateRecommendations(profile, skillProfile, progress, weaknesses)
  const continueLearning = all.find((r) => r.type === 'next_lesson' || r.type === 'weak_skill_practice')
  const dailyPractice = all.find((r) => r.type === 'review_flashcards') ?? all.find((r) => r.type === 'daily_goal')
  const scenarioIds = selectScenariosForUser(profile, 1)
  const scenarioPractice =
    scenarioIds.length > 0
      ? all.find((r) => r.type === 'conversation_scenario') ?? {
          recommendation_id: `rec-${Date.now()}-sess-scenario`,
          type: 'conversation_scenario' as const,
          content_id: scenarioIds[0],
          reason: 'Scenario practice',
          priority: 'medium' as const,
          estimated_time_minutes: 10,
        }
      : undefined
  const weakSkill = all.find((r) => r.type === 'weak_skill_practice')
  const examPrep = all.find((r) => r.type === 'exam_prep_module')
  const retention = all.filter((r) => r.type === 'streak_reminder' || r.type === 'challenge' || r.type === 'daily_goal')

  return {
    user_id: userId,
    continue_learning: continueLearning ?? undefined,
    daily_practice: dailyPractice ?? undefined,
    scenario_practice: scenarioPractice,
    weak_skill_practice: weakSkill,
    exam_prep: profile.learning_goal === 'integration_exam' ? examPrep : undefined,
    retention: retention.length > 0 ? retention : undefined,
    generated_at: new Date().toISOString(),
  }
}
