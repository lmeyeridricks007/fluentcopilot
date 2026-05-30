/**
 * FD-08 — prompt card for feed (compact).
 */

import { useRouter } from 'next/navigation'
import { MapPin, Bookmark, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { VenueTypeBadge } from './VenueTypeBadge'
import { PhraseSuggestionList } from './PhraseSuggestionList'
import type { LocationPrompt } from '../types'

interface LocationPromptCardProps {
  prompt: LocationPrompt
  onSave?: (promptId: string) => void
  onDismiss?: (promptId: string) => void
}

export function LocationPromptCard({ prompt, onSave, onDismiss }: LocationPromptCardProps) {
  const router = useRouter()

  return (
    <Card variant="outlined" padding="md" className="cursor-pointer hover:bg-surface-muted" onClick={() => router.push(`/app/context-prompts/${prompt.promptId}`)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <VenueTypeBadge venueType={prompt.venueType} />
            {prompt.cefrLevel && (
              <span className="text-caption text-ink-tertiary">{prompt.cefrLevel}</span>
            )}
            {prompt.isPremium && (
              <span className="text-caption font-medium text-primary-600">Premium</span>
            )}
          </div>
          <h3 className="text-body font-semibold text-ink-primary mt-1">{prompt.scenarioTitle}</h3>
          {prompt.distanceText && (
            <p className="text-caption text-ink-secondary flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5" aria-hidden />
              {prompt.distanceText}
            </p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
      </div>
      {prompt.phrases.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <PhraseSuggestionList phrases={prompt.phrases} maxVisible={2} />
        </div>
      )}
      <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
        {prompt.isSaved ? (
          <span className="text-body-sm text-primary-600 flex items-center gap-1">
            <Bookmark className="w-4 h-4 fill-current" aria-hidden /> Saved
          </span>
        ) : (
          <button
            type="button"
            className="text-body-sm font-medium text-primary-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
            onClick={() => onSave?.(prompt.promptId)}
          >
            Save
          </button>
        )}
        <button
          type="button"
          className="text-body-sm text-ink-secondary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
          onClick={() => onDismiss?.(prompt.promptId)}
        >
          Dismiss
        </button>
      </div>
    </Card>
  )
}
