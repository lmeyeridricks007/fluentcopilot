/**
 * Personalization Engine — weak skill and gap detection.
 */

import type { SkillDimension, LearnerSkillProfile } from '../types/skills.js'
import type { ProgressSnapshot } from '../types/progress.js'
import { getQuizResults, getConversationSummaries } from '../models/profileStore.js'

const WEAK_THRESHOLD = 0.5
const STRONG_THRESHOLD = 0.75

export interface DetectedWeakness {
  skill: SkillDimension
  reason: string
  severity: 'low' | 'medium' | 'high'
  suggested_action: string
}

export function detectWeakSkills(
  skillProfile: LearnerSkillProfile,
  _progress: ProgressSnapshot | null
): DetectedWeakness[] {
  const weaknesses: DetectedWeakness[] = []
  for (const [dim, state] of Object.entries(skillProfile.skills)) {
    const skill = dim as SkillDimension
    if (state.score >= WEAK_THRESHOLD) continue
    let reason = 'Low score'
    let severity: DetectedWeakness['severity'] = 'medium'
    let suggested_action = 'Practice more'
    if (state.trend === 'down') {
      reason = 'Declining performance'
      severity = 'high'
      suggested_action = 'Review and practice'
    } else if (state.sample_count < 3) {
      reason = 'Insufficient data; assume practice needed'
      severity = 'low'
      suggested_action = 'Complete a few exercises'
    } else {
      reason = `Score ${(state.score * 100).toFixed(0)}% below threshold`
      if (state.score < 0.35) severity = 'high'
      if (skill === 'grammar') suggested_action = 'Grammar lesson and quiz'
      else if (skill === 'vocabulary') suggested_action = 'Flashcards and vocabulary lesson'
      else if (skill === 'pronunciation') suggested_action = 'Pronunciation exercises'
      else if (skill === 'listening') suggested_action = 'Listening practice'
      else if (skill === 'conversation_fluency' || skill === 'speaking') suggested_action = 'Scenario conversation practice'
    }
    weaknesses.push({ skill, reason, severity, suggested_action })
  }
  return weaknesses
}

export function inferWeaknessesFromActivity(userId: string): Partial<Record<SkillDimension, string>> {
  const inferred: Partial<Record<SkillDimension, string>> = {}
  const quizzes = getQuizResults(userId)
  const conversations = getConversationSummaries(userId)
  const recentQuizzes = quizzes.slice(-5)
  const recentConvs = conversations.slice(-3)
  if (recentQuizzes.length >= 2) {
    const avg = recentQuizzes.reduce((a, q) => a + q.accuracy, 0) / recentQuizzes.length
    if (avg < 0.6) {
      inferred.grammar = 'Low quiz accuracy'
      inferred.vocabulary = 'Quiz performance suggests vocabulary review'
    }
  }
  if (recentConvs.length >= 1) {
    const highCorrections = recentConvs.filter((c) => c.correction_count > 3)
    if (highCorrections.length > 0) inferred.conversation_fluency = 'Frequent corrections in conversation'
    const lowFluency = recentConvs.filter((c) => (c.fluency_score ?? 0.5) < 0.5)
    if (lowFluency.length > 0) inferred.speaking = 'Conversation fluency below target'
  }
  return inferred
}

export function getWeakAndStrongSkills(skillProfile: LearnerSkillProfile): {
  weak: SkillDimension[]
  strong: SkillDimension[]
} {
  const weak: SkillDimension[] = []
  const strong: SkillDimension[] = []
  for (const [dim, state] of Object.entries(skillProfile.skills)) {
    const skill = dim as SkillDimension
    if (state.score < WEAK_THRESHOLD) weak.push(skill)
    else if (state.score >= STRONG_THRESHOLD && state.sample_count >= 2) strong.push(skill)
  }
  return { weak, strong }
}
