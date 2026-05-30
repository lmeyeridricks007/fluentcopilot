/**
 * Personalization Engine — main service API (recommendations, learning path, skill profile, activity).
 */

import type {
  GetRecommendationsResponse,
  GetLearningPathResponse,
  GetSkillProfileResponse,
  PostActivityEventRequest,
  PostActivityEventResponse,
} from '../types/api.js'
import { getProfile, getProgressSnapshot } from '../models/profileStore.js'
import { computeSkillProfile } from '../scoring/skillScoring.js'
import { detectWeakSkills, getWeakAndStrongSkills } from '../scoring/weaknessDetection.js'
import { generateRecommendations } from '../recommendations/engine.js'
import { getSessionRecommendationSet } from '../recommendations/sessionRecommendations.js'
import { generateDailyPath } from '../learning-path/pathGenerator.js'
import { ingestActivityEvent } from '../telemetry/ingestion.js'

function buildSkillProfile(userId: string): GetSkillProfileResponse['profile'] | null {
  const profile = getProfile(userId)
  const progress = getProgressSnapshot(userId)
  if (!profile) return null
  const skills = computeSkillProfile(userId, progress)
  const draft = {
    user_id: userId,
    skills,
    overall_level_estimate: profile.current_level,
    weak_skills: [] as GetSkillProfileResponse['profile']['weak_skills'],
    strong_skills: [] as GetSkillProfileResponse['profile']['strong_skills'],
    updated_at: new Date().toISOString(),
  }
  const { weak, strong } = getWeakAndStrongSkills(draft)
  draft.weak_skills = weak
  draft.strong_skills = strong
  return draft
}

export function getRecommendations(userId: string, includeSessionSet: boolean): GetRecommendationsResponse | null {
  const profile = getProfile(userId)
  const progress = getProgressSnapshot(userId)
  const skillProfile = buildSkillProfile(userId)
  if (!profile || !skillProfile) return null
  const weaknesses = detectWeakSkills(skillProfile, progress)
  const recommendations = generateRecommendations(profile, skillProfile, progress, weaknesses)
  const session_set = includeSessionSet
    ? getSessionRecommendationSet(userId, profile, skillProfile, progress, weaknesses)
    : undefined
  return { recommendations, session_set }
}

export function getLearningPath(userId: string): GetLearningPathResponse | null {
  const profile = getProfile(userId)
  const skillProfile = buildSkillProfile(userId)
  const progress = getProgressSnapshot(userId)
  if (!profile || !skillProfile) return null
  const weaknesses = detectWeakSkills(skillProfile, progress)
  const daily = generateDailyPath(userId, profile, skillProfile, progress, weaknesses)
  return {
    daily,
    weekly_goal_minutes: profile.daily_goal_minutes * 5,
  }
}

export function getSkillProfile(userId: string): GetSkillProfileResponse | null {
  const profile = buildSkillProfile(userId)
  if (!profile) return null
  return { profile }
}

export function postActivityEvent(request: PostActivityEventRequest): PostActivityEventResponse {
  ingestActivityEvent(request.event)
  return { accepted: true }
}
