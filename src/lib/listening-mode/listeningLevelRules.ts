import type { ListeningLevel } from '@/lib/listening-mode/schema'

/** Adjust TTS rate; keeps clips feeling level-appropriate without re-authoring every line. */
export function effectiveSpeechRate(level: ListeningLevel, clipBaseRate: number): number {
  if (level === 'A1') return Math.min(clipBaseRate, 0.86)
  if (level === 'B1') return Math.max(clipBaseRate, 0.94)
  return clipBaseRate
}

export function levelCoachCopy(level: ListeningLevel): string {
  if (level === 'A1') return 'A1 — shorter lines, steady pace, everyday words.'
  if (level === 'B1') return 'B1 — more implied context and quicker exchanges.'
  return 'A2 — practical Dutch you actually hear in shops, travel, and admin.'
}
