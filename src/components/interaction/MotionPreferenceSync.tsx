'use client'

import { useEffect } from 'react'
import { DEVICE_PREFS_CHANGED, loadDevicePrefs } from '@/lib/device/devicePrefs'

/** Syncs `data-fc-motion` on `<html>` from device prefs (calmer motion). */
export function MotionPreferenceSync() {
  useEffect(() => {
    const apply = () => {
      const calm = loadDevicePrefs().motionCalm === true
      document.documentElement.dataset.fcMotion = calm ? 'reduced' : 'full'
    }
    apply()
    const on = () => apply()
    window.addEventListener(DEVICE_PREFS_CHANGED, on)
    return () => window.removeEventListener(DEVICE_PREFS_CHANGED, on)
  }, [])
  return null
}
