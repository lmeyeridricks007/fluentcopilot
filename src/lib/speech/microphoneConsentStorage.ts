'use client'

import { STORAGE_NS } from '@/lib/storage/storageKeys'

/** App-side record that the learner successfully granted mic access (browser still owns the real permission). */
export const MICROPHONE_CONSENT_STORAGE_KEY = `${STORAGE_NS}.microphone.consent` as const

/** How long we treat a prior successful mic grant as "returning user" UX (browser may persist longer). */
export const MICROPHONE_CONSENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

type MicConsentRecord = {
  grantedAt: number
}

function readRecord(): MicConsentRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(MICROPHONE_CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MicConsentRecord
    if (typeof parsed?.grantedAt !== 'number' || !Number.isFinite(parsed.grantedAt)) return null
    return parsed
  } catch {
    return null
  }
}

export function isMicConsentFresh(now = Date.now()): boolean {
  const record = readRecord()
  if (!record) return false
  return now - record.grantedAt <= MICROPHONE_CONSENT_RETENTION_MS
}

export function recordMicConsentGranted(now = Date.now()): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      MICROPHONE_CONSENT_STORAGE_KEY,
      JSON.stringify({ grantedAt: now } satisfies MicConsentRecord),
    )
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearMicConsent(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(MICROPHONE_CONSENT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
