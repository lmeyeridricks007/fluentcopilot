/**
 * Shared score helpers for post-session Speak Live evaluation
 * (Azure-backed turn metrics + OpenAI coach merge).
 */
import type { AudioScores, CombinedScores, LanguageScores } from './liveVoiceEvaluationTypes'

export function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function scoreBand(n: number): 'solid' | 'shaky' | 'needs work' {
  if (n >= 72) return 'solid'
  if (n >= 52) return 'shaky'
  return 'needs work'
}

export function computeCombinedScores(audio: AudioScores, lang: LanguageScores, hasAudio: boolean): CombinedScores {
  const langAvg = (lang.naturalness + lang.contextualFit + lang.registerFit + lang.grammaticalStability) / 4
  if (!hasAudio) {
    return {
      overallTurnScore: clamp100(langAvg),
      clarityScore: clamp100((lang.naturalness + lang.grammaticalStability) / 2),
      dutchLikenessScore: clamp100((lang.naturalness + lang.contextualFit + lang.registerFit) / 3),
    }
  }
  const audioAvg = (audio.pronunciation + audio.fluency + audio.rhythm + audio.completeness) / 4
  const wAudio = 0.48
  const overallTurnScore = clamp100(audioAvg * wAudio + langAvg * (1 - wAudio))
  const clarityScore = clamp100((audio.pronunciation + audio.fluency + lang.grammaticalStability) / 3)
  const dutchLikenessScore = clamp100(
    (lang.naturalness + lang.contextualFit + lang.registerFit * 0.9 + audio.pronunciation * 0.35) / 3.25
  )
  return { overallTurnScore, clarityScore, dutchLikenessScore }
}

export function defaultLanguageScores(): LanguageScores {
  return {
    naturalness: 58,
    contextualFit: 56,
    registerFit: 58,
    grammaticalStability: 58,
  }
}
