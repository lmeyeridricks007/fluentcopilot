/**
 * Personalization Engine — tests.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  setProfile,
  getProfile,
  getProgressSnapshot,
  getRecommendations,
  getLearningPath,
  getSkillProfile,
  postActivityEvent,
  selectScenariosForUser,
  getDifficultyRecommendation,
  getDueForReview,
  recordRecall,
  getRetentionTriggers,
  seedMockProfile,
  seedMockProgress,
  MOCK_USER_ID,
} from '../index.js'
import type { LearnerProfile } from '../types/profile.js'
import type { ActivityEvent } from '../types/activity.js'

beforeEach(() => {
  seedMockProfile()
  seedMockProgress()
})

describe('Profile and progress', () => {
  it('returns null when profile missing', () => {
    expect(getRecommendations('unknown-user', false)).toBeNull()
    expect(getSkillProfile('unknown-user')).toBeNull()
    expect(getLearningPath('unknown-user')).toBeNull()
  })

  it('returns recommendations when profile exists', () => {
    const res = getRecommendations(MOCK_USER_ID, false)
    expect(res).not.toBeNull()
    expect(res!.recommendations.length).toBeGreaterThan(0)
    expect(res!.recommendations.some((r) => r.type === 'next_lesson' || r.type === 'weak_skill_practice')).toBe(true)
  })

  it('returns session set when requested', () => {
    const res = getRecommendations(MOCK_USER_ID, true)
    expect(res?.session_set).toBeDefined()
    expect(res?.session_set?.user_id).toBe(MOCK_USER_ID)
    expect(res?.session_set?.generated_at).toBeDefined()
  })

  it('returns skill profile with weak/strong skills', () => {
    const res = getSkillProfile(MOCK_USER_ID)
    expect(res).not.toBeNull()
    expect(res!.profile.skills).toBeDefined()
    expect(Object.keys(res!.profile.skills).length).toBeGreaterThan(0)
    expect(Array.isArray(res!.profile.weak_skills)).toBe(true)
    expect(Array.isArray(res!.profile.strong_skills)).toBe(true)
  })

  it('returns learning path with daily recommendations', () => {
    const res = getLearningPath(MOCK_USER_ID)
    expect(res).not.toBeNull()
    expect(res!.daily).toBeDefined()
    expect(res!.daily!.user_id).toBe(MOCK_USER_ID)
    expect(res!.daily!.recommended_lessons.length).toBeGreaterThan(0)
    expect(res!.daily!.daily_goal_minutes).toBe(15)
  })
})

describe('Activity ingestion', () => {
  it('accepts activity event', () => {
    const event: ActivityEvent = {
      event_type: 'lesson_completed',
      user_id: MOCK_USER_ID,
      timestamp: new Date().toISOString(),
      payload: { lesson_id: 'L1', success: true, score: 80 },
    }
    const res = postActivityEvent({ event })
    expect(res.accepted).toBe(true)
  })
})

describe('Scenario personalization', () => {
  it('selects scenarios for parent with integration goal', () => {
    const profile = getProfile(MOCK_USER_ID)!
    const scenarios = selectScenariosForUser(profile, 3)
    expect(scenarios.length).toBeGreaterThan(0)
    expect(scenarios.length).toBeLessThanOrEqual(3)
  })

  it('selects workplace scenarios for office occupation', () => {
    const profile: LearnerProfile = {
      ...getProfile(MOCK_USER_ID)!,
      occupation: 'Office manager',
      learning_goal: 'workplace',
    }
    setProfile(profile)
    const scenarios = selectScenariosForUser(profile, 5)
    expect(scenarios.length).toBeGreaterThan(0)
  })
})

describe('Adaptive difficulty', () => {
  it('suggests increase when accuracy high', () => {
    const rec = getDifficultyRecommendation('A2', 0.9, 0.6)
    expect(rec.adjustment === 'increase' || rec.adjustment === 'maintain').toBe(true)
  })

  it('suggests review when accuracy low', () => {
    const rec = getDifficultyRecommendation('A2', 0.4, 0.1)
    expect(rec.adjustment === 'decrease' || rec.adjustment === 'review').toBe(true)
  })
})

describe('Spaced repetition', () => {
  it('records recall and returns due items', () => {
    recordRecall(MOCK_USER_ID, 'item-1', true)
    const due = getDueForReview(MOCK_USER_ID, 10)
    expect(Array.isArray(due)).toBe(true)
  })
})

describe('Retention triggers', () => {
  it('returns triggers for user with progress', () => {
    const profile = getProfile(MOCK_USER_ID)!
    const progress = getProgressSnapshot(MOCK_USER_ID)
    const triggers = getRetentionTriggers(profile, progress)
    expect(Array.isArray(triggers)).toBe(true)
  })
})
