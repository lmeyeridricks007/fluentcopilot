/**
 * Helpers for OpenStreetMap Nominatim reverse responses (used server-side only).
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */

import type { SavedPlaceItem } from '@/mocks/personalLibrarySeed'

export type NominatimReverseJson = {
  display_name?: string
  class?: string
  type?: string
  address?: Record<string, string>
}

export function buildPlaceLabelFromNominatim(data: NominatimReverseJson): string {
  const addr = data.address ?? {}
  const roadLine = [addr.house_number, addr.road].filter(Boolean).join(' ').trim()
  const venue =
    (addr.amenity || addr.shop || addr.name || addr.building || addr.retail || addr.leisure || '').trim() || null
  const locality =
    (addr.city || addr.town || addr.village || addr.municipality || addr.city_district || addr.suburb || '').trim() ||
    null
  const parts = [venue, roadLine || (addr.road ?? '').trim() || null, locality].filter(Boolean) as string[]
  if (parts.length) return parts.join(' · ').slice(0, 220)
  const dn = (data.display_name ?? '').trim()
  if (dn) return dn.split(',').slice(0, 4).join(',').trim().slice(0, 220)
  return 'Unknown place'
}

export function inferPlaceKindFromNominatim(data: NominatimReverseJson): SavedPlaceItem['kind'] {
  const cls = (data.class ?? '').toLowerCase()
  const typ = (data.type ?? '').toLowerCase()
  const addr = data.address ?? {}
  const amenity = (addr.amenity ?? '').toLowerCase()
  const shop = (addr.shop ?? '').toLowerCase()
  const office = (addr.office ?? '').toLowerCase()

  if (cls === 'railway' && (typ === 'station' || typ === 'halt' || typ === 'tram_stop')) return 'train_station'
  if (cls === 'railway') return 'train_station'

  if (shop === 'supermarket' || shop === 'convenience' || shop === 'department_store' || shop === 'mall')
    return 'supermarket'
  if (amenity === 'supermarket' || amenity === 'marketplace') return 'supermarket'

  if (
    amenity === 'doctors' ||
    amenity === 'dentist' ||
    amenity === 'clinic' ||
    amenity === 'hospital' ||
    amenity === 'pharmacy' ||
    amenity === 'physiotherapist'
  )
    return 'doctor'

  if (
    amenity === 'townhall' ||
    amenity === 'courthouse' ||
    amenity === 'public_building' ||
    typ === 'administrative' ||
    (cls === 'office' && office === 'government')
  )
    return 'gemeente'

  if (amenity === 'cafe' || amenity === 'restaurant' || amenity === 'bar' || amenity === 'fast_food' || amenity === 'pub')
    return 'cafe'

  if (cls === 'office' || amenity === 'coworking' || office === 'company') return 'work'

  if (amenity === 'school' || amenity === 'university' || amenity === 'college' || amenity === 'kindergarten')
    return 'other'

  if (addr.building === 'residential' || addr.place === 'house' || typ === 'house' || typ === 'apartments')
    return 'housing'

  if (amenity === 'place_of_worship' || typ === 'place_of_worship') return 'other'

  return 'other'
}
