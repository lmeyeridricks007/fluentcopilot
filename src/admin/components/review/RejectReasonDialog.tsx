import { useState } from 'react'
import { SectionCard } from '../ui/SectionCard'
import { Button } from '@/components/ui/Button'

const REJECT_REASONS = [
  'Quality',
  'Inaccuracy',
  'Inappropriate',
  'Off-topic',
  'Other',
]

interface RejectReasonDialogProps {
  onConfirm: (reason: string, note?: string) => void
  onCancel: () => void
}

export function RejectReasonDialog({ onConfirm, onCancel }: RejectReasonDialogProps) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-dialog-title">
      <SectionCard title="Reject artifact" className="max-w-md w-full">
        <p id="reject-dialog-title" className="text-body-sm text-ink-secondary mb-4">Choose a reason and optionally add a note.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-caption text-ink-tertiary mb-1">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-body-sm bg-white"
            >
              <option value="">Select…</option>
              {REJECT_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-caption text-ink-tertiary mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-body-sm bg-white"
              placeholder="Add context for the team…"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={() => reason && onConfirm(reason, note || undefined)} disabled={!reason}>
            Reject
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}
