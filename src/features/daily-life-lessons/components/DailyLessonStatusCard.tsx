/**
 * FD-09 — today's status card (events count, can generate, lesson ready).
 */

import { Sparkles, BookOpen } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { DailyLessonSummary } from '../types'

interface DailyLessonStatusCardProps {
  summary: DailyLessonSummary
  onCapture: () => void
  onGenerate: () => void
  onOpenLesson: () => void
  isGenerating?: boolean
  premiumRequired?: boolean
  onUpgrade?: () => void
}

export function DailyLessonStatusCard({
  summary,
  onCapture,
  onGenerate,
  onOpenLesson,
  isGenerating,
  premiumRequired,
  onUpgrade,
}: DailyLessonStatusCardProps) {
  const hasLesson = summary.todayLesson != null
  const canGenerate = summary.canGenerate && !hasLesson && !isGenerating

  return (
    <Card variant="outlined" padding="md">
      <CardTitle className="text-body-lg flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary-600" aria-hidden />
        Today
      </CardTitle>
      <CardDescription className="mt-1">
        {summary.eventCount} {summary.eventCount === 1 ? 'activity' : 'activities'} captured
      </CardDescription>
      {hasLesson && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-primary-50 border border-primary-100">
          <BookOpen className="w-5 h-5 text-primary-600 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink-primary text-body-sm">Your lesson is ready</p>
            <p className="text-caption text-ink-secondary">Based on your day</p>
          </div>
          {premiumRequired && onUpgrade ? (
            <Button size="sm" onClick={onUpgrade}>Upgrade to open</Button>
          ) : (
            <Button size="sm" onClick={onOpenLesson}>Open lesson</Button>
          )}
        </div>
      )}
      {!hasLesson && (
        <div className="mt-4 flex flex-col gap-2">
          <Button variant="secondary" size="sm" onClick={onCapture} fullWidth>
            Capture a moment
          </Button>
          {canGenerate && (
            <Button
              size="sm"
              onClick={onGenerate}
              disabled={isGenerating}
              loading={isGenerating}
              fullWidth
            >
              {isGenerating ? 'Generating…' : 'Generate lesson'}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
