/**
 * FD-09 — generating lesson, waiting state.
 */

import { Loader2 } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'

interface GenerationProgressCardProps {
  eventCount?: number
}

export function GenerationProgressCard({ eventCount = 0 }: GenerationProgressCardProps) {
  return (
    <Card variant="outlined" padding="md" className="text-center">
      <div className="flex justify-center mb-3">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" aria-hidden />
      </div>
      <CardTitle className="text-body-lg">Creating your lesson</CardTitle>
      <CardDescription className="mt-2">
        We're turning your {eventCount} {eventCount === 1 ? 'activity' : 'activities'} into Dutch practice—phrases, vocabulary, and scenarios.
      </CardDescription>
      <p className="text-caption text-ink-tertiary mt-3">This usually takes a few seconds.</p>
    </Card>
  )
}
