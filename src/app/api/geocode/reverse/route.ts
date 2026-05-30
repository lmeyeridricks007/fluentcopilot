import { NextRequest, NextResponse } from 'next/server'
import {
  buildPlaceLabelFromNominatim,
  inferPlaceKindFromNominatim,
  type NominatimReverseJson,
} from '@/lib/geolocation/nominatimReverse'

/** Identify this app to OSM Nominatim (required by usage policy). */
const NOMINATIM_USER_AGENT = 'FluentCopilot-language-tutor/1.0 (quick-capture place lookup)'

export async function GET(req: NextRequest) {
  const lat = Number.parseFloat(req.nextUrl.searchParams.get('lat') ?? '')
  const lon = Number.parseFloat(req.nextUrl.searchParams.get('lon') ?? '')
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: 'invalid_coordinates' }, { status: 400 })
  }

  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))
  url.searchParams.set('format', 'json')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('zoom', '18')

  let upstream: Response
  try {
    upstream = await fetch(url.toString(), {
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        'Accept-Language': 'en,nl;q=0.9',
      },
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: 'geocode_network' }, { status: 502 })
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: 'geocode_upstream', status: upstream.status }, { status: 502 })
  }

  let data: NominatimReverseJson
  try {
    data = (await upstream.json()) as NominatimReverseJson
  } catch {
    return NextResponse.json({ error: 'geocode_bad_json' }, { status: 502 })
  }

  if ((data as { error?: string }).error) {
    return NextResponse.json({ error: 'geocode_not_found' }, { status: 404 })
  }

  const label = buildPlaceLabelFromNominatim(data)
  const suggestedKind = inferPlaceKindFromNominatim(data)

  return NextResponse.json({
    label,
    suggestedKind,
    displayName: data.display_name ?? null,
  })
}
