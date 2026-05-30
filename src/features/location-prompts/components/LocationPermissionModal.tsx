/**
 * FD-08 — modal for permission education (why we need location).
 */

import { useEffect } from 'react'
import { MapPin, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface LocationPermissionModalProps {
  open: boolean
  onClose: () => void
  onContinue: () => void
  onNotNow?: () => void
}

export function LocationPermissionModal({
  open,
  onClose,
  onContinue,
  onNotNow,
}: LocationPermissionModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
    >
      <div className="bg-surface-elevated rounded-t-2xl sm:rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-4 flex items-center justify-between border-b border-slate-200">
          <h2 id="location-modal-title" className="text-body-lg font-semibold text-ink-primary">
            Smart Prompts use location
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
            <MapPin className="w-6 h-6" aria-hidden />
          </div>
          <p className="text-body text-ink-primary">
            When you’re near a café, train station, or supermarket, we can show you useful Dutch phrases for that situation.
          </p>
          <ul className="text-body-sm text-ink-secondary space-y-2 list-disc list-inside">
            <li>Location is only used when you have the app open (if you choose).</li>
            <li>We don’t track or store your location history.</li>
            <li>You can turn Smart Prompts off anytime in settings.</li>
          </ul>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={onContinue} fullWidth>
              Continue and enable location
            </Button>
            {onNotNow && (
              <Button variant="ghost" onClick={onNotNow}>
                Not now
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
