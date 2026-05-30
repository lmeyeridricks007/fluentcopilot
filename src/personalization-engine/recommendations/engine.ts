/**
 * Personalization Engine — recommendation generation (next lesson, review, scenario, etc.).
 */

import type { Recommendation, RecommendationType, RecommendationPriority } from '../types/recommendations.js'
import type { LearnerProfile } from '../types/profile.js'
import type { LearnerSkillProfile, SkillDimension } from '../types/skills.js'
import type { DetectedWeakness } from '../scoring/weaknessDetection.js'
import type { ProgressSnapshot } from '../types/progress.js'
import { getWeakAndStrongSkills } from '../scoring/weaknessDetection.js'
import { selectScenariosForUser } from '../learning-path/scenarioPersonalization.js'

let idCounter = 0
function nextId(): string {
  idCounter += 1
  return `rec-${Date.now()}-${idCounter}`
}

function makeRec(
  type: RecommendationType,
  contentId: string,
  reason: string,
  priority: RecommendationPriority,
  estimatedMinutes?: number,
  skillTarget?: SkillDimension
): Recommendation {
  return {
    recommendation_id: nextId(),
    type,
    content_id: contentId,
    reason,
    priority,
    estimated_time_minutes: estimatedMinutes,
    skill_target: skillTarget,
  }
}

export function generateRecommendations(
  profile: LearnerProfile,
  skillProfile: LearnerSkillProfile,
  progress: ProgressSnapshot | null,
  weaknesses: DetectedWeakness[]
): Recommendation[] {
  const recs: Recommendation[] = []
  const { weak } = getWeakAndStrongSkills(skillProfile)

  if (weak.length > 0) {
    const firstWeak = weak[0]
    const w = weaknesses.find((x) => x.skill === firstWeak)
    recs.push(
      makeRec(
        'weak_skill_practice',
        `lesson-${firstWeak}-1`,
        w?.suggested_action ?? `Improve ${firstWeak}`,
        'high',
        15,
        firstWeak
      )
    )
  }

  recs.push(
    makeRec('next_lesson', 'lesson-continue-1', 'Continue your learning path', 'high', 10)
  )

  const scenarios = selectScenariosForUser(profile, 2)
  if (scenarios.length > 0) {
    recs.push(
      makeRec(
        'conversation_scenario',
        scenarios[0],
        'Practice a real-life scenario',
        'medium',
        10
      )
    )
  }

  recs.push(
    makeRec('review_flashcards', 'flashcards-due', 'Review vocabulary', 'medium', 5)
  )

  if (profile.learning_goal === 'integration_exam' && (profile.target_level === 'A2' || profile.target_level === 'B1')) {
    recs.push(
      makeRec('exam_prep_module', 'exam-reading-a2', 'Exam prep: reading', 'medium', 20)
    )
  }

  if (progress && progress.current_streak_days === 0 && (progress.last_activity_at ?? '') < new Date(Date.now() - 86400 * 1000).toISOString()) {
    recs.push(
      makeRec('streak_reminder', 'daily-goal', 'Start a new streak today', 'low', profile.daily_goal_minutes)
    )
  }

  return recs
}
