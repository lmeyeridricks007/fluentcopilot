import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { loadRetentionProfileSync, saveRetentionProfileSync } from '@/lib/retention/persistence'
import { appendXp } from '@/lib/retention/xp'
import type { RetentionProfile, XpReason } from '@/lib/retention/types'
import { isExamPrepMissionTemplateId } from '@/lib/missions/examPrepMissionHelpers'
import type { MissionSlot } from '@/lib/missions/types'

function mergeMetadata(p: RetentionProfile): RetentionProfile {
  return {
    ...p,
    metadata: {
      firstDailyReviewDone: false,
      firstMistakeFixDone: false,
      ...p.metadata,
    },
  }
}

function xpReasonForSlot(slot: MissionSlot): XpReason {
  if (slot === 'daily') return 'daily_mission_complete'
  if (slot === 'weekly') return 'weekly_mission_complete'
  return 'skill_mission_complete'
}

export function grantMissionRewardIfNeeded(input: {
  userId: string
  slot: MissionSlot
  templateId: string
  xpAmount: number
  alreadyGranted: boolean
}): { profile: RetentionProfile; granted: boolean; xp: number } {
  if (input.alreadyGranted || input.xpAmount <= 0) {
    const profile = mergeMetadata(loadRetentionProfileSync(input.userId))
    return { profile, granted: false, xp: 0 }
  }

  let profile = mergeMetadata(loadRetentionProfileSync(input.userId))
  const reason = xpReasonForSlot(input.slot)
  const next = appendXp({
    total: profile.totalXp,
    ledger: profile.ledger,
    weeklyXp: profile.leaderboard.weeklyXp,
    ledgerWeekKey: profile.leaderboard.weekKey,
    amount: input.xpAmount,
    reason,
    ref: input.templateId,
  })
  profile = {
    ...profile,
    totalXp: next.total,
    ledger: next.ledger,
    leaderboard: {
      weekKey: next.ledgerWeekKey,
      weeklyXp: next.weeklyXp,
    },
  }
  saveRetentionProfileSync(profile)

  track(ANALYTICS_EVENTS.xp_awarded, {
    amount: input.xpAmount,
    reason,
    missionSlot: input.slot,
    templateId: input.templateId,
  })
  track(ANALYTICS_EVENTS.mission_reward_claimed, {
    missionSlot: input.slot,
    templateId: input.templateId,
    xp: input.xpAmount,
  })
  if (isExamPrepMissionTemplateId(input.templateId)) {
    track(ANALYTICS_EVENTS.exam_mission_reward_granted, {
      missionSlot: input.slot,
      templateId: input.templateId,
      xp: input.xpAmount,
    })
  }
  if (input.slot === 'weekly') {
    track(ANALYTICS_EVENTS.weekly_mission_completed, { templateId: input.templateId })
  }
  if (input.slot === 'skill_focus') {
    track(ANALYTICS_EVENTS.skill_mission_completed, { templateId: input.templateId })
  }

  return { profile, granted: true, xp: input.xpAmount }
}
