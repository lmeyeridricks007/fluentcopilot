import type { NormalizedPronunciationAssessment } from '../speech/pronunciationAssessmentContracts'

export type ReadAloudDimensionBlock = {
  supported: boolean
  score: number | null
  score01: number | null
  label: string
  detail: string | null
  evidence: string
}

export type ReadAloudDimensionsMap = {
  pronunciation: ReadAloudDimensionBlock
  fluency: ReadAloudDimensionBlock
  pacing: ReadAloudDimensionBlock
  clarity: ReadAloudDimensionBlock
  readingAccuracy: ReadAloudDimensionBlock
  expression: ReadAloudDimensionBlock
  levelFit: ReadAloudDimensionBlock
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function readingAccuracyPresentation(input: {
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2'
  scorePct: number
  sentenceCoveragePct: number
  alignmentConfidencePct: number
  reportMode: 'strong' | 'limited' | 'failure'
}): {
  label: string
  detail: string
  evidence: string
} {
  const s = input.scorePct
  const coverage = Math.round(input.sentenceCoveragePct)
  const conf = Math.round(input.alignmentConfidencePct)
  const label = input.reportMode === 'failure'
    ? 'Limited evidence'
    : input.reportMode === 'limited'
      ? 'Approximate passage match'
    : s >= 80
      ? 'Strong match to the passage'
      : s >= 62
        ? 'Mostly matched to the passage'
        : 'Mixed evidence against the passage'

  const detail = input.reportMode !== 'failure'
    ? 'How confidently we matched your reading to the target passage. This blends sentence coverage with approximate sentence content, so small ASR misses do not count as proof that you skipped words.'
    : 'We could only recover a small part of the read with strong confidence, so this score is based on the clearest matched lines only.'

  const evidence = input.reportMode === 'strong'
    ? `About ${Math.round(s)}% overall, with ${coverage}% of sentences matched strongly enough to use and about ${conf}% alignment confidence. This score tolerates small ASR drops and spelling noise better than strict word-for-word transcript matching.`
    : input.reportMode === 'limited'
      ? `About ${Math.round(s)}% overall, with ${coverage}% approximate sentence coverage and about ${conf}% alignment confidence. We matched most of this read approximately, so the feedback below leans on the clearest aligned sentence clips.`
      : `Only about ${coverage}% of sentences could be aligned with usable confidence, and alignment confidence is around ${conf}%. Feedback below focuses on the clearest matched lines.`

  return { label, detail, evidence }
}

export function buildDimensions(input: {
  pa: NormalizedPronunciationAssessment | null
  readingAccuracy01: number
  sentenceCoverage01: number
  smoothReading01: number
  clarity01: number
  alignmentConfidence01: number
  reportMode: 'strong' | 'limited' | 'failure'
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2'
}): ReadAloudDimensionsMap {
  const pa = input.pa
  const prosody = pa?.prosodyScore != null ? clamp100(pa.prosodyScore) : null

  const pronunciationScore = pa ? clamp100(pa.pronunciationScore) : null
  const fluencyScore = pa ? clamp100(pa.fluencyScore) : null
  const readingAccuracyScore = clamp100(input.readingAccuracy01 * 100)
  const raPresent = readingAccuracyPresentation({
    cefrLevel: input.cefrLevel,
    scorePct: readingAccuracyScore,
    sentenceCoveragePct: input.sentenceCoverage01 * 100,
    alignmentConfidencePct: input.alignmentConfidence01 * 100,
    reportMode: input.reportMode,
  })
  const levelExpect =
    input.cefrLevel === 'A1' ? 0.52 : input.cefrLevel === 'A2' ? 0.58 : input.cefrLevel === 'B1' ? 0.68 : 0.78
  const levelFitScore = clamp100(100 - Math.max(0, (levelExpect - input.readingAccuracy01) * 130))

  const prosodyMissing = Boolean(pa) && prosody == null
  const pacingSupported = Boolean(pa)
  const pacingScore = pa ? clamp100(input.smoothReading01 * 100) : null

  const expressionSupported = Boolean(pa)
  const expressionScore = pa
    ? prosody != null
      ? clamp100(fluencyScore! * 0.45 + prosody! * 0.35 + input.smoothReading01 * 100 * 0.2)
      : clamp100(fluencyScore! * 0.75 + input.smoothReading01 * 100 * 0.25)
    : null

  const claritySupported = Boolean(pa)
  const clarityScore = claritySupported ? clamp100(input.clarity01 * 100) : null

  const pronRounded = pa ? Math.round(pa.pronunciationScore) : null
  const fluRounded = pa ? Math.round(pa.fluencyScore) : null

  return {
    pronunciation: {
      supported: Boolean(pa),
      score: pronunciationScore,
      score01: pronunciationScore != null ? pronunciationScore / 100 : null,
      label: !pa ? 'Not scored this time' : pronunciationScore! >= 78 ? 'Clear' : pronunciationScore! >= 62 ? 'Mostly clear' : 'Needs polish',
      detail: pa
        ? 'Scored speech clips estimated how clearly you pronounced the target words in the aligned audio.'
        : null,
      evidence: pa
        ? pronRounded != null && fluRounded != null
          ? fluRounded! > pronRounded! + 8
            ? `Sentence-level pronunciation is about ${pronRounded}, while smoothness is higher (${fluRounded}). That usually means a few words need cleaner vowels or consonants more than the whole read needing a restart.`
            : `Sentence-level pronunciation is about ${pronRounded}. Use the sentence rows and the supported word chips for the clearest evidence.`
          : 'We could not turn this into simple numbers for this clip.'
        : 'We could not score pronunciation for this recording. A quiet room and one steady read-through usually helps.',
    },
    fluency: {
      supported: Boolean(pa),
      score: fluencyScore,
      score01: fluencyScore != null ? fluencyScore / 100 : null,
      label: !pa ? 'Not scored this time' : fluencyScore! >= 78 ? 'Smooth' : fluencyScore! >= 62 ? 'Fairly smooth' : 'Uneven',
      detail: pa ? 'Scored speech clips estimated how evenly you moved through the words inside the aligned sentence windows.' : null,
      evidence: pa
        ? `Fluency is about ${fluRounded} out of 100 inside the aligned speech clips. We combine that with clip flow in “Rhythm & tone” below.`
        : 'We can only show smoothness when the full pronunciation check works for this clip.',
    },
    pacing: {
      supported: pacingSupported,
      score: pacingScore,
      score01: pacingScore != null ? pacingScore / 100 : null,
      label: !pa
        ? 'Not scored this time'
        : prosodyMissing
          ? pacingScore! >= 75
            ? 'Steady flow (tone not split out)'
            : pacingScore! >= 60
              ? 'Mixed flow (tone not split out)'
              : 'Uneven flow (tone not split out)'
          : pacingScore! >= 75
            ? 'Steady pace'
            : pacingScore! >= 60
              ? 'Mixed pacing'
              : 'Rushed or uneven',
      detail: !pa
        ? null
        : prosodyMissing
          ? 'How steady the whole read sounded after combining fluency evidence with clip flow. Separate tone data was not returned for this clip.'
          : 'How steady the whole read sounded after combining rhythm/tone evidence with clip flow across sentence windows.',
      evidence: !pa
        ? 'We could not score this without a pronunciation check.'
        : prosodyMissing
          ? `Overall flow is about ${Math.round(pacingScore!)} out of 100. This blends fluency evidence with how cleanly the sentence windows connect through the clip.`
          : `Overall flow is about ${Math.round(pacingScore!)} out of 100, combining rhythm/tone evidence with sentence-to-sentence clip flow.`,
    },
    clarity: {
      supported: claritySupported,
      score: clarityScore,
      score01: clarityScore != null ? clarityScore / 100 : null,
      label: !claritySupported
        ? 'Not enough to score'
        : clarityScore! >= 78
          ? 'Easy to follow'
          : clarityScore! >= 64
            ? 'Understandable'
            : 'Harder to follow',
      detail: claritySupported
        ? 'How easy the aligned sentence clips sound to follow overall, using pronunciation evidence plus matched sentence content.'
        : null,
      evidence: claritySupported
        ? `Overall “easy to follow” is about ${Math.round(clarityScore!)}. That blends pronunciation evidence with how well the aligned sentence content fits the target passage.`
        : 'We only show this when pronunciation scoring is available.',
    },
    readingAccuracy: {
      supported: true,
      score: readingAccuracyScore,
      score01: input.readingAccuracy01,
      label: raPresent.label,
      detail: raPresent.detail,
      evidence: raPresent.evidence,
    },
    expression: {
      supported: expressionSupported,
      score: expressionScore,
      score01: expressionScore != null ? expressionScore / 100 : null,
      label: !pa
        ? 'Not scored this time'
        : prosodyMissing
          ? expressionScore! >= 75
            ? 'Strong flow (melody not added)'
            : expressionScore! >= 62
              ? 'Fair flow (melody not added)'
              : 'Uneven flow (melody not added)'
          : expressionScore! >= 75
            ? 'Natural delivery'
            : expressionScore! >= 60
              ? 'Adequate delivery'
              : 'Flat or rushed delivery',
      detail: !pa
        ? null
        : prosodyMissing
          ? 'How natural the sentence clips sounded overall. Separate tone cues were missing, so this leans more heavily on fluent delivery.'
          : 'How natural the sentence clips sounded overall, blending fluent delivery with tone/rhythm evidence.',
      evidence: !pa
        ? 'We could not score this without a pronunciation check.'
        : prosodyMissing
          ? `About ${Math.round(expressionScore!)} out of 100. A cleaner retake may return separate tone data and make this less dependent on fluency alone.`
          : `About ${Math.round(expressionScore!)} out of 100, from sentence fluency (${fluRounded}) plus tone/rhythm (${prosody}) together.`,
    },
    levelFit: {
      supported: true,
      score: levelFitScore,
      score01: levelFitScore / 100,
      label: levelFitScore >= 78 ? 'Good fit for level' : levelFitScore >= 62 ? 'Stretching slightly' : 'Above comfort for now',
      detail: `How this read compares with what we usually see at ${input.cefrLevel} on passages like this one.`,
      evidence: `Your passage match is about ${Math.round(readingAccuracyScore)}%. “Fit for level” uses that sentence-level match signal at ${input.cefrLevel} — not an exam speaking grade.`,
    },
  }
}

export function buildAudioFirstDimensions(input: {
  pa: NormalizedPronunciationAssessment | null
  overallScore01: number
  speakingQuality01: number
  smoothReading01: number
  clarity01: number
  llmConfidence01: number
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2'
}): ReadAloudDimensionsMap {
  const pa = input.pa
  const pronunciationScore = pa ? clamp100(pa.pronunciationScore) : null
  const fluencyScore = pa ? clamp100(pa.fluencyScore) : null
  const prosody = pa?.prosodyScore != null ? clamp100(pa.prosodyScore) : null
  const speakingQualityScore = clamp100(input.speakingQuality01 * 100)
  const smoothScore = clamp100(input.smoothReading01 * 100)
  const clarityScore = clamp100(input.clarity01 * 100)
  const overallScore = clamp100(input.overallScore01 * 100)
  const levelExpect =
    input.cefrLevel === 'A1' ? 0.52 : input.cefrLevel === 'A2' ? 0.58 : input.cefrLevel === 'B1' ? 0.68 : 0.78
  const levelFitScore = clamp100(100 - Math.max(0, (levelExpect - input.overallScore01) * 130))

  return {
    pronunciation: {
      supported: Boolean(pa),
      score: pronunciationScore,
      score01: pronunciationScore != null ? pronunciationScore / 100 : null,
      label: !pa ? 'Not scored this time' : pronunciationScore! >= 78 ? 'Clear sounds' : pronunciationScore! >= 62 ? 'Mostly clear sounds' : 'Unclear sounds in places',
      detail: pa ? 'Speech scoring estimated how clearly each spoken chunk was pronounced, using the chunk transcript as the speech target.' : null,
      evidence: pa
        ? `Chunk-level pronunciation is about ${Math.round(pronunciationScore!)} out of 100. This reflects how clearly the spoken chunks sounded, not how perfectly the transcript matched the passage.`
        : 'We could not score pronunciation for this recording.',
    },
    fluency: {
      supported: Boolean(pa),
      score: fluencyScore,
      score01: fluencyScore != null ? fluencyScore / 100 : null,
      label: !pa ? 'Not scored this time' : fluencyScore! >= 78 ? 'Steady delivery' : fluencyScore! >= 62 ? 'Mostly steady' : 'Choppy or rushed',
      detail: pa ? 'Speech scoring estimated how steadily you moved through each spoken chunk.' : null,
      evidence: pa
        ? `Chunk-level fluency is about ${Math.round(fluencyScore!)} out of 100. Lower scores usually mean rushed speech, clipped endings, or uneven pacing inside weaker chunks.`
        : 'We can only show fluency when chunk scoring is available.',
    },
    pacing: {
      supported: true,
      score: smoothScore,
      score01: input.smoothReading01,
      label: smoothScore >= 78 ? 'Good rhythm' : smoothScore >= 62 ? 'Mostly steady rhythm' : 'Rhythm needs work',
      detail: 'How smoothly the whole read flowed across spoken chunks, including pauses, chunk confidence, and rhythm/fluency evidence.',
      evidence: `Overall rhythm is about ${smoothScore} out of 100. This blends chunk fluency, pause handling, and how consistently speech quality held up across the recording.`,
    },
    clarity: {
      supported: true,
      score: clarityScore,
      score01: input.clarity01,
      label: clarityScore >= 78 ? 'Easy to follow' : clarityScore >= 64 ? 'Mostly understandable' : 'Harder to follow',
      detail: 'How understandable the recording sounded overall, combining chunk pronunciation, fluency, and the coaching model’s confidence.',
      evidence: `Overall clarity is about ${clarityScore} out of 100. This focuses on how understandable your spoken chunks sounded, even when the transcript was imperfect.`,
    },
    readingAccuracy: {
      supported: true,
      score: speakingQualityScore,
      score01: input.speakingQuality01,
      label: speakingQualityScore >= 80 ? 'Strong speaking quality' : speakingQualityScore >= 64 ? 'Useful speaking quality' : 'Uneven speaking quality',
      detail: 'A combined speaking-quality signal built from chunk pronunciation, chunk fluency, and how confidently the coaching layer could interpret what you said.',
      evidence: `Speaking quality is about ${speakingQualityScore}% overall, with coaching confidence around ${Math.round(input.llmConfidence01 * 100)}%. We evaluate the spoken audio first, then use the passage only as context.`,
    },
    expression: {
      supported: Boolean(pa),
      score: prosody != null ? clamp100(prosody * 0.55 + smoothScore * 0.45) : smoothScore,
      score01: (prosody != null ? clamp100(prosody * 0.55 + smoothScore * 0.45) : smoothScore) / 100,
      label: prosody != null
        ? prosody >= 75
          ? 'Natural tone'
          : prosody >= 60
            ? 'Some natural phrasing'
            : 'Flat or rushed tone'
        : smoothScore >= 70
          ? 'Natural enough flow'
          : 'Flow needs more shape',
      detail: prosody != null
        ? 'How natural the chunks sounded, blending prosody evidence with overall rhythm.'
        : 'How natural the chunks sounded overall when separate tone data was unavailable.',
      evidence: prosody != null
        ? `Natural delivery is about ${clamp100(prosody * 0.55 + smoothScore * 0.45)} out of 100, combining prosody evidence with overall rhythm.`
        : `Natural delivery leans on flow and chunk smoothness because separate tone data was not returned.`,
    },
    levelFit: {
      supported: true,
      score: levelFitScore,
      score01: levelFitScore / 100,
      label: levelFitScore >= 78 ? 'Good fit for level' : levelFitScore >= 62 ? 'Slight stretch' : 'Above comfort for now',
      detail: `How this read compares with what we usually expect at ${input.cefrLevel} for chunk-level clarity and fluency.`,
      evidence: `Your overall score is about ${overallScore}%. “Fit for your level” uses speaking quality and smooth delivery signals, not strict transcript coverage.`,
    },
  }
}
