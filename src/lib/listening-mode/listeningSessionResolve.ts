import { clipsForPack, getListeningPack, LISTENING_CLIP_BANK } from '@/lib/listening-mode/catalog'
import type { ListeningClip } from '@/lib/listening-mode/schema'
import {
  LISTENING_PROFILE_DIMENSIONS,
  type ListeningProfileDimension,
} from '@/lib/listening-mode/listeningSkillModel'

export function pickWeakestDimension(
  weights: Partial<Record<ListeningProfileDimension, number>>
): ListeningProfileDimension | null {
  let best: ListeningProfileDimension | null = null
  let bestScore = -1
  for (const d of LISTENING_PROFILE_DIMENSIONS) {
    const w = weights[d] ?? 0
    if (w > bestScore) {
      bestScore = w
      best = d
    }
  }
  return bestScore > 0.35 ? best : null
}

export function pickWeakAreaClip(weakest: ListeningProfileDimension | null): ListeningClip {
  if (weakest === 'numbers_times' || weakest === 'detail_accuracy') {
    return LISTENING_CLIP_BANK['weak-numbers-1']
  }
  return LISTENING_CLIP_BANK['weak-route-1']
}

/** Resolves pack clips + one personalized weak-area rep when profile shows a clear gap. */
export function resolveListeningSessionClips(
  packId: string,
  profileWeights: Partial<Record<ListeningProfileDimension, number>>
): ListeningClip[] {
  const pack = getListeningPack(packId)
  if (!pack) return []
  const base = clipsForPack(pack)
  const weakest = pickWeakestDimension(profileWeights)
  const weak = pickWeakAreaClip(weakest)
  const tagged: ListeningClip = {
    ...weak,
    id: `${weak.id}::${packId}`,
    instructionEn:
      weakest == null
        ? `${weak.instructionEn} (extra rep)`
        : `${weak.instructionEn} (tuned to your ${humanizeListeningProfileDimension(weakest)} focus)`,
  }
  return [...base, tagged]
}

/** English label for profile dimensions (UI + drill payloads). */
export function humanizeListeningProfileDimension(d: ListeningProfileDimension): string {
  const map: Partial<Record<ListeningProfileDimension, string>> = {
    numbers_times: 'times & numbers',
    route_place: 'route & place',
    detail_accuracy: 'details',
    gist: 'gist',
    fast_speech: 'fast speech',
    natural_reply: 'natural replies',
    response_readiness: 'response timing',
    replay_dependence: 'replay use',
    transcript_dependence: 'transcript use',
  }
  return map[d] ?? d
}
