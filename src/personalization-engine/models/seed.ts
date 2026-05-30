/**
 * Personalization Engine — mock seed data for development.
 */

import type { LearnerProfile } from '../types/profile.js'
import type { ProgressSnapshot } from '../types/progress.js'
import { setProfile, setProgressSnapshot } from './profileStore.js'

export const MOCK_USER_ID = 'mock-user-1'

export function seedMockProfile(): LearnerProfile {
  const profile: LearnerProfile = {
    user_id: MOCK_USER_ID,
    native_language: 'English',
    known_languages: ['English', 'Spanish'],
    country_of_origin: 'UK',
    time_in_country_months: 6,
    family_status: 'parent',
    age_range: '30-40',
    occupation: 'Software developer',
    industry: 'tech',
    hobbies: ['reading', 'cycling'],
    current_level: 'A2',
    target_level: 'B1',
    learning_goal: 'integration_exam',
    daily_goal_minutes: 15,
  }
  setProfile(profile)
  return profile
}

export function seedMockProgress(): ProgressSnapshot {
  const snapshot: ProgressSnapshot = {
    user_id: MOCK_USER_ID,
    lessons_completed: 5,
    flashcard_success_rate: 0.72,
    quiz_accuracy_avg: 0.65,
    conversation_sessions_count: 2,
    pronunciation_score_avg: 0.7,
    listening_comprehension_avg: 0.6,
    current_streak_days: 2,
    total_xp: 120,
    total_time_minutes: 45,
    last_activity_at: new Date().toISOString(),
  }
  setProgressSnapshot(snapshot)
  return snapshot
}

export function seedMock(): void {
  seedMockProfile()
  seedMockProgress()
}
