/**
 * Haptics (wrapped app), opt-in tap micro-sound, and Home “today’s move” celebration handoff.
 * All calls no-op on server, without Capacitor, or when reduced-motion is set (sound/haptics).
 */

import { loadDevicePrefs } from '@/lib/device/devicePrefs'
import { playAppSound } from '@/lib/interaction/appSounds'
import { prefersReducedInteraction } from '@/lib/interaction/prefersReducedInteraction'

const HOME_PULSE_KEY = 'fc.home.todaysMovePulse.v1'
const PULSE_MAX_AGE_MS = 15 * 60 * 1000

type CapacitorHaptics = {
  impact: (opts: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }) => Promise<void>
  notification: (opts: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }) => Promise<void>
}

function getCapacitorHaptics(): CapacitorHaptics | null {
  if (typeof window === 'undefined') return null
  try {
    const cap = (window as Window & { Capacitor?: { Plugins?: { Haptics?: CapacitorHaptics } } })
      .Capacitor
    return cap?.Plugins?.Haptics ?? null
  } catch {
    return null
  }
}

/** Strong but short pattern for mission completion (native bridge or Vibration API). */
export function hapticPrimaryCompletion(): void {
  if (typeof window === 'undefined') return

  const h = getCapacitorHaptics()
  if (h) {
    void h
      .notification({ type: 'SUCCESS' })
      .catch(() => void h.impact({ style: 'MEDIUM' }).catch(() => {}))
    return
  }

  try {
    navigator.vibrate?.([10, 40, 15, 35, 12])
  } catch {
    /* ignore */
  }
}

/** Very short tick for primary taps when user opts in. */
export function playOptInTapSound(): void {
  playAppSound('tap')
}

/** Softer confirmation when daily mission completes (same opt-in as subtle sounds). */
function playOptInCompletionMicroChime(): void {
  if (typeof window === 'undefined' || prefersReducedInteraction()) return
  if (!loadDevicePrefs().subtleSoundsEnabled) return
  playAppSound('streak_extend')
}

/**
 * Call when the **daily** mission flips to completed (client only).
 * Queues Home success pulse for next visit; haptic now; optional chime if sounds on.
 */
export function onDailyMissionCompletedClient(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(HOME_PULSE_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
  hapticPrimaryCompletion()
  playOptInCompletionMicroChime()
}

/** Returns true once if user should show Home hero pulse (consumes flag). */
export function consumeTodaysMoveHomePulse(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = sessionStorage.getItem(HOME_PULSE_KEY)
    if (!raw) return false
    sessionStorage.removeItem(HOME_PULSE_KEY)
    const at = Number(raw)
    if (!Number.isFinite(at) || Date.now() - at > PULSE_MAX_AGE_MS) return false
    return true
  } catch {
    return false
  }
}
