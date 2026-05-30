/**
 * FD-09 — single activity item in timeline.
 */

import { MapPin, Mic, Image as ImageIcon } from 'lucide-react'
import { ActivitySourceBadge } from './ActivitySourceBadge'
import { VENUE_DISPLAY_NAMES } from '../mocks/activities'
import type { DailyActivityEvent } from '../types'

interface DailyLessonActivityItemProps {
  event: DailyActivityEvent
  onRemove?: (eventId: string) => void
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function DailyLessonActivityItem({ event, onRemove }: DailyLessonActivityItemProps) {
  const venueLabel = event.venueType ? VENUE_DISPLAY_NAMES[event.venueType] ?? event.venueType : null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
        <MapPin className="w-4 h-4 text-primary-600" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-ink-primary text-body">{event.title}</span>
          <ActivitySourceBadge sourceType={event.sourceType} />
        </div>
        {venueLabel && (
          <p className="text-caption text-ink-secondary mt-0.5">{venueLabel}</p>
        )}
        {event.note && (
          <p className="text-body-sm text-ink-secondary mt-1">{event.note}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {event.hasPhoto && (
            <span className="inline-flex items-center gap-1 text-caption text-ink-tertiary">
              <ImageIcon className="w-3.5 h-3.5" aria-hidden /> Photo
            </span>
          )}
          {event.hasVoice && (
            <span className="inline-flex items-center gap-1 text-caption text-ink-tertiary">
              <Mic className="w-3.5 h-3.5" aria-hidden /> Voice
            </span>
          )}
          <span className="text-caption text-ink-tertiary">{formatTime(event.timestamp)}</span>
        </div>
      </div>
      {event.removable && onRemove && (
        <button
          type="button"
          onClick={() => onRemove(event.eventId)}
          className="text-caption text-ink-tertiary hover:text-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
          aria-label={`Remove ${event.title}`}
        >
          Remove
        </button>
      )}
    </div>
  )
}
