/**
 * FD-08 — empty state when no prompts.
 */

import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface PromptEmptyStateProps {
  onOpenSettings?: () => void
  onSimulate?: () => void
  showSimulate?: boolean
}

export function PromptEmptyState({ onOpenSettings, onSimulate, showSimulate }: PromptEmptyStateProps) {
  return (
    <div className="py-8 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-muted text-ink-tertiary flex items-center justify-center mx-auto mb-4">
        <MapPin className="w-8 h-8" aria-hidden />
      </div>
      <h3 className="text-body-lg font-semibold text-ink-primary">No prompts right now</h3>
      <p className="text-body-sm text-ink-secondary mt-2 max-w-sm mx-auto">
        When you’re near a café, station, or other place we support, you’ll see phrase suggestions here.
      </p>
      <div className="mt-6 flex flex-col gap-2 max-w-xs mx-auto">
        {onOpenSettings && (
          <Button variant="secondary" onClick={onOpenSettings}>
            Smart Prompts settings
          </Button>
        )}
        {showSimulate && onSimulate && (
          <Button variant="ghost" onClick={onSimulate}>
            Simulate nearby place (demo)
          </Button>
        )}
      </div>
    </div>
  )
}
