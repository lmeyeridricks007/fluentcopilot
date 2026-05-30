/**
 * FD-09 — activity timeline / list for the day.
 */

import { DailyLessonActivityItem } from './DailyLessonActivityItem'
import type { DailyActivityEvent } from '../types'

interface DailyLessonActivityTimelineProps {
  events: DailyActivityEvent[]
  onRemove?: (eventId: string) => void
  emptyMessage?: string
}

export function DailyLessonActivityTimeline({
  events,
  onRemove,
  emptyMessage = 'No activities captured yet.',
}: DailyLessonActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-body-sm text-ink-secondary py-4 text-center">{emptyMessage}</p>
    )
  }
  return (
    <ul className="list-none p-0 m-0" aria-label="Today's activities">
      {events.map((event) => (
        <li key={event.eventId}>
          <DailyLessonActivityItem event={event} onRemove={onRemove} />
        </li>
      ))}
    </ul>
  )
}
