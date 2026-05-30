/**
 * FD-08 — state when location permission denied.
 */

import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface PromptDeniedStateProps {
  onOpenSettings: () => void
  onRetry?: () => void
}

export function PromptDeniedState({ onOpenSettings, onRetry }: PromptDeniedStateProps) {
  return (
    <div className="py-8 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto mb-4">
        <MapPin className="w-8 h-8" aria-hidden />
      </div>
      <h3 className="text-body-lg font-semibold text-ink-primary">Location is off</h3>
      <p className="text-body-sm text-ink-secondary mt-2 max-w-sm mx-auto">
        Smart Prompts need location access to suggest phrases for nearby places. You can enable it in your device or browser settings.
      </p>
      <div className="mt-6 flex flex-col gap-2 max-w-xs mx-auto">
        <Button onClick={onOpenSettings}>
          Open Smart Prompts settings
        </Button>
        {onRetry && (
          <Button variant="ghost" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}
