/**
 * FD-08 — single phrase suggestion (Dutch + translation).
 */

import type { PhraseSuggestion as PhraseType } from '../types'

interface PhraseSuggestionItemProps {
  phrase: PhraseType
  showFormality?: boolean
}

export function PhraseSuggestionItem({ phrase, showFormality }: PhraseSuggestionItemProps) {
  return (
    <div className="py-2 border-b border-slate-100 last:border-0">
      <p className="font-medium text-ink-primary text-body">{phrase.dutch}</p>
      <p className="text-body-sm text-ink-secondary mt-0.5">{phrase.translation}</p>
      {phrase.usageNote && (
        <p className="text-caption text-ink-tertiary mt-1">{phrase.usageNote}</p>
      )}
      {showFormality && phrase.formality && (
        <span className="inline-block mt-1 text-caption text-ink-tertiary">
          {phrase.formality}
        </span>
      )}
    </div>
  )
}
