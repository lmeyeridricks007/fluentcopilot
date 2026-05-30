import type { LiveTurnDeepEvaluation, TurnEvaluation } from './liveVoiceEvaluationTypes'

function isRhythmLine(s: string): boolean {
  const t = s.toLowerCase()
  return (
    t.includes('pause') ||
    t.includes('hesitat') ||
    t.includes('rhythm') ||
    t.includes('chunk') ||
    t.includes('compressed') ||
    t.includes('airtime')
  )
}

function isPronunciationLine(s: string): boolean {
  const t = s.toLowerCase()
  if (t.startsWith('recognition note')) return false
  return (
    t.includes('word “') ||
    t.includes('clarity') ||
    t.includes('articulation') ||
    t.includes('stress') ||
    t.includes('syllable')
  )
}

/**
 * Builds the premium per-turn object for the evaluation UI from the persisted turn row.
 */
export function buildLiveTurnDeepEvaluation(turn: TurnEvaluation): LiveTurnDeepEvaluation {
  const le = turn.languageEvaluation
  const hasAzureAudio = turn.signalSources.audioMetrics === 'azure_audio'
  const audioFindings = turn.audioFindings ?? []
  const pronunciationFeedback = hasAzureAudio
    ? audioFindings.filter((l) => isPronunciationLine(l) && !isRhythmLine(l))
    : []
  const rhythmFromAudio = hasAzureAudio ? audioFindings.filter((l) => isRhythmLine(l)) : []
  const rhythmFeedback = hasAzureAudio
    ? [...(turn.chunkingRhythmSuggestion?.trim() ? [turn.chunkingRhythmSuggestion.trim()] : []), ...rhythmFromAudio].slice(
        0,
        10
      )
    : []

  const whatWorked = [
    ...(le?.whatWorked?.length ? le.whatWorked : turn.keyStrengths),
  ].slice(0, 10)

  const grammarFeedback = [
    ...(le?.grammarIssues ?? []),
    ...(le?.wordOrderNotes?.map((w) => `Word order: ${w}`) ?? []),
    ...(le?.questionFormNotes?.map((w) => `Question form: ${w}`) ?? []),
    ...(le?.verbTenseNotes?.map((w) => `Verb / tense: ${w}`) ?? []),
    ...(le?.agreementNotes?.map((w) => `Agreement: ${w}`) ?? []),
  ].slice(0, 14)

  const sentenceConstructionFeedback = (le?.sentenceStructureIssues ?? []).slice(0, 10)

  const moreNatural =
    (le?.improvedVersion?.trim() || turn.referenceSentence?.trim() || turn.learnerTranscript || turn.transcriptOriginal || '').trim()
  const whyNatural =
    (le?.whyThisIsMoreNatural?.trim() || le?.whyItIsBetter?.trim() || turn.referenceSentenceReason?.trim() || '').trim()
  const whyBetter = (le?.whyItIsBetter?.trim() || turn.referenceSentenceReason?.trim() || '').trim()

  return {
    turnId: turn.turnId,
    learnerTranscript: turn.learnerTranscript || turn.transcriptOriginal || '',
    learnerTranscriptNormalized: turn.transcriptNormalized,
    learnerAudioRef: turn.learnerAudioUrl,
    audioScores: hasAzureAudio ? turn.audioScores : null,
    languageScores: turn.languageScores,
    overallTurnScore: turn.combinedScores.overallTurnScore,
    whatWorked,
    pronunciationFeedback: hasAzureAudio && pronunciationFeedback.length ? pronunciationFeedback : [],
    rhythmFeedback,
    grammarFeedback,
    sentenceConstructionFeedback,
    moreNaturalDutchVersion: moreNatural,
    whyThisVersionIsBetter: whyBetter,
    whyThisIsMoreNatural: whyNatural || undefined,
    levelFitComment: le?.levelBasedComment?.trim() ?? '',
    nextStepBeyondLevel: le?.nextStepBeyondLevel?.trim() || undefined,
    nextPatternToPractice: le?.nextPatternToPractice?.trim() || undefined,
    learnerFacingGrammarLine: le?.learnerFacingGrammarLine?.trim() || undefined,
    referenceAudioUrl: turn.referenceAudioUrl,
    actionsToTrainLater: (turn.improvementActions ?? []).map((a) => ({
      type: a.type,
      title: a.title,
      detail: a.detail,
      targetPhrase: a.targetPhrase,
      targetWord: a.targetWord,
    })),
  }
}
