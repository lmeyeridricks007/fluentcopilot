/**
 * Maps low/mid dimension scores to concrete, actionable coaching drills.
 * Every drill has a specific target (word, phrase, pattern) — no generic "practice more".
 */

import type {
  ScoreDimension,
  RecommendedDrill,
} from '../../domain/speaking-assessment/speechScoringModel'
import type { TurnScoringInput } from './speechScoringEngine'

export function mapDrillsForDimension(
  dimension: ScoreDimension,
  input: TurnScoringInput,
): RecommendedDrill[] {
  switch (dimension.id) {
    case 'pronunciation': return pronunciationDrills(dimension, input)
    case 'fluency': return fluencyDrills(dimension, input)
    case 'rhythm': return rhythmDrills(dimension, input)
    case 'wording': return wordingDrills(dimension, input)
    case 'grammar': return grammarDrills(dimension, input)
    case 'scenarioFit': return scenarioFitDrills(dimension, input)
  }
}

function priority(score: number | null): 'high' | 'medium' | 'low' {
  if (score == null) return 'low'
  if (score < 50) return 'high'
  if (score < 70) return 'medium'
  return 'low'
}

function pronunciationDrills(dim: ScoreDimension, input: TurnScoringInput): RecommendedDrill[] {
  const drills: RecommendedDrill[] = []
  const weakWords = input.words.filter((w) => w.accuracyScore < 72 && w.word.trim().length > 0)

  for (const w of weakWords.slice(0, 3)) {
    drills.push({
      dimension: 'pronunciation',
      type: 'isolated_word',
      title: `Drill: "${w.word.trim()}"`,
      detail: `Score ${Math.round(w.accuracyScore)} — isolate it, listen to reference, then say it slowly 3 times.${w.errorType ? ` (${w.errorType})` : ''}`,
      targetText: w.word.trim(),
      referenceAudioUrl: input.referenceAudioUrl,
      priority: priority(w.accuracyScore),
    })
  }

  if (weakWords.length === 0 && dim.score != null && dim.score < 75) {
    drills.push({
      dimension: 'pronunciation',
      type: 'echo_loop',
      title: 'Echo the full sentence',
      detail: 'Play the reference, then repeat the whole line at the same pace — focus on vowel length.',
      targetText: input.transcript.slice(0, 120),
      referenceAudioUrl: input.referenceAudioUrl,
      priority: priority(dim.score),
    })
  }

  return drills
}

function fluencyDrills(dim: ScoreDimension, input: TurnScoringInput): RecommendedDrill[] {
  const drills: RecommendedDrill[] = []
  const transcript = input.transcript.trim()

  if (input.timing && input.timing.hesitationMoments.length > 0) {
    const words = transcript.split(/\s+/)
    const mid = Math.floor(words.length / 2)
    const chunk1 = words.slice(0, mid).join(' ')
    const chunk2 = words.slice(mid).join(' ')
    drills.push({
      dimension: 'fluency',
      type: 'chunk_practice',
      title: 'Two-chunk practice',
      detail: `Split: "${chunk1}" then "${chunk2}". Say each chunk smoothly, then connect them.`,
      targetText: transcript.slice(0, 120),
      referenceAudioUrl: input.referenceAudioUrl,
      priority: priority(dim.score),
    })
  }

  if (input.timing?.rushedEnding) {
    drills.push({
      dimension: 'fluency',
      type: 'slow_replay',
      title: 'Slow the ending',
      detail: 'Replay the reference audio — notice how the last 2 words get the same time as the first 2.',
      targetText: transcript.slice(0, 120),
      referenceAudioUrl: input.referenceAudioUrl,
      priority: 'medium',
    })
  }

  if (drills.length === 0 && dim.score != null && dim.score < 75) {
    drills.push({
      dimension: 'fluency',
      type: 'phrase_shadow',
      title: 'Shadow the reference',
      detail: 'Play the reference line and speak along in real-time — match the pace and pauses.',
      targetText: transcript.slice(0, 120),
      referenceAudioUrl: input.referenceAudioUrl,
      priority: priority(dim.score),
    })
  }

  return drills
}

function rhythmDrills(dim: ScoreDimension, input: TurnScoringInput): RecommendedDrill[] {
  const drills: RecommendedDrill[] = []

  if (input.timing?.paceProfile === 'uneven') {
    drills.push({
      dimension: 'rhythm',
      type: 'chunk_practice',
      title: 'Even-pace chunks',
      detail: 'Break the sentence at natural boundaries and practice each chunk at the same speed before connecting.',
      targetText: input.transcript.slice(0, 120),
      referenceAudioUrl: input.referenceAudioUrl,
      priority: priority(dim.score),
    })
  }

  if (dim.score != null && dim.score < 60) {
    drills.push({
      dimension: 'rhythm',
      type: 'echo_loop',
      title: 'Rhythm echo loop',
      detail: 'Listen → repeat → listen → repeat. Focus on matching the timing pattern, not perfect words.',
      targetText: input.transcript.slice(0, 120),
      referenceAudioUrl: input.referenceAudioUrl,
      priority: 'high',
    })
  }

  return drills
}

function wordingDrills(dim: ScoreDimension, input: TurnScoringInput): RecommendedDrill[] {
  const drills: RecommendedDrill[] = []

  if (input.improvedVersion && input.improvedVersion.trim() !== input.transcript.trim()) {
    drills.push({
      dimension: 'wording',
      type: 'phrase_shadow',
      title: 'Native phrasing practice',
      detail: `You said: "${input.transcript.slice(0, 80)}"\nMore natural: "${input.improvedVersion.slice(0, 80)}"`,
      targetText: input.improvedVersion.slice(0, 200),
      referenceAudioUrl: input.referenceAudioUrl,
      priority: priority(dim.score),
    })
  }

  return drills
}

function grammarDrills(dim: ScoreDimension, input: TurnScoringInput): RecommendedDrill[] {
  const drills: RecommendedDrill[] = []

  for (const issue of input.grammarIssues.slice(0, 2)) {
    drills.push({
      dimension: 'grammar',
      type: 'grammar_drill',
      title: `Fix: ${issue.slice(0, 60)}`,
      detail: `Practice the corrected version and note the pattern for next time.`,
      targetText: input.improvedVersion?.slice(0, 200) ?? input.transcript.slice(0, 200),
      priority: priority(dim.score),
    })
  }

  return drills
}

function scenarioFitDrills(dim: ScoreDimension, input: TurnScoringInput): RecommendedDrill[] {
  if (dim.score != null && dim.score >= 60) return []

  return [{
    dimension: 'scenarioFit',
    type: 'scenario_retry',
    title: 'Retry this scenario step',
    detail: input.scenarioGoalSummary || 'Re-read the scenario goal and try a line that directly completes the task.',
    targetText: input.transcript.slice(0, 200),
    priority: priority(dim.score),
  }]
}
