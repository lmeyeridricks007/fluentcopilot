'use client'

import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { recordSkillTrackSessionComplete } from '@/lib/retention/retentionService'
import { detectSkillTrackMilestones } from '@/lib/practice-progress/practiceMilestoneService'
import type { PracticeProgressHighlight } from '@/lib/practice-progress/types'
import type { MilestoneHit } from '@/lib/retention/types'
import {
  writePracticeCompletionUi,
  type PracticeCompletionUiPayload,
} from '@/lib/practice-progress/practiceProgressUiStorage'

export function processSkillTrackSessionProgress(input: {
  trackId: string
  levelIndex: number
  score: number
  passed: boolean
  xpAmount: number
}): { xpGained: number; streak: number; streakExtended: boolean; milestones: MilestoneHit[] } {
  const meta = recordSkillTrackSessionComplete({
    trackId: input.trackId,
    levelIndex: input.levelIndex,
    score: input.score,
    xpAmount: input.xpAmount,
  })

  const practiceMilestones = detectSkillTrackMilestones({
    trackId: input.trackId,
    passed: input.passed,
  })

  const highlights: PracticeProgressHighlight[] = []
  if (meta.xpGained > 0) {
    highlights.push({
      id: 'xp',
      tone: 'primary',
      title: `+${meta.xpGained} XP`,
      body: 'Skill track rep — lighter than a full scenario, still builds the habit.',
    })
  }
  if (meta.streakExtended) {
    highlights.push({
      id: 'streak',
      tone: 'success',
      title: 'Streak extended',
      body: `You’re on a ${meta.streak} day streak.`,
    })
  } else if (input.passed && input.score >= 0.45) {
    highlights.push({
      id: 'streak',
      tone: 'neutral',
      title: 'Practice counted',
      body: 'Solid skill-track session — it counts toward your daily habit.',
    })
  }
  const pm = practiceMilestones[0]
  if (pm) {
    highlights.push({ id: pm.id, tone: 'neutral', title: pm.title, body: pm.body })
  }

  const payload: PracticeCompletionUiPayload = {
    scenarioId: input.trackId,
    xpGained: meta.xpGained,
    streakExtended: meta.streakExtended,
    countsTowardStreak: input.passed && input.score >= 0.45,
    streakMessage: meta.streakExtended ? `Your ${meta.streak} day streak continues.` : null,
    highlights: highlights.slice(0, 3),
    retentionMilestones: meta.milestones,
    practiceMilestones,
    unlocks: [],
    masteryHighlights: [],
  }
  writePracticeCompletionUi(payload)

  track(ANALYTICS_EVENTS.practice_session_completed, {
    trackId: input.trackId,
    levelIndex: input.levelIndex,
    kind: 'skill_track',
    xpGained: meta.xpGained,
    passed: input.passed,
  })

  return {
    xpGained: meta.xpGained,
    streak: meta.streak,
    streakExtended: meta.streakExtended,
    milestones: [...meta.milestones, ...practiceMilestones],
  }
}
