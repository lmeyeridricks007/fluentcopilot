/**
 * Device-only preferences (sound, future: haptic master switch).
 * Stored in localStorage — not synced; survives normal use until cleared.
 */

const STORAGE_KEY = 'fc.devicePrefs.v1'

export type DevicePrefsV1 = {
  /**
   * Subtle UI sounds: taps, nav, practice send, light rewards.
   * Off by default. Stored key remains compatible with older `tapSoundsEnabled` in JSON.
   */
  subtleSoundsEnabled: boolean
  /** @deprecated use subtleSoundsEnabled — migrated in loadDevicePrefs */
  tapSoundsEnabled?: boolean
  /** When true, calmer motion (sets `data-fc-motion` + skips heavy transitions). */
  motionCalm?: boolean
}

const DEFAULTS: DevicePrefsV1 = {
  subtleSoundsEnabled: false,
  motionCalm: false,
}

export const DEVICE_PREFS_CHANGED = 'fc-device-prefs-changed'

export function loadDevicePrefs(): DevicePrefsV1 {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<DevicePrefsV1> & { tapSoundsEnabled?: boolean }
    const subtle =
      parsed.subtleSoundsEnabled ?? parsed.tapSoundsEnabled ?? DEFAULTS.subtleSoundsEnabled
    return {
      subtleSoundsEnabled: subtle,
      motionCalm: parsed.motionCalm === true,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveDevicePrefs(partial: Partial<DevicePrefsV1>): DevicePrefsV1 {
  if (typeof window === 'undefined') return { ...DEFAULTS, ...partial }
  const cur = loadDevicePrefs()
  const merged = { ...cur, ...partial }
  if (partial.tapSoundsEnabled != null && partial.subtleSoundsEnabled == null) {
    merged.subtleSoundsEnabled = partial.tapSoundsEnabled
  }
  const next: DevicePrefsV1 = {
    subtleSoundsEnabled: merged.subtleSoundsEnabled,
    motionCalm: merged.motionCalm === true,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(DEVICE_PREFS_CHANGED, { detail: next }))
  } catch {
    /* ignore quota / private mode */
  }
  return next
}
