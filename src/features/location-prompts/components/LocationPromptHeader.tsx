/**
 * FD-08 — venue/scenario header for detail view.
 */

import { MapPin } from 'lucide-react'
import { VenueTypeBadge } from './VenueTypeBadge'
import type { LocationPrompt } from '../types'

interface LocationPromptHeaderProps {
  prompt: LocationPrompt
}

export function LocationPromptHeader({ prompt }: LocationPromptHeaderProps) {
  return (
    <header className="pb-4 border-b border-slate-200">
      <div className="flex items-center gap-2 flex-wrap">
        <VenueTypeBadge venueType={prompt.venueType} />
        {prompt.cefrLevel && (
          <span className="text-caption text-ink-tertiary">{prompt.cefrLevel}</span>
        )}
        {prompt.isPremium && (
          <span className="text-caption font-medium text-primary-600">Premium</span>
        )}
      </div>
      <h1 className="text-title font-bold text-ink-primary mt-2">{prompt.scenarioTitle}</h1>
      {prompt.distanceText && (
        <p className="text-body-sm text-ink-secondary flex items-center gap-1 mt-1">
          <MapPin className="w-4 h-4" aria-hidden />
          {prompt.distanceText}
        </p>
      )}
    </header>
  )
}
