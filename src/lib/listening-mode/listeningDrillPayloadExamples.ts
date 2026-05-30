/**
 * Reference payloads for QA / fixtures — built from catalog clips + {@link buildListeningDrillPayload}.
 * Not imported in hot paths.
 */
import { LISTENING_CLIP_BANK } from '@/lib/listening-mode/catalog'
import type { ListeningLevel } from '@/lib/listening-mode/schema'
import { buildListeningDrillPayload } from '@/lib/listening-mode/listeningDrillPayloadBuilders'
import type { ListeningDrillPayload } from '@/lib/listening-mode/listeningDrillPayloadTypes'

const LEVELS = ['A1', 'A2', 'B1'] as const satisfies readonly ListeningLevel[]

function ex(clipId: string, level: ListeningLevel) {
  const clip = LISTENING_CLIP_BANK[clipId]
  if (!clip) throw new Error(`Missing clip ${clipId}`)
  return buildListeningDrillPayload(clip, level, {
    packId: 'pack-cafe-burst',
    profile: null,
  })
}

/** One example payload per product drill kind (session level A2). */
export const LISTENING_DRILL_PAYLOAD_EXAMPLES_A2: Record<
  ListeningDrillPayload['kind'],
  ListeningDrillPayload
> = {
  gist: ex('cafe-gist-1', 'A2'),
  detail: ex('cafe-detail-1', 'A2'),
  listen_respond: ex('cafe-respond-1', 'A2'),
  instruction: ex('train-order-1', 'A2'),
  fast_speech: ex('super-fast-1', 'A2'),
  personalized_focus: ex('weak-route-1', 'A2'),
}

/** Same clips rebuilt across CEFR bands for UX tuning. */
export function allListeningDrillPayloadExamplesByLevel(): Record<ListeningLevel, ListeningDrillPayload[]> {
  const ids = ['cafe-gist-1', 'cafe-detail-1', 'cafe-respond-1', 'train-order-1', 'super-fast-1', 'weak-route-1'] as const
  return {
    A1: ids.map((id) => ex(id, 'A1')),
    A2: ids.map((id) => ex(id, 'A2')),
    B1: ids.map((id) => ex(id, 'B1')),
  }
}

export function listeningDrillExampleJsonByKind(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const level of LEVELS) {
    out[level] = {
      gist: ex('cafe-gist-1', level),
      detail: ex('cafe-detail-1', level),
      listen_respond: ex('cafe-respond-1', level),
      instruction: ex('train-order-1', level),
      fast_speech: ex('super-fast-1', level),
      personalized_focus: ex('weak-route-1', level),
    }
  }
  return out
}
