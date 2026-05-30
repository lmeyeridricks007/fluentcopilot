import { useState } from 'react'
import { SectionCard } from '../ui/SectionCard'
import { Button } from '@/components/ui/Button'

interface RegenerationRequestDialogProps {
  onConfirm: (intent: string, hint?: string) => void
  onCancel: () => void
}

export function RegenerationRequestDialog({ onConfirm, onCancel }: RegenerationRequestDialogProps) {
  const [intent, setIntent] = useState('')
  const [hint, setHint] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="regen-dialog-title">
      <SectionCard title="Send for regeneration" className="max-w-md w-full">
        <p id="regen-dialog-title" className="text-body-sm text-ink-secondary mb-4">Describe what should be regenerated.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-caption text-ink-tertiary mb-1">Intent / reason</label>
            <input
              type="text"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-body-sm bg-white"
              placeholder="e.g. Fix dialogue length, improve vocabulary"
            />
          </div>
          <div>
            <label className="block text-caption text-ink-tertiary mb-1">Hint (optional)</label>
            <textarea
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-body-sm bg-white"
              placeholder="Additional guidance for regeneration"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={() => intent && onConfirm(intent, hint || undefined)} disabled={!intent}>
            Send for regeneration
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}
