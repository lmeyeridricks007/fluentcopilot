import { loadDevicePrefs } from '@/lib/device/devicePrefs'

/**
 * True when we should minimize motion and (usually) UI sounds.
 * System `prefers-reduced-motion` OR user "Calmer motion" in device prefs.
 */
export function prefersReducedInteraction(): boolean {
  if (typeof window === 'undefined') return true
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined' && document.documentElement.dataset.fcMotion === 'reduced') {
    return true
  }
  const prefs = loadDevicePrefs()
  if (prefs.motionCalm === true) return true
  return false
}

export function scenarioConversationDelaysMs(): { sendMs: number; partnerRevealMs: number } {
  if (prefersReducedInteraction()) {
    return { sendMs: 90, partnerRevealMs: 120 }
  }
  return { sendMs: 200, partnerRevealMs: 480 }
}
