import type { ApiSavedTrainingItem } from '@/lib/api/apiTypes'
import { APP_COACH_HUB } from '@/lib/routing/appRoutes'

const APP_VOICE = '/app/practice/voice'
const APP_READ_ALOUD = '/app/practice/reading-aloud'

/**
 * Deep-link into practice surfaces from a persisted training item.
 * Query params are best-effort until each practice page reads them explicitly.
 */
export function practiceHrefForSavedItem(item: ApiSavedTrainingItem): string {
  const primary =
    item.improvedSentence?.trim() ||
    item.learnerOriginalSentence?.trim() ||
    item.title.trim() ||
    item.content.split('\n---\n')[0]?.trim() ||
    ''
  const q = new URLSearchParams()
  q.set('fromSaved', '1')
  q.set('savedId', item.id)
  if (primary) q.set('practiceText', primary.slice(0, 900))

  const focus =
    item.tagCategory === 'pronunciation_drill' || item.itemType === 'pronunciation_drill'
      ? 'pronunciation'
      : item.tagCategory === 'rhythm_drill' || item.itemType === 'rhythm_drill'
        ? 'rhythm'
        : item.tagCategory === 'phrasing_upgrade' ||
            item.itemType === 'natural_phrasing_drill' ||
            item.itemType === 'phrasing_drill'
          ? 'phrasing'
          : item.tagCategory === 'speaking_drill' || item.itemType === 'speaking_drill'
            ? 'speaking'
            : 'general'
  q.set('trainingFocus', focus)

  if (item.tagCategory === 'coach_follow_up' || item.itemType === 'coach_followup') {
    q.set('savedTraining', item.id)
    return `${APP_COACH_HUB}?${q.toString()}`
  }

  if (
    item.suggestedTrainingMode === 'read_aloud' ||
    item.tagCategory === 'phrasing_upgrade' ||
    item.itemType === 'natural_phrasing_drill'
  ) {
    return `${APP_READ_ALOUD}?${q.toString()}`
  }

  return `${APP_VOICE}?${q.toString()}`
}

export function reviewQueueHref(): string {
  return '/app/review?source=saved_training'
}
