/**
 * FD-08 — list of phrase suggestions.
 */

import { PhraseSuggestionItem } from './PhraseSuggestionItem'
import type { PhraseSuggestion } from '../types'

interface PhraseSuggestionListProps {
  phrases: PhraseSuggestion[]
  showFormality?: boolean
  maxVisible?: number
}

export function PhraseSuggestionList({
  phrases,
  showFormality = false,
  maxVisible,
}: PhraseSuggestionListProps) {
  const list = maxVisible ? phrases.slice(0, maxVisible) : phrases
  return (
    <ul className="list-none p-0 m-0 space-y-0" aria-label="Suggested phrases">
      {list.map((p, i) => (
        <li key={i}>
          <PhraseSuggestionItem phrase={p} showFormality={showFormality} />
        </li>
      ))}
    </ul>
  )
}
