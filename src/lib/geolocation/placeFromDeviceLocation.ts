import type { SavedPlaceItem } from '@/mocks/personalLibrarySeed'

export type ReverseGeocodePlaceResult = {
  label: string
  suggestedKind: SavedPlaceItem['kind']
  displayName: string | null
}

function getCurrentPositionCoords(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported in this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      },
      (err) => {
        reject(new Error(err.message || 'Could not read your location.'))
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 20_000 },
    )
  })
}

/**
 * Browser location → Next reverse-geocode proxy → human label + category hint for Quick Capture.
 */
export async function fetchPlaceFromDeviceLocation(): Promise<ReverseGeocodePlaceResult> {
  const { lat, lon } = await getCurrentPositionCoords()
  const res = await fetch(`/api/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  const rawText = await res.text()
  let json: unknown = null
  try {
    json = rawText ? JSON.parse(rawText) : null
  } catch {
    json = null
  }
  if (!res.ok) {
    const err = json && typeof json === 'object' && json && 'error' in json ? String((json as { error: unknown }).error) : res.statusText
    throw new Error(err || 'Reverse geocoding failed')
  }
  const o = json as Record<string, unknown>
  const label = typeof o.label === 'string' ? o.label.trim() : ''
  const sk = o.suggestedKind
  const allowed: SavedPlaceItem['kind'][] = [
    'supermarket',
    'train_station',
    'doctor',
    'gemeente',
    'school',
    'work',
    'cafe',
    'housing',
    'other',
  ]
  const suggestedKind = allowed.includes(sk as SavedPlaceItem['kind']) ? (sk as SavedPlaceItem['kind']) : 'other'
  const displayName = typeof o.displayName === 'string' ? o.displayName : null
  if (!label) throw new Error('No place name returned')
  return { label, suggestedKind, displayName }
}
