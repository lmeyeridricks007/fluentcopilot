import type { NormalizedPronunciationAssessment, NormalizedWordAssessment } from '../speech/pronunciationAssessmentContracts'
import type { ReadAloudSentenceAlignmentStatus } from './readAloudSentenceAlignmentService'
import { computeSentenceClipBoundsSec } from './readAloudSentenceClipBounds'
import { tokenizeWords } from './readAloudTextUtils'
import { diffWords, type WordDiffOp } from './readAloudWordAlign'

const ALIGNMENT_UNCERTAIN_HINT =
  'Words for this line may have been grouped from another part of your clip (pauses or timing). Trust pronunciation tips and your recording next to the reference more than long “changed word” lists.'

function pronunciationEvidenceForTargetWords(
  pa: NormalizedPronunciationAssessment | null,
  targetSentence: string
): { notes: string[]; words: ReadAloudWordEvidence[] } {
  if (!pa?.words?.length) return { notes: [], words: [] }
  const byKey = new Map<string, NormalizedWordAssessment[]>()
  for (const w of pa.words) {
    const k = normalizeWordKey(w.word)
    if (!k || k.length < 2) continue
    const arr = byKey.get(k) ?? []
    arr.push(w)
    byKey.set(k, arr)
  }
  const picked: NormalizedWordAssessment[] = []
  for (const tok of tokenizeWords(targetSentence)) {
    const k = normalizeWordKey(tok)
    if (!k || k.length < 2) continue
    const arr = byKey.get(k)
    if (!arr?.length) continue
    const best = arr.reduce((a, b) => (a.accuracyScore <= b.accuracyScore ? a : b))
    picked.push(best)
  }
  const words: ReadAloudWordEvidence[] = []
  const seen = new Set<string>()
  for (const w of picked.sort((a, b) => a.accuracyScore - b.accuracyScore)) {
    const k = normalizeWordKey(w.word)
    if (seen.has(k)) continue
    seen.add(k)
    if (w.accuracyScore >= 88) continue
    words.push({
      word: w.word,
      accuracyScore: w.accuracyScore,
      ...(w.errorType ? { errorType: w.errorType } : {}),
    })
  }
  const notes: string[] = []
  for (const w of words) {
    if (w.accuracyScore >= 72) continue
    notes.push(
      `“${w.word}” scored ${Math.round(w.accuracyScore)} on clarity in your reading — slow it down and stress syllables cleanly.`
    )
  }
  return { notes: notes.slice(0, 5), words: words.slice(0, 12) }
}

function mergeWordEvidence(a: ReadAloudWordEvidence[], b: ReadAloudWordEvidence[]): ReadAloudWordEvidence[] {
  const m = new Map<string, ReadAloudWordEvidence>()
  for (const w of [...a, ...b]) {
    const k = normalizeWordKey(w.word)
    if (!k) continue
    const prev = m.get(k)
    if (!prev || w.accuracyScore < prev.accuracyScore) m.set(k, w)
  }
  return [...m.values()].sort((x, y) => x.accuracyScore - y.accuracyScore).slice(0, 12)
}

export type ReadAloudMismatchKind = 'skip' | 'substitute' | 'extra' | 'repeat'

export type ReadAloudSentenceMismatch = {
  kind: ReadAloudMismatchKind
  target?: string
  spoken?: string
}

export type ReadAloudWordEvidence = {
  word: string
  accuracyScore: number
  errorType?: string
}

export type ReadAloudSentenceReviewV2 = {
  index: number
  targetText: string
  spokenText: string
  alignmentConfidence?: number
  alignmentStatus?: ReadAloudSentenceAlignmentStatus
  alignmentNotes?: string[]
  paceNote: string | null
  mismatches: ReadAloudSentenceMismatch[]
  /** One-line coaching priority for this sentence. */
  mainFix: string | null
  /** Short evidence-backed positives. */
  matchedWell: string[]
  /** Azure word scores intersecting this sentence’s spoken slice (may be empty). */
  pronunciationNotes: string[]
  /** Words from assessment in this slice with low scores, for badges. */
  wordEvidence: ReadAloudWordEvidence[]
  /**
   * When true, transcript-to-sentence alignment is weak (common with pauses / retries / STT drift).
   * Prefer pronunciation chips + recording compare over aggressive substitute lists.
   */
  alignmentUncertain?: boolean
  /** Approximate window in the learner clip for this line (from pronunciation word timings). */
  clipStartSec?: number
  clipEndSec?: number
}

function normalizeWordKey(w: string): string {
  return w
    .toLowerCase()
    .replace(/^[“"'(]+|[”"',).:;!?]+$/gu, '')
    .trim()
}

function mismatchesFromOps(ops: WordDiffOp[]): ReadAloudSentenceMismatch[] {
  const out: ReadAloudSentenceMismatch[] = []
  for (let k = 0; k < ops.length; k++) {
    const o = ops[k]!
    if (o.kind === 'match') continue
    if (o.kind === 'delete') {
      out.push({ kind: 'skip', target: o.target })
      continue
    }
    if (o.kind === 'substitute') {
      out.push({ kind: 'substitute', target: o.target, spoken: o.spoken })
      continue
    }
    if (o.kind === 'insert') {
      const prev = ops[k - 1]
      const prevSpoken =
        prev?.kind === 'match'
          ? prev.spoken
          : prev?.kind === 'insert'
            ? prev.spoken
            : prev?.kind === 'substitute'
              ? prev.spoken
              : undefined
      const sameAsPrev =
        prevSpoken != null && normalizeWordKey(prevSpoken) === normalizeWordKey(o.spoken)
      const sameAsLastOut =
        out.length > 0 &&
        (out[out.length - 1]!.kind === 'extra' || out[out.length - 1]!.kind === 'repeat') &&
        out[out.length - 1]!.spoken != null &&
        normalizeWordKey(out[out.length - 1]!.spoken!) === normalizeWordKey(o.spoken)
      const isRepeat = sameAsPrev || sameAsLastOut
      out.push({ kind: isRepeat ? 'repeat' : 'extra', spoken: o.spoken })
    }
  }
  return out.slice(0, 32)
}

function pronunciationEvidenceForSlice(
  pa: NormalizedPronunciationAssessment | null,
  spokenSlice: string
): { notes: string[]; words: ReadAloudWordEvidence[] } {
  if (!pa?.words?.length || !spokenSlice.trim()) return { notes: [], words: [] }
  const sliceKeys = new Set(tokenizeWords(spokenSlice).map(normalizeWordKey))
  const hits: NormalizedWordAssessment[] = []
  for (const w of pa.words) {
    const k = normalizeWordKey(w.word)
    if (!k || k.length < 2) continue
    if (!sliceKeys.has(k)) continue
    hits.push(w)
  }
  const words: ReadAloudWordEvidence[] = hits
    .filter((w) => w.accuracyScore < 88)
    .sort((a, b) => a.accuracyScore - b.accuracyScore)
    .slice(0, 12)
    .map((w) => ({
      word: w.word,
      accuracyScore: w.accuracyScore,
      ...(w.errorType ? { errorType: w.errorType } : {}),
    }))
  const notes: string[] = []
  for (const w of words) {
    if (w.accuracyScore >= 72) continue
    notes.push(
      `“${w.word}” scored ${Math.round(w.accuracyScore)} on clarity in this part of your reading — slow it down and stress syllables cleanly.`
    )
  }
  return { notes: notes.slice(0, 4), words }
}

function mainFixForSentence(
  mismatches: ReadAloudSentenceMismatch[],
  paceNote: string | null,
  pronunciationNotes: string[],
  alignmentNotes?: string[]
): string | null {
  const alignmentNote = alignmentNotes?.[0]
  if (alignmentNote && /could not|low confidence|restart|missed part/i.test(alignmentNote)) return alignmentNote
  if (paceNote) return paceNote
  const rep = mismatches.find((m) => m.kind === 'repeat')
  if (rep?.spoken) return `Repeated “${rep.spoken}” — try saying each word once unless the text repeats it.`
  const skip = mismatches.find((m) => m.kind === 'skip')
  if (skip?.target) return `Missing “${skip.target}” compared to the written sentence.`
  const sub = mismatches.find((m) => m.kind === 'substitute')
  if (sub?.target && sub.spoken) return `“${sub.target}” was heard closer to “${sub.spoken}”.`
  const extra = mismatches.find((m) => m.kind === 'extra')
  if (extra?.spoken) return `Extra word “${extra.spoken}” appeared versus the written line.`
  if (pronunciationNotes[0]) return pronunciationNotes[0] ?? null
  return null
}

function matchedWellForSentence(target: string, spoken: string, mismatches: ReadAloudSentenceMismatch[]): string[] {
  if (!mismatches.length) {
    return ['This sentence stayed very close to the target wording in the transcript.']
  }
  const { ops } = diffWords(target, spoken)
  const matches = ops.filter((o) => o.kind === 'match').length
  const targets = tokenizeWords(target).length
  const ratio = targets > 0 ? matches / targets : 0
  const out: string[] = []
  if (ratio >= 0.65) out.push(`About ${Math.round(ratio * 100)}% of target words were recognized in order here.`)
  if (mismatches.every((m) => m.kind === 'extra' || m.kind === 'repeat')) {
    out.push('The core words from the line were still mostly present — tighten extras and pacing.')
  }
  if (!out.length) out.push('Some stretches matched; use the mismatch list to patch specific words.')
  return out.slice(0, 3)
}

export function worstSentenceIndex(sentences: ReadAloudSentenceReviewV2[]): number | null {
  let best = -1
  let idx: number | null = null
  for (const s of sentences) {
    const alignmentPenalty = s.alignmentStatus === 'missing' ? 4 : s.alignmentStatus === 'uncertain' ? 2 : 0
    const weight = s.mismatches.length * 3 + s.pronunciationNotes.length + (s.paceNote ? 1 : 0) + alignmentPenalty
    if (weight > best) {
      best = weight
      idx = s.index
    }
  }
  return idx
}

export function buildSentenceReviewsV2(input: {
  sentencesTarget: string[]
  spokenParts: string[]
  pa: NormalizedPronunciationAssessment | null
  /** When set, row `i` uses this Azure result (sentence clip) for pronunciation chips and notes. */
  paPerSentence?: Array<NormalizedPronunciationAssessment | null>
  /** When set, overrides clip timing from pronunciation word match (e.g. Whisper + LLM spans). */
  clipBoundsOverride?: Array<{ startSec: number; endSec: number } | null>
  /** When set, sentence-level alignment confidence/status controls mismatch strictness and copy. */
  sentenceAlignment?: Array<{
    alignmentConfidence: number
    alignmentStatus: ReadAloudSentenceAlignmentStatus
    notes?: string[]
  }>
}): ReadAloudSentenceReviewV2[] {
  const clipBounds =
    input.clipBoundsOverride !== undefined
      ? input.clipBoundsOverride
      : computeSentenceClipBoundsSec(input.sentencesTarget, input.spokenParts, input.pa)
  return input.sentencesTarget.map((target, i) => {
    const spoken = input.spokenParts[i] ?? ''
    const alignment = input.sentenceAlignment?.[i]
    const usableAlignment =
      alignment != null &&
      (alignment.alignmentStatus === 'aligned' || alignment.alignmentStatus === 'approximate') &&
      alignment.alignmentConfidence >= 0.46
    const { ops, accuracy01 } = diffWords(target, spoken)
    let mismatches = mismatchesFromOps(ops)
    const tw = tokenizeWords(target).length
    const sw = tokenizeWords(spoken).length
    let paceNote: string | null = null
    if (tw >= 4) {
      if (sw < tw * 0.55) paceNote = 'This line sounds shorter than the text — possible skips or rushing.'
      else if (sw > tw * 1.55) paceNote = 'More words than the target here — possible repetitions or insertions.'
    }

    const subCount = mismatches.filter((m) => m.kind === 'substitute').length
    const heavySubstitutes = tw > 0 && subCount >= 3 && subCount >= Math.ceil(tw * 0.35)
    const weakTranscriptAlignment =
      tw > 0 && spoken.trim().length > 0 && (accuracy01 < 0.34 || (heavySubstitutes && accuracy01 < 0.55))
    const alignmentUncertain =
      alignment?.alignmentStatus === 'uncertain' ||
      alignment?.alignmentStatus === 'missing' ||
      weakTranscriptAlignment
    const suppressMismatchList =
      alignment?.alignmentStatus === 'missing' ||
      alignment?.alignmentStatus === 'uncertain' ||
      (alignment?.alignmentStatus === 'approximate' && (alignment.alignmentConfidence ?? 0) < 0.6)
    if (suppressMismatchList) mismatches = []

    const rowPa = input.paPerSentence?.[i] ?? input.pa
    const sliceEv = usableAlignment ? pronunciationEvidenceForSlice(rowPa, spoken) : { notes: [], words: [] }
    let notes = sliceEv.notes
    let words = sliceEv.words
    if (alignmentUncertain && usableAlignment) {
      const fromTarget = pronunciationEvidenceForTargetWords(rowPa, target)
      words = mergeWordEvidence(fromTarget.words, words)
      const mergedNotes = [...fromTarget.notes.filter((n) => !notes.includes(n)), ...notes]
      notes = mergedNotes.slice(0, 5)
    }
    if (!usableAlignment) {
      words = []
      notes = alignment?.alignmentStatus === 'missing' ? [] : ['Not enough aligned audio evidence for word-level scoring on this line.']
    }

    if ((alignmentUncertain && (heavySubstitutes || accuracy01 < 0.3)) || suppressMismatchList) {
      mismatches = mismatches.filter((m) => m.kind !== 'substitute')
    }

    let matchedWell: string[]
    if (alignment?.alignmentStatus === 'missing') {
      matchedWell = [
        'We could not confidently isolate enough audio for this sentence to score it fairly.',
        'Use the reference audio and your full recording to compare this line by ear.',
      ]
      paceNote = paceNote ?? 'This sentence could not be matched reliably in the recording.'
    } else if (alignmentUncertain) {
      matchedWell = [ALIGNMENT_UNCERTAIN_HINT]
      if (alignment?.notes?.length) matchedWell.push(...alignment.notes.slice(0, 2))
      if (accuracy01 >= 0.12) {
        matchedWell.push(
          'Some words in this line still show up in the transcript — mispronunciations can look like “wrong words” when timing is off.'
        )
      }
    } else {
      matchedWell = matchedWellForSentence(target, spoken, mismatches)
    }

    let mainFix = mainFixForSentence(mismatches, paceNote, notes, alignment?.notes)
    if (alignmentUncertain && notes.length && (!mainFix || subCount >= 4)) {
      mainFix = notes[0] ?? mainFix
    }

    const clip = clipBounds[i] ?? null

    return {
      index: i,
      targetText: target,
      spokenText: spoken,
      ...(alignment
        ? {
            alignmentConfidence: alignment.alignmentConfidence,
            alignmentStatus: alignment.alignmentStatus,
            ...(alignment.notes?.length ? { alignmentNotes: alignment.notes } : {}),
          }
        : {}),
      paceNote,
      mismatches,
      mainFix,
      matchedWell,
      pronunciationNotes: notes,
      wordEvidence: words,
      ...(alignmentUncertain ? { alignmentUncertain: true } : {}),
      ...(clip ? { clipStartSec: clip.startSec, clipEndSec: clip.endSec } : {}),
    }
  })
}

export type ReadAloudNextAction = {
  id:
    | 'practice_weak_words'
    | 'retry_passage'
    | 'retry_sentence'
    | 'new_passage_same_level'
    | 'lower_level'
    | 'raise_level'
    | 'generate_same_genre'
  label: string
  /** Sentence index when `retry_sentence` */
  sentenceIndex?: number
}

export function buildReadAloudNextActions(input: {
  weakWords: string[]
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2'
  genre: string | null
  sentenceCount: number
  readingAccuracy01: number
  worstSentenceIndex: number | null
}): ReadAloudNextAction[] {
  const out: ReadAloudNextAction[] = []
  if (input.weakWords.length) {
    out.push({
      id: 'practice_weak_words',
      label: 'Practice weak words',
    })
  }
  out.push({ id: 'retry_passage', label: 'Retry this passage' })
  if (input.worstSentenceIndex != null && input.sentenceCount > 0) {
    out.push({
      id: 'retry_sentence',
      label: `Retry sentence ${input.worstSentenceIndex + 1} (hardest line)`,
      sentenceIndex: input.worstSentenceIndex,
    })
  }
  out.push({
    id: 'new_passage_same_level',
    label: `Another passage at ${input.cefrLevel}`,
  })
  if (input.cefrLevel !== 'A1') {
    out.push({
      id: 'lower_level',
      label: `Try an easier level (${input.cefrLevel === 'B2' ? 'B1' : input.cefrLevel === 'B1' ? 'A2' : 'A1'})`,
    })
  }
  if (input.cefrLevel !== 'B2' && input.readingAccuracy01 >= 0.78) {
    out.push({
      id: 'raise_level',
      label: `Challenge: next band (${input.cefrLevel === 'A1' ? 'A2' : input.cefrLevel === 'A2' ? 'B1' : 'B2'})`,
    })
  }
  if (input.genre?.trim()) {
    out.push({
      id: 'generate_same_genre',
      label: 'Generate a new text in this genre',
    })
  }
  return out.slice(0, 8)
}
