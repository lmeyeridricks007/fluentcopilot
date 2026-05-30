import type { FeatureKey } from './featureKeys'

/** First matching Premium gate for a practice pathname, or null = unrestricted for Basic. */
export function getPracticeLockFeature(pathname: string): FeatureKey | null {
  if (pathname.startsWith('/app/practice/tracks')) return 'practice_skill_tracks'
  if (pathname.startsWith('/app/practice/simulation')) return 'practice_simulation'
  if (pathname === '/app/practice/voice' || pathname.startsWith('/app/practice/voice/')) {
    return 'practice_voice_tutor'
  }
  if (pathname.startsWith('/app/practice/pronunciation-feedback')) return 'practice_pronunciation'
  if (pathname.startsWith('/app/practice/free/') || pathname.startsWith('/app/practice/semi/')) {
    return 'practice_open_conversation'
  }
  return null
}
