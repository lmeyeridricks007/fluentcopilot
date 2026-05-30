/**
 * FD-09 — generation failed, retry option.
 */

import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface GenerationFailedStateProps {
  error?: string
  onRetry: () => void
}

export function GenerationFailedState({ error, onRetry }: GenerationFailedStateProps) {
  return (
    <div className="py-6 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto mb-3">
        <AlertCircle className="w-7 h-7" aria-hidden />
      </div>
      <h3 className="text-body-lg font-semibold text-ink-primary">Lesson generation failed</h3>
      <p className="text-body-sm text-ink-secondary mt-2 max-w-sm mx-auto">
        {error ?? 'Something went wrong. Please try again.'}
      </p>
      <Button variant="secondary" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
