/**
 * FD-09 — not enough activity to generate lesson.
 */

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface InsufficientActivityStateProps {
  onCapture: () => void
  minSuggested?: number
}

export function InsufficientActivityState({ onCapture }: InsufficientActivityStateProps) {
  return (
    <div className="py-8 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-muted text-ink-tertiary flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-8 h-8" aria-hidden />
      </div>
      <h3 className="text-body-lg font-semibold text-ink-primary">Not enough activity yet</h3>
      <p className="text-body-sm text-ink-secondary mt-2 max-w-sm mx-auto">
        Capture at least one moment from your day—a place you visited, a note, or a situation—so we can build your personalized lesson.
      </p>
      <Button className="mt-6" onClick={onCapture}>
        Capture a moment
      </Button>
    </div>
  )
}
