'use client'

import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

const STORAGE_KEY = 'fc_weak_area_shown_once_v1'
const MAX_IDS = 80

function loadIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function saveIds(ids: string[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(-MAX_IDS)))
  } catch {
    // ignore
  }
}

/**
 * Fires `weak_area_shown` once per `weak_area_id` per tab session so Improve top + slip rows + cards don’t multiply the same signal.
 */
export function trackWeakAreaShownOnce(
  payload: {
    weak_area_id: string
    weak_area_label?: string
    surface: string
    action_count?: number
  } & Record<string, unknown>
): void {
  if (typeof window === 'undefined') return
  const seen = new Set(loadIds())
  if (seen.has(payload.weak_area_id)) return
  seen.add(payload.weak_area_id)
  saveIds([...seen])
  track(ANALYTICS_EVENTS.weak_area_shown, payload)
}
