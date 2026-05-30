/** Mirrors backend `PronunciationFeedbackSchema` — spoken Dutch coaching after STT. */
export type PronunciationFeedback = {
  pronunciationScore: number
  fluencyScore: number
  clarityScore: number
  overallTone: 'sounds_good' | 'improve'
  shortSummary: string
  keyIssues: string[]
  suggestedCorrection: string
  exampleBetterSentence: string
  highlightWords: string[]
  encouragement: string
}
