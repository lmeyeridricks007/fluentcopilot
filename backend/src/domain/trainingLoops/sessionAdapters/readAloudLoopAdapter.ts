import type { ReadAloudEvaluateResult } from '../../../services/read-aloud/readAloudEvaluateTypes'
import type { SessionLoopAdapterHints, SessionAdapterResolutionInput } from './sessionLoopAdapterTypes'
import type { TrainingLoopType } from '../trainingLoopTypes'

const READ_ALOUD_ALLOWED = new Set<TrainingLoopType>([
  'weak_words',
  'pronunciation_drill',
  'read_aloud_fix',
  'retry_sentence',
  'structure_drill',
  'storytelling_drill',
])

function pacingFocusFromReadAloud(ra: ReadAloudEvaluateResult): string | null {
  const pacing = ra.dimensions?.pacing
  const flu = ra.dimensions?.fluency
  const pron = ra.dimensions?.pronunciation
  if (pacing?.score != null && pacing.score < 72) {
    return 'Rushed line endings — hold the last stressed syllable a beat before closing the phrase.'
  }
  if (flu?.score != null && flu.score < 70) {
    return 'Pacing passage — match the printed line breaks; pause briefly at each clause end.'
  }
  const longUnmatched = ra.audioCoverage?.longUnmatchedSec ?? 0
  if (longUnmatched > 1.5) {
    return 'Pacing passage — slow slightly where timing drifted from the target line.'
  }
  if (pron?.score != null && pron.score < 68 && /g|ui|ij|eu|sch/.test(ra.coaching?.summary ?? '')) {
    return 'Weak Dutch sounds — isolate the tricky chunks, then re-read the full line smoothly.'
  }
  return null
}

function pickReadAloudRetryPhrase(ra: ReadAloudEvaluateResult | null): SessionLoopAdapterHints['readAloudRetryPhrase'] {
  if (!ra?.weakSegments?.length) return null
  const seg = ra.weakSegments[0]
  const original = (seg.transcript ?? '').trim()
  const corrected = (seg.suggestion?.trim() || seg.likelyIntendedPhrase?.trim() || '').trim()
  if (original.length < 4 || corrected.length < 4) return null
  const why = (seg.whyItStoodOut ?? seg.issue ?? '').trim().slice(0, 180)
  return {
    learnerOriginal: original.slice(0, 320),
    correctedVersion: corrected.slice(0, 320),
    referenceAudioUrl: null,
    explanationShort:
      why || 'Retry this phrase with steadier mouth shape—compare to the suggested line.',
  }
}

export function buildReadAloudAdapterHints(input: SessionAdapterResolutionInput): SessionLoopAdapterHints {
  const ra = input.readAloudResult
  const pacingLabel = ra ? pacingFocusFromReadAloud(ra) : null
  const retry = pickReadAloudRetryPhrase(ra)

  const preferred: TrainingLoopType[] = ['read_aloud_fix', 'pronunciation_drill', 'weak_words', 'retry_sentence']
  if (pacingLabel) preferred.unshift('read_aloud_fix')
  if (retry) preferred.unshift('retry_sentence')

  return {
    adapterId: 'read_aloud_modality',
    source: 'read_aloud',
    allowedLoopTypes: READ_ALOUD_ALLOWED,
    scenarioTheme: 'general',
    miniScenarioObjectiveOverride: null,
    structurePromptTail: ra
      ? 'Second line: keep the same meaning as the printed passage—only tighten rhythm and word endings.'
      : null,
    structureDrillTitleHint: null,
    questionDrillTitle: null,
    questionDrillSubtitle: null,
    questionDrillPrompts: null,
    questionDrillExampleQuestions: null,
    liveMicroReadPassage: null,
    liveMicroReadSubtitle: null,
    readAloudRetryPhrase: retry,
    readAloudPacingFocusLabel: pacingLabel,
    chatSpeakingTransferPrompts: null,
    preferredLoopTypesForSession: preferred,
  }
}
