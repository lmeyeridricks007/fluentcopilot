'use client'

import {
  countKmnActivities,
  getKmnTopicOrThrow,
  isKmnTopicId,
  listKmnTopics,
} from '@/lib/exam-prep/kmn/kmnContentBuilder'
import {
  getKmnMasteryLabel,
  getKmnProgressionLevel,
  masteryNl,
  progressionLabelNl,
  type KmnMasteryLabel,
} from '@/lib/exam-prep/kmn/kmnProgressService'
import type { KmnTopicId } from '@/lib/exam-prep/kmn/types'

export function useKmnHomeModel() {
  const topics = listKmnTopics()
  const topicRows = topics.map((t) => {
    const counts = countKmnActivities(t.id)
    const mastery = getKmnMasteryLabel(t.id)
    const level = getKmnProgressionLevel(t.id)
    return {
      topic: t,
      counts,
      mastery,
      masteryNl: masteryNl(mastery),
      level,
      progressionNl: progressionLabelNl(level),
    }
  })

  return { topicRows }
}

export function useKmnTopicModel(topicId: string) {
  const valid = isKmnTopicId(topicId)
  const topic = valid ? getKmnTopicOrThrow(topicId) : null
  const counts = valid ? countKmnActivities(topicId as KmnTopicId) : null
  const mastery: KmnMasteryLabel | null = valid ? getKmnMasteryLabel(topicId as KmnTopicId) : null
  const level = valid ? getKmnProgressionLevel(topicId as KmnTopicId) : null

  return {
    valid,
    topic,
    counts,
    mastery,
    masteryNl: mastery ? masteryNl(mastery) : '',
    level,
    progressionNl: level ? progressionLabelNl(level) : '',
  }
}
