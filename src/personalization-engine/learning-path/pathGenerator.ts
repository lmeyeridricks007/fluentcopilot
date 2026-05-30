/**
 * Personalization Engine — daily and weekly learning path generation.
 */

import type { DailyLearningPath, WeeklyLearningPath } from '../types/learning-path.js'
import type { LearnerProfile } from '../types/profile.js'
import type { Recommendation } from '../types/recommendations.js'
import type { ProgressSnapshot } from '../types/progress.js'
import { generateRecommendations } from '../recommendations/engine.js'
import type { LearnerSkillProfile } from '../types/skills.js'
import type { DetectedWeakness } from '../scoring/weaknessDetection.js'
import { selectScenariosForUser } from './scenarioPersonalization.js'

export function generateDailyPath(
  userId: string,
  profile: LearnerProfile,
  skillProfile: LearnerSkillProfile,
  progress: ProgressSnapshot | null,
  weaknesses: DetectedWeakness[]
): DailyLearningPath {
  const date = new Date().toISOString().slice(0, 10)
  const recs = generateRecommendations(profile, skillProfile, progress, weaknesses)
  const recommendedLessons = recs.filter((r) => r.type === 'next_lesson' || r.type === 'weak_skill_practice')
  const reviewItems = recs.filter((r) => r.type === 'review_flashcards')
  const scenarioIds = selectScenariosForUser(profile, 1)
  const scenarioRec: Recommendation | undefined =
    scenarioIds.length > 0
      ? {
          recommendation_id: `rec-${Date.now()}-scenario`,
          type: 'conversation_scenario',
          content_id: scenarioIds[0],
          reason: 'Daily scenario practice',
          priority: 'medium',
          estimated_time_minutes: 10,
        }
      : undefined

  return {
    user_id: userId,
    date,
    recommended_lessons: recommendedLessons,
    review_items: reviewItems,
    scenario_practice: scenarioRec,
    daily_goal_minutes: profile.daily_goal_minutes,
    weekly_goal_minutes: profile.daily_goal_minutes * 5,
    progress_toward_goal_minutes: progress?.total_time_minutes ?? 0,
  }
}

export function generateWeeklyPath(
  userId: string,
  profile: LearnerProfile
): WeeklyLearningPath {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  return {
    user_id: userId,
    week_start: weekStart.toISOString().slice(0, 10),
    goals: [
      `Complete ${profile.daily_goal_minutes * 5} minutes of practice`,
      'Balance vocabulary, grammar, and conversation',
      'Try at least 2 different scenarios',
    ],
    skill_balance: [
      { skill: 'vocabulary', target_minutes: 30 },
      { skill: 'grammar', target_minutes: 20 },
      { skill: 'conversation_fluency', target_minutes: 25 },
    ],
    scenario_rotation: selectScenariosForUser(profile, 5),
    review_cycles: 3,
  }
}
