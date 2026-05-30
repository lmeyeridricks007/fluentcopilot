type DifficultyBand = 'A2_low' | 'A2_mid' | 'A2_high'

const MAP: Record<DifficultyBand, string> = {
  A2_low: 'Gentle',
  A2_mid: 'Moderate',
  A2_high: 'Stretch',
}

export function exerciseDifficultyLabel(d: DifficultyBand): string {
  return MAP[d] ?? d
}
