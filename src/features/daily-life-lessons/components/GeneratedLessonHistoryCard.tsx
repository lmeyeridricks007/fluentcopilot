/**
 * FD-09 — history list item (previous lesson).
 */

import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { DailyLessonHistoryItem } from '../types'

interface GeneratedLessonHistoryCardProps {
  item: DailyLessonHistoryItem
  onClick: () => void
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export function GeneratedLessonHistoryCard({ item, onClick }: GeneratedLessonHistoryCardProps) {
  return (
    <Card
      variant="outlined"
      padding="sm"
      className="cursor-pointer hover:bg-surface-muted flex items-center gap-3"
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink-primary">{item.title}</p>
        <p className="text-caption text-ink-secondary">{formatDate(item.date)}</p>
        {item.scenariosIncluded.length > 0 && (
          <p className="text-caption text-ink-tertiary mt-0.5 truncate">
            {item.scenariosIncluded.join(' · ')}
          </p>
        )}
      </div>
      <span className="text-caption text-ink-tertiary capitalize">{item.completionStatus.replace('_', ' ')}</span>
      <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
    </Card>
  )
}
