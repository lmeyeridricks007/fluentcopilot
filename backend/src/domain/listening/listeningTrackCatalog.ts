import type { ListeningClip } from './listeningClip'
import type { ListeningDrillType } from './listeningDrillType'
import type { ListeningTrack } from './listeningTrack'

const CLIPS: Record<string, ListeningClip> = {
  'cafe-gist-1': {
    id: 'cafe-gist-1',
    scenarioId: 'cafe',
    category: 'food',
    level: 'A2',
    drillType: 'gist',
    speakerProfile: { register: 'customer', speechRateHint: 0.9 },
    transcript: 'Goedemiddag. Twee koffie graag, en mag ik ook een stuk appeltaart?',
    normalizedTranscript: null,
    targetMeaning: 'Ordering drinks and a slice of pie politely.',
    keyDetails: ['twee koffie', 'appeltaart'],
    responseExpectation: null,
    audioUrl: null,
    metadata: { optionLabels: ['Ordering food and drink', 'Complaining', 'Directions', 'Large group booking'] },
  },
  'cafe-detail-1': {
    id: 'cafe-detail-1',
    scenarioId: 'cafe',
    category: 'food',
    level: 'A2',
    drillType: 'detail',
    speakerProfile: { speechRateHint: 0.9 },
    transcript: 'Twee koffie, alstublieft. Zwart, zonder suiker.',
    normalizedTranscript: null,
    targetMeaning: 'Two black coffees without sugar.',
    keyDetails: ['quantity:2', 'black', 'no sugar'],
    responseExpectation: null,
    audioUrl: null,
    metadata: { optionLabels: ['One', 'Two', 'Three', 'Four'] },
  },
  'train-gist-1': {
    id: 'train-gist-1',
    scenarioId: 'train',
    category: 'travel',
    level: 'A2',
    drillType: 'gist',
    speakerProfile: { register: 'announcement', speechRateHint: 0.88 },
    transcript:
      'Goede reizigers, intercity naar Utrecht vertrekt van spoor zeven. Er is een vertraging van vijf minuten.',
    normalizedTranscript: null,
    targetMeaning: 'Train to Utrecht from platform seven with a short delay.',
    keyDetails: ['Utrecht', 'spoor zeven', '5 minuten vertraging'],
    responseExpectation: null,
    audioUrl: null,
    metadata: { optionLabels: ['Delay + platform', 'Café menu', 'Doctor visit', 'Package pickup'] },
  },
  'train-detail-1': {
    id: 'train-detail-1',
    scenarioId: 'train',
    category: 'travel',
    level: 'A2',
    drillType: 'detail',
    speakerProfile: { speechRateHint: 0.88 },
    transcript: 'De sprinter naar Haarlem vertrekt van spoor vier, over ongeveer drie minuten.',
    normalizedTranscript: null,
    targetMeaning: 'Sprinter to Haarlem leaves from platform four in about three minutes.',
    keyDetails: ['platform:4', 'Haarlem', '~3 min'],
    responseExpectation: null,
    audioUrl: null,
    metadata: { optionLabels: ['Spoor twee', 'Spoor drie', 'Spoor vier', 'Spoor vijf'] },
  },
  'weak-route-1': {
    id: 'weak-route-1',
    scenarioId: 'directions_getting_somewhere',
    category: 'travel',
    level: 'A2',
    drillType: 'personalized_focus',
    speakerProfile: { speechRateHint: 0.9 },
    transcript: 'Ga hier links de eerste straat in, dan ziet u de brug al.',
    normalizedTranscript: null,
    targetMeaning: 'Turn left into the first street, then you will see the bridge.',
    keyDetails: ['links', 'eerste straat', 'brug'],
    responseExpectation: 'Short confirmation or repeat request.',
    audioUrl: null,
    metadata: { optionLabels: ['Turn left first street', 'Turn right at lights', 'Straight 2 km', 'Second exit'] },
  },
}

const TRACKS: ListeningTrack[] = [
  {
    id: 'pack-cafe-burst',
    title: 'Café — catch the order',
    subtitle: 'Gist + a sharp number detail.',
    scenarioId: 'cafe',
    defaultLevel: 'A2',
    clipIds: ['cafe-gist-1', 'cafe-detail-1', 'weak-route-1'],
    category: 'food',
  },
  {
    id: 'pack-train-platform',
    title: 'Train & platform',
    subtitle: 'Announcement gist + platform detail.',
    scenarioId: 'train',
    defaultLevel: 'A2',
    clipIds: ['train-gist-1', 'train-detail-1'],
    category: 'travel',
  },
]

export function getListeningTracks(): ListeningTrack[] {
  return [...TRACKS]
}

export function getListeningTrackById(trackId: string): ListeningTrack | null {
  return TRACKS.find((t) => t.id === trackId) ?? null
}

export function getCatalogClipByKey(clipKey: string): ListeningClip | null {
  return CLIPS[clipKey] ?? null
}

export function getListeningClipsForTrack(params: {
  trackId: string
  level?: string | null
  scenarioKey?: string | null
  drillType?: ListeningDrillType | null
}): ListeningClip[] {
  const track = getListeningTrackById(params.trackId)
  if (!track) return []
  let clips = track.clipIds.map((k) => CLIPS[k]).filter(Boolean) as ListeningClip[]
  const scenarioFilter = params.scenarioKey?.trim()
  if (scenarioFilter) {
    clips = clips.filter((c) => c.scenarioId === scenarioFilter)
  }
  if (params.drillType) {
    clips = clips.filter((c) => c.drillType === params.drillType)
  }
  if (params.level?.trim()) {
    const lv = params.level.trim().toUpperCase()
    clips = clips.filter((c) => c.level === lv || c.drillType === 'personalized_focus')
  }
  return clips
}
