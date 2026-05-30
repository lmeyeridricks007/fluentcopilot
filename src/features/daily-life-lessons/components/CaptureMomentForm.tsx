/**
 * FD-09 — capture moment form (note, venue, optional photo/voice placeholders).
 */

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { VenueCategoryPicker } from './VenueCategoryPicker'
import type { CaptureMomentInput, VenueType } from '../types'

interface CaptureMomentFormProps {
  onSubmit: (input: CaptureMomentInput) => void
  onCancel: () => void
}

export function CaptureMomentForm({ onSubmit, onCancel }: CaptureMomentFormProps) {
  const [title, setTitle] = useState('')
  const [venueType, setVenueType] = useState<VenueType | undefined>()
  const [note, setNote] = useState('')
  const [hasPhoto, setHasPhoto] = useState(false)
  const [hasVoice, setHasVoice] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      venueType,
      note: note.trim() || undefined,
      hasPhoto,
      hasVoice,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="moment-title" className="block text-body-sm font-medium text-ink-primary mb-1">
          What happened?
        </label>
        <input
          id="moment-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Coffee stop, supermarket, doctor visit"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-surface-elevated text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        />
      </div>
      <VenueCategoryPicker value={venueType} onChange={setVenueType} />
      <div>
        <label htmlFor="moment-note" className="block text-body-sm font-medium text-ink-primary mb-1">
          Note (optional)
        </label>
        <textarea
          id="moment-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. I wanted to ask for oat milk but didn't know how"
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-surface-elevated text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasPhoto}
            onChange={(e) => setHasPhoto(e.target.checked)}
            className="rounded border-slate-300 text-primary-600"
          />
          <span className="text-body-sm text-ink-primary">I have a photo</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasVoice}
            onChange={(e) => setHasVoice(e.target.checked)}
            className="rounded border-slate-300 text-primary-600"
          />
          <span className="text-body-sm text-ink-primary">Voice note</span>
        </label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={!title.trim()}>
          Save moment
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
