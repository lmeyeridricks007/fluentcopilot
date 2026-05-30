'use client'

import type { PracticeDashboardSummary } from '../usePracticeDashboardSummary'
import type { PracticeHubViewModel } from '../types'
import { TalkLanding } from '@/components/talk/TalkLanding'

type Props = {
  vm: PracticeHubViewModel
  dash: PracticeDashboardSummary
  retentionStreak: number
  retentionCaption: string
  totalXp: number
  exploreHref: string
}

/** Talk > Now — streamlined landing (suggestion, momentum, continue, loops). */
export function PracticeDoPanel(props: Props) {
  return <TalkLanding {...props} />
}
