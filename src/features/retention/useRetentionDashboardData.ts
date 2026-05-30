'use client'

import { useEffect, useState } from 'react'
import { aggregateWeakAreas } from '@/lib/mistakes/mistakeTagger'
import { localReviewPersistence } from '@/lib/review-engine/reviewPersistence'
import {
  estimateReviewMinutes,
  getReviewDueRowCount,
} from '@/lib/retention/reviewDueSummary'
import { getRetentionUserId } from '@/lib/retention/retentionService'

function humanizeWeakTag(tag: string): string {
  const t = tag.toLowerCase().replace(/_/g, ' ')
  if (t === 'word order' || t === 'word-order') return 'Word order'
  if (t === 'grammar') return 'Grammar patterns'
  if (t === 'order') return 'Sentence structure'
  if (t === 'vocab') return 'Vocabulary choice'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function useRetentionDashboardData(refreshKey: number) {
  const [dailyDueCount, setDailyDueCount] = useState(0)
  const [mistakeSessionCount, setMistakeSessionCount] = useState(0)
  const [fixHint, setFixHint] = useState<string | null>(null)
  const [weakAreaCount, setWeakAreaCount] = useState(0)

  useEffect(() => {
    const uid = getRetentionUserId()
    void (async () => {
      const due = await getReviewDueRowCount({ userId: uid, mode: 'daily', targetSize: 24 })
      const fixRows = await getReviewDueRowCount({ userId: uid, mode: 'mistake_fix', targetSize: 12 })
      setDailyDueCount(due)
      setMistakeSessionCount(fixRows)
      const events = await localReviewPersistence.loadMistakeEvents(uid)
      const w = aggregateWeakAreas(events)
      const top = [...w.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
      setWeakAreaCount(top.length)
      if (top.length > 0) {
        setFixHint(`${humanizeWeakTag(top[0]![0])} could use a quick pass`)
      } else {
        setFixHint(null)
      }
    })()
  }, [refreshKey])

  return {
    dailyDueCount,
    dailyEstMinutes: estimateReviewMinutes(dailyDueCount),
    mistakeSessionCount,
    fixHint,
    weakAreaCount,
    /** True when mistake events exist — use to avoid nudging “fix” without real error signal */
    hasMistakeEvidence: weakAreaCount > 0,
  }
}

