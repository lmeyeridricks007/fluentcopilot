/**
 * FD-08 — state when geolocation unsupported (e.g. insecure context).
 */

import { MapPin } from 'lucide-react'

interface PromptUnsupportedStateProps {
  onOpenSettings?: () => void
}

export function PromptUnsupportedState({ onOpenSettings }: PromptUnsupportedStateProps) {
  return (
    <div className="py-8 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-muted text-ink-tertiary flex items-center justify-center mx-auto mb-4">
        <MapPin className="w-8 h-8" aria-hidden />
      </div>
      <h3 className="text-body-lg font-semibold text-ink-primary">Location not available</h3>
      <p className="text-body-sm text-ink-secondary mt-2 max-w-sm mx-auto">
        Location isn’t available in this browser or context. You can still use Smart Prompts with sample prompts in the feed.
      </p>
      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="mt-4 text-body-sm font-medium text-primary-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
        >
          Open settings
        </button>
      )}
    </div>
  )
}
