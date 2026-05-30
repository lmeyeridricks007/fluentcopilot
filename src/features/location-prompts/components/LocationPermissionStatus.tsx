/**
 * FD-08 — permission status indicator (granted / denied / not set).
 */

import { MapPin, Check, X } from 'lucide-react'
import type { LocationPermissionStatus } from '../types'

interface LocationPermissionStatusProps {
  status: LocationPermissionStatus
  className?: string
}

export function LocationPermissionStatus({ status, className = '' }: LocationPermissionStatusProps) {
  if (status === 'granted') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-body-sm text-success-600 ${className}`}>
        <Check className="w-4 h-4" aria-hidden />
        Location enabled
      </span>
    )
  }
  if (status === 'denied') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-body-sm text-error ${className}`}>
        <X className="w-4 h-4" aria-hidden />
        Location denied
      </span>
    )
  }
  if (status === 'unsupported') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-body-sm text-ink-tertiary ${className}`}>
        <MapPin className="w-4 h-4" aria-hidden />
        Not available
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-body-sm text-ink-secondary ${className}`}>
      <MapPin className="w-4 h-4" aria-hidden />
      Not requested
    </span>
  )
}
