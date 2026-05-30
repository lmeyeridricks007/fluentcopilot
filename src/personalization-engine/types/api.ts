/**
 * Personalization Engine — API/service contract types.
 */

import type { LearnerSkillProfile } from './skills.js'
import type { Recommendation, SessionRecommendationSet } from './recommendations.js'
import type { DailyLearningPath } from './learning-path.js'
import type { ActivityEvent } from './activity.js'

export interface GetRecommendationsResponse {
  recommendations: Recommendation[]
  session_set?: SessionRecommendationSet
}

export interface GetLearningPathResponse {
  daily?: DailyLearningPath
  weekly_goal_minutes?: number
}

export interface GetSkillProfileResponse {
  profile: LearnerSkillProfile
}

export interface PostActivityEventRequest {
  event: ActivityEvent
}

export interface PostActivityEventResponse {
  accepted: boolean
}
