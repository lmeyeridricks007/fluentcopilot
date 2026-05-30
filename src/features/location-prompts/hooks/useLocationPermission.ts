/**
 * FD-08 — location permission hook (browser + mock for demo).
 */

import { useState, useEffect, useCallback } from 'react'
import type { LocationPermissionStatus } from '../types'
import { locationPermissionService } from '../services/mockServices'

export function useLocationPermission() {
  const [status, setStatus] = useState<LocationPermissionStatus>('prompt')
  const [checking, setChecking] = useState(true)

  const check = useCallback(async () => {
    const s = await locationPermissionService.getStatus()
    setStatus(s)
    setChecking(false)
  }, [])

  useEffect(() => {
    check()
  }, [check])

  const request = useCallback(async () => {
    const granted = await locationPermissionService.requestPermission()
    setStatus(granted ? 'granted' : 'denied')
    return granted
  }, [])

  return { status, checking, request, recheck: check }
}
