'use client'

import { useCallback, useEffect, useState } from 'react'
import { subscribeRetentionUpdated } from '@/lib/retention/persistence'
import { getRetentionProfile, getRetentionUserId } from '@/lib/retention/retentionService'
import type { RetentionProfile } from '@/lib/retention/types'

export function useRetentionProfile() {
  const [profile, setProfile] = useState<RetentionProfile | null>(null)

  const refresh = useCallback(() => {
    setProfile(getRetentionProfile(getRetentionUserId()))
  }, [])

  useEffect(() => {
    refresh()
    return subscribeRetentionUpdated(refresh)
  }, [refresh])

  return {
    profile,
    refresh,
    userId: getRetentionUserId(),
    streak: profile?.streak.current ?? 0,
    totalXp: profile?.totalXp ?? 0,
    weeklyXp: profile?.leaderboard.weeklyXp ?? 0,
    abilities: profile?.abilities ?? [],
    completedLessonIds: profile?.completedLessonIds ?? [],
  }
}
