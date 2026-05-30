/**
 * FD-09 — confirm delete history dialog.
 */

import { Button } from '@/components/ui/Button'

interface DeleteHistoryDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteHistoryDialog({ open, onConfirm, onCancel }: DeleteHistoryDialogProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-history-title"
    >
      <div className="bg-surface-elevated rounded-t-2xl sm:rounded-2xl max-w-md w-full p-4 shadow-xl">
        <h2 id="delete-history-title" className="text-body-lg font-semibold text-ink-primary">
          Delete lesson history?
        </h2>
        <p className="text-body-sm text-ink-secondary mt-2">
          This will remove all your generated daily lessons from history. This cannot be undone.
        </p>
        <div className="flex gap-2 mt-6">
          <Button variant="danger" onClick={onConfirm} className="flex-1">
            Delete
          </Button>
          <Button variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
