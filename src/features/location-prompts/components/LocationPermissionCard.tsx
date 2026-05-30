/**
 * FD-08 — card explaining location permission (inline).
 */

import { MapPin } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface LocationPermissionCardProps {
  onEnable: () => void
  onNotNow?: () => void
  compact?: boolean
}

export function LocationPermissionCard({ onEnable, onNotNow, compact }: LocationPermissionCardProps) {
  return (
    <Card variant="outlined" className="text-center">
      <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-3">
        <MapPin className="w-7 h-7" aria-hidden />
      </div>
      <CardTitle className="text-body-lg">Location for Smart Prompts</CardTitle>
      <CardDescription className="mt-2 text-left">
        We use your location only to suggest Dutch phrases for nearby places—cafés, stations, shops—so you can practice in context. We don’t store precise location history.
      </CardDescription>
      <div className={compact ? 'mt-4 flex gap-2' : 'mt-6 flex flex-col gap-2'}>
        <Button onClick={onEnable} fullWidth={!compact}>
          Enable location
        </Button>
        {onNotNow && (
          <Button variant="ghost" onClick={onNotNow}>
            Not now
          </Button>
        )}
      </div>
    </Card>
  )
}
