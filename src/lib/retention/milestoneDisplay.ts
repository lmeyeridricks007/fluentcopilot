import type { MilestoneHit } from '@/lib/retention/types'

/**
 * Pick the single milestone to show after a session — prioritises outcome over routine.
 */
export function pickPrimaryMilestone(
  milestones: MilestoneHit[] | undefined | null
): MilestoneHit | undefined {
  if (!milestones?.length) return undefined
  const weight = (m: MilestoneHit): number => {
    if (m.id.startsWith('ability_')) return 100
    if (m.id.startsWith('module_complete_')) return 95
    if (m.id.startsWith('streak_')) return 85
    if (m.id === 'first_lesson') return 75
    if (m.id === 'first_daily_review' || m.id === 'first_mistake_fix') return 65
    if (m.id.startsWith('exam_readiness_ready_')) return 88
    if (m.id.startsWith('exam_pass_pe_')) return 82
    if (m.id.startsWith('exam_first_')) return 78
    if (m.id.startsWith('exam_habit_streak_')) return 70
    return 0
  }
  return [...milestones].sort((a, b) => weight(b) - weight(a))[0]
}
