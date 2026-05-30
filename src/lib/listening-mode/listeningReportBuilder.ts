import type { ListeningClipAttempt, ListeningLevel, ListeningSessionReviewClip } from '@/lib/listening-mode/schema'

/** Coach-facing bands — never exam scores. */
export type ListeningReportBand = 'strong' | 'building' | 'steady'

/** Five user-facing report dimensions. */
export type ListeningReportUserDimensionId =
  | 'gist_understanding'
  | 'key_detail_accuracy'
  | 'fast_speech_handling'
  | 'natural_dutch_handling'
  | 'response_readiness'

export type ListeningReportUserDimension = {
  id: ListeningReportUserDimensionId
  label: string
  band: ListeningReportBand
  /** One short coach line — not a paragraph. */
  line: string
  /** How many session clips contributed to this row. */
  clipsSampled: number
  /** Rounded hit rate 0–100; `null` when nothing in this session measured that skill. */
  percentCorrect: number | null
}

export type ListeningReportInternalNoteId =
  | 'replay_dependence'
  | 'transcript_dependence'
  | 'route_detail_accuracy'
  | 'number_time_accuracy'

export type ListeningReportInternalNote = {
  id: ListeningReportInternalNoteId
  label: string
  line: string
}

export type ListeningReviewMistakeItem = {
  clipId: string
  /** English — safe to show first. */
  instructionEn: string
  /** One line: what went wrong. */
  whatMissedEn: string
  /** Short meaning — coach tone. */
  whatItMeantEn: string
  transcriptNl: string
  speakLinesNl: string[]
  hadTranscriptReveal: boolean
}

export type ListeningCoachRecommendedTrack = {
  packId: string
  title: string
  reason: string
}

export type ListeningCoachReport = {
  headline: string
  subline: string
  level: ListeningLevel
  scenarioId: string
  packId: string | null
  /** Primary coach dimensions — chips / row. */
  userDimensions: ListeningReportUserDimension[]
  /** Optional one-liners — only when signal is present (avoid noise). */
  internalNotes: ListeningReportInternalNote[]
  /** Ordered narrative blocks (short copy). */
  sections: Array<{
    id: 'top_summary' | 'how_you_did' | 'strongest_area' | 'main_miss' | 'practice_now' | 'recommended_track' | 'review_mistakes'
    title: string
    body: string
    bullets?: string[]
  }>
  practiceNowLines: string[]
  recommendedNext: ListeningCoachRecommendedTrack | null
  reviewMistakes: ListeningReviewMistakeItem[]
  /** @deprecated Use userDimensions — kept for older UI if needed. */
  signals: {
    gist: ListeningReportBand
    details: ListeningReportBand
    pace: ListeningReportBand
  }
}

function ratioCorrect(attempts: ListeningClipAttempt[]): number {
  if (!attempts.length) return 0
  return attempts.filter((a) => a.correct).length / attempts.length
}

function bandFromRatio(hit: number, total: number): ListeningReportBand {
  if (total <= 0) return 'steady'
  const x = hit / total
  if (x >= 0.75) return 'strong'
  if (x >= 0.45) return 'building'
  return 'steady'
}

function dimLine(id: ListeningReportUserDimensionId, band: ListeningReportBand): string {
  const m: Record<ListeningReportUserDimensionId, Record<ListeningReportBand, string>> = {
    gist_understanding: {
      strong: 'You are catching the scene without overthinking.',
      building: 'Main idea is landing — keep one honest listen before options.',
      steady: 'Gist still deserves a calm first pass — let the picture form before details.',
    },
    key_detail_accuracy: {
      strong: 'Small facts are sticking — times, places, quantities.',
      building: 'Details flicker by — one replay after answering is enough.',
      steady: 'Train the ear on one detail per line — numbers and platforms love speed.',
    },
    fast_speech_handling: {
      strong: 'Compressed Dutch is not throwing you.',
      building: 'Pace spikes — shorter bursts help more than longer listens.',
      steady: 'Fast lines need permission to be messy — catch one anchor word.',
    },
    natural_dutch_handling: {
      strong: 'Service-style Dutch sounds natural in context.',
      building: 'Replies are close — tighten the polite shape in your head.',
      steady: 'Counter Dutch rewards tiny warm replies — mimic the rhythm.',
    },
    response_readiness: {
      strong: 'You are ready to answer when the prompt turns to you.',
      building: 'Almost there — hear the question end, then pick your move.',
      steady: 'Wait for the full turn — then answer in one short breath.',
    },
  }
  return m[id][band]
}

function scoreUserDimensions(attempts: ListeningClipAttempt[]): Omit<ListeningReportUserDimension, 'label'>[] {
  type Acc = { hit: number; total: number }
  const gist: Acc = { hit: 0, total: 0 }
  const detail: Acc = { hit: 0, total: 0 }
  const fast: Acc = { hit: 0, total: 0 }
  const natural: Acc = { hit: 0, total: 0 }
  const respond: Acc = { hit: 0, total: 0 }

  for (const a of attempts) {
    if (a.drillType === 'gist' || a.drillType === 'replay_reveal') {
      gist.total += 1
      if (a.correct) gist.hit += 1
    }
    if (a.drillType === 'detail_catch' || a.drillType === 'order_instruction') {
      detail.total += 1
      if (a.correct) detail.hit += 1
    }
    if (a.drillType === 'fast_dutch') {
      fast.total += 1
      if (a.correct) fast.hit += 1
    }
    if (a.drillType === 'listen_respond') {
      respond.total += 1
      if (a.correct) respond.hit += 1
      const tags = a.listeningTags.map((t) => t.toLowerCase())
      if (tags.some((t) => t.includes('natural') || t.includes('service'))) {
        natural.total += 1
        if (a.correct) natural.hit += 1
      }
    }
    if (a.drillType === 'weak_area') {
      gist.total += 1
      if (a.correct) gist.hit += 1
    }
  }

  if (natural.total === 0 && respond.total > 0) {
    natural.hit = respond.hit
    natural.total = respond.total
  }

  const dims: ListeningReportUserDimensionId[] = [
    'gist_understanding',
    'key_detail_accuracy',
    'fast_speech_handling',
    'natural_dutch_handling',
    'response_readiness',
  ]
  const accs = [gist, detail, fast, natural, respond]
  return dims.map((id, i) => {
    const { hit, total } = accs[i]!
    const band = bandFromRatio(hit, total || 0)
    const percentCorrect = total > 0 ? Math.round((hit / total) * 100) : null
    return { id, band, line: dimLine(id, band), clipsSampled: total, percentCorrect }
  })
}

const DIMENSION_LABELS: Record<ListeningReportUserDimensionId, string> = {
  gist_understanding: 'Gist',
  key_detail_accuracy: 'Key details',
  fast_speech_handling: 'Fast speech',
  natural_dutch_handling: 'Natural Dutch',
  response_readiness: 'Response ready',
}

function internalNotesFromAttempts(attempts: ListeningClipAttempt[]): ListeningReportInternalNote[] {
  const notes: ListeningReportInternalNote[] = []
  const heavyReplay = attempts.some((a) => a.playsBeforeAnswer >= 3)
  const transcriptLean = attempts.some(
    (a) => a.transcriptPeekBeforeAnswer || (a.transcriptRevealed && !a.correct),
  )
  const routeMiss = attempts.some(
    (a) => !a.correct && a.listeningTags.some((t) => t.toLowerCase().includes('route')),
  )
  const numMiss = attempts.some(
    (a) => !a.correct && a.listeningTags.some((t) => t.toLowerCase().includes('number') || t.includes('time')),
  )

  if (heavyReplay)
    notes.push({
      id: 'replay_dependence',
      label: 'Replay rhythm',
      line: 'A few extra listens before answering — fine now, nudge toward one honest pass when you can.',
    })
  if (transcriptLean)
    notes.push({
      id: 'transcript_dependence',
      label: 'Text support',
      line: 'You leaned on the written line once or twice — use it as a bridge, not a crutch.',
    })
  if (routeMiss)
    notes.push({
      id: 'route_detail_accuracy',
      label: 'Route detail',
      line: 'A direction or platform detail slipped — short travel reps help.',
    })
  if (numMiss)
    notes.push({
      id: 'number_time_accuracy',
      label: 'Numbers & times',
      line: 'A time or quantity hid in the blur — worth a second focused burst.',
    })
  return notes.slice(0, 3)
}

function bandScore(b: ListeningReportBand): number {
  return b === 'steady' ? 0 : b === 'building' ? 1 : 2
}

function strongestDimension(dims: ListeningReportUserDimension[]): ListeningReportUserDimension | null {
  let best: ListeningReportUserDimension | null = null
  let maxS = -1
  for (const d of dims) {
    const s = bandScore(d.band)
    if (s > maxS) {
      maxS = s
      best = d
    }
  }
  return best
}

function weakestDimension(dims: ListeningReportUserDimension[]): ListeningReportUserDimension | null {
  let worst: ListeningReportUserDimension | null = null
  let minS = 99
  for (const d of dims) {
    const s = bandScore(d.band)
    if (s < minS) {
      minS = s
      worst = d
    }
  }
  return worst
}

function buildReviewMistakes(
  attempts: ListeningClipAttempt[],
  reviewClips?: ListeningSessionReviewClip[],
): ListeningReviewMistakeItem[] {
  if (!reviewClips?.length) return []
  const out: ListeningReviewMistakeItem[] = []
  for (let i = 0; i < reviewClips.length; i++) {
    const rc = reviewClips[i]!
    const att = attempts[i]
    if (!att || att.correct) continue
    const picked =
      att.selectedIndex != null && rc.optionLabels[att.selectedIndex] != null
        ? rc.optionLabels[att.selectedIndex]
        : att.typedAttempt?.trim()
          ? `“${att.typedAttempt.trim().slice(0, 80)}${att.typedAttempt.length > 80 ? '…' : ''}”`
          : 'No option locked'
    const right = rc.optionLabels[rc.correctIndex] ?? 'the fitting line'
    out.push({
      clipId: rc.clipId,
      instructionEn: rc.instructionEn,
      whatMissedEn: `You went with: ${picked}. The line pointed to: ${right}.`,
      whatItMeantEn: rc.meaningEn,
      transcriptNl: rc.transcriptNl,
      speakLinesNl: rc.speakLinesNl,
      hadTranscriptReveal: rc.hadTranscriptReveal,
    })
  }
  return out
}

export function buildListeningCoachReport(input: {
  level: ListeningLevel
  scenarioId: string
  packId?: string | null
  attempts: ListeningClipAttempt[]
  reviewClips?: ListeningSessionReviewClip[]
  nextPackId?: string | null
  recommendedNext?: ListeningCoachRecommendedTrack | null
}): ListeningCoachReport {
  const { attempts, level, scenarioId } = input
  const r = ratioCorrect(attempts)
  const rawDims = scoreUserDimensions(attempts)
  const userDimensions: ListeningReportUserDimension[] = rawDims.map((d) => ({
    ...d,
    label: DIMENSION_LABELS[d.id],
  }))

  const strongest = strongestDimension(userDimensions)
  const weakest = weakestDimension(userDimensions)
  const internalNotes = internalNotesFromAttempts(attempts)
  const reviewMistakes = buildReviewMistakes(attempts, input.reviewClips)

  const headline =
    r >= 0.85
      ? 'Your ear stayed with the Dutch that mattered.'
      : r >= 0.55
        ? 'Solid session — a few edges to polish, nothing dramatic.'
        : 'Honest reps — real-world Dutch rewards short listens.'

  const subline = 'Keep it practical: audio first, then one clear next move.'

  const gistBand = userDimensions.find((d) => d.id === 'gist_understanding')?.band ?? 'steady'
  const detailBand = userDimensions.find((d) => d.id === 'key_detail_accuracy')?.band ?? 'steady'
  const fastBand = userDimensions.find((d) => d.id === 'fast_speech_handling')?.band ?? 'steady'

  const sections: ListeningCoachReport['sections'] = [
    {
      id: 'top_summary',
      title: 'Summary',
      body:
        r >= 0.75
          ? 'You turned good listens into confident picks — that is the habit that travels.'
          : 'You stayed in the scene and made calls under real clip pace — the next burst can sharpen one thread.',
    },
    {
      id: 'how_you_did',
      title: 'How you did',
      body:
        r >= 0.66
          ? 'Most lines landed — you are not guessing from noise.'
          : 'Some lines asked for a second honest listen — totally normal for Dutch on the move.',
    },
    {
      id: 'strongest_area',
      title: 'Strongest listening area',
      body: strongest
        ? `${strongest.label} — ${strongest.line}`
        : 'Keep stacking short bursts — strengths will surface quickly.',
    },
    {
      id: 'main_miss',
      title: 'Main miss',
      body: weakest
        ? `${weakest.label} asked for a bit more attention this round — ${weakest.line}`
        : 'No single weak thread stood out — rotate scenarios to keep the ear honest.',
    },
    {
      id: 'practice_now',
      title: 'Practice now',
      body: 'One more short burst beats a long review — pick audio you will actually hear in the wild.',
    },
    {
      id: 'recommended_track',
      title: 'Recommended next track',
      body: input.recommendedNext
        ? `${input.recommendedNext.title} — ${input.recommendedNext.reason}`
        : 'Grab another pack in the same life-area, or switch context to keep variety.',
    },
    {
      id: 'review_mistakes',
      title: 'Review mistakes',
      body:
        reviewMistakes.length > 0
          ? `${reviewMistakes.length} moment${reviewMistakes.length === 1 ? '' : 's'} to glance back — keep each one short.`
          : 'Clean round — nothing to review line-by-line.',
    },
  ]

  const practiceNowLines = [
    'Optional: replay any slip once, slower, without chasing a perfect score.',
    'Pair with one Speak scene when you have five minutes — listening warms the reply.',
  ]

  const rec =
    input.recommendedNext ??
    (input.nextPackId
      ? { packId: input.nextPackId, title: 'Next burst', reason: 'Continue in the same flow.' }
      : null)

  return {
    headline,
    subline,
    level,
    scenarioId,
    packId: input.packId ?? null,
    userDimensions,
    internalNotes,
    sections,
    practiceNowLines,
    recommendedNext: rec,
    reviewMistakes,
    signals: { gist: gistBand, details: detailBand, pace: fastBand },
  }
}
