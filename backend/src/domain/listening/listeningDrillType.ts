export const LISTENING_DRILL_TYPES = [
  'gist',
  'detail',
  'listen_respond',
  'instruction',
  'fast_speech',
  'replay_reveal',
  'personalized_focus',
] as const

export type ListeningDrillType = (typeof LISTENING_DRILL_TYPES)[number]

export function isListeningDrillType(v: string): v is ListeningDrillType {
  return (LISTENING_DRILL_TYPES as readonly string[]).includes(v)
}
