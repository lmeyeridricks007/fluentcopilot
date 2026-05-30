/**
 * Personalized “From your day” practice packs from {@link QuickCaptureRow} + optional {@link DailyCaptureCluster}s.
 *
 * Modes: quick_rep (~2–3m), standard (~4–6m), deeper_debrief (~8–10m).
 * Composition: one short recap → 1–3 theme anchors → 3–6 rep steps (spec item types) → one strongest next action.
 */
import type { DailyCaptureCluster } from '../../domain/quickCapture/captureDomainTypes'
import type { QuickCaptureRow } from '../../repositories/quickCaptureRepository'
import { newId } from '../../shared/ids'
import {
  buildPhraseExercisePrompt,
  buildPhraseListeningBurstText,
  buildReadAloudPassageForPhrase,
  buildStruggleReadAloudPassage,
  extractPhrasePackHints,
  extractStrugglePracticeHints,
  extractTextCapturePracticeHints,
  extractVoiceNotePracticeHints,
} from './capturePackHints'
import {
  buildListeningBurstText,
  buildReadAloudPassageForWord,
  buildWordRepExercisePrompt,
  extractWordPackHints,
} from './wordRepPackHints'

export type PracticePackMode = 'quick_rep' | 'standard' | 'deeper_debrief'

export type DayPracticeStep =
  | {
      id: string
      kind: 'pack_meta'
      mode: PracticePackMode
    }
  | {
      id: string
      kind: 'short_recap'
      captureId: string
      headline: string
      bullets: string[]
      prompt: string
      estimatedMinutes?: number
    }
  | {
      id: string
      kind: 'theme_anchor'
      captureId: string
      themeTitle: string
      prompt: string
    }
  | {
      id: string
      kind: 'strongest_next'
      captureId: string
      prompt: string
      actionLabel?: string
    }
  | {
      id: string
      kind: 'word_rep'
      captureId: string
      dutch: string
      prompt: string
      hintEn?: string | null
      /** When true, UI may surface a light pronunciation-drill framing. */
      pronunciationFocus?: boolean
      meaningEn?: string | null
      usageWhenEn?: string | null
      exampleLinesNl?: string[]
      writingPromptNl?: string | null
    }
  | {
      id: string
      kind: 'phrase_rep'
      captureId: string
      dutch: string
      prompt: string
      hintEn?: string | null
      meaningEn?: string | null
      usageWhenEn?: string | null
      exampleLinesNl?: string[]
      writingPromptNl?: string | null
    }
  | {
      id: string
      kind: 'correction_rep'
      captureId: string
      situation: string
      correctedNl: string
      prompt: string
    }
  | {
      id: string
      kind: 'listening_burst'
      captureId: string
      text: string
      prompt: string
    }
  | {
      id: string
      kind: 'read_aloud'
      captureId: string
      text: string
      prompt: string
      /** Short English gloss lines (tags / themes) to show before the read. */
      keyVocabEn?: string[] | null
    }
  | {
      id: string
      kind: 'mini_scenario'
      captureId: string
      scenarioSlug: string
      seedLine: string
      prompt: string
    }
  | {
      id: string
      kind: 'coach_debrief'
      captureId: string
      summary: string
      prompt: string
    }

export type DayPracticePackContent = {
  localDate: string
  title: string
  mode: PracticePackMode
  estimatedMinutes: number
  steps: DayPracticeStep[]
  captureIds: string[]
}

const REP_KINDS = new Set<DayPracticeStep['kind']>([
  'word_rep',
  'phrase_rep',
  'correction_rep',
  'mini_scenario',
  'read_aloud',
  'listening_burst',
  'coach_debrief',
])

function isRepStep(s: DayPracticeStep): boolean {
  return REP_KINDS.has(s.kind)
}

function stepId(): string {
  return newId()
}

function parseEnrichedScenario(row: QuickCaptureRow): string {
  if (!row.enrichedJson) return 'train-station'
  try {
    const j = JSON.parse(row.enrichedJson) as { scenarioSlugGuess?: string | null }
    return typeof j.scenarioSlugGuess === 'string' && j.scenarioSlugGuess.trim()
      ? j.scenarioSlugGuess.trim()
      : 'train-station'
  } catch {
    return 'train-station'
  }
}

function modeBudget(mode: PracticePackMode): {
  estimatedMinutes: number
  maxRepSteps: number
  maxThemeAnchors: number
  maxRepsPerCapture: number
} {
  switch (mode) {
    case 'quick_rep':
      return { estimatedMinutes: 3, maxRepSteps: 3, maxThemeAnchors: 1, maxRepsPerCapture: 1 }
    case 'deeper_debrief':
      return { estimatedMinutes: 9, maxRepSteps: 6, maxThemeAnchors: 3, maxRepsPerCapture: 3 }
    default:
      return { estimatedMinutes: 6, maxRepSteps: 7, maxThemeAnchors: 2, maxRepsPerCapture: 4 }
  }
}

function titleForMode(mode: PracticePackMode): string {
  switch (mode) {
    case 'quick_rep':
      return 'Quick rep — from your day'
    case 'deeper_debrief':
      return 'Daily debrief — from your day'
    default:
      return 'From your day'
  }
}

/** Order captures using bundle flat order when present, else input order. */
export function orderCapturesForPack(
  captures: QuickCaptureRow[],
  bundleCaptureIds: readonly string[] | null | undefined,
): QuickCaptureRow[] {
  if (!bundleCaptureIds?.length) return captures
  const m = new Map(captures.map((c) => [c.id, c]))
  const out: QuickCaptureRow[] = []
  const seen = new Set<string>()
  for (const id of bundleCaptureIds) {
    const c = m.get(id)
    if (c && !seen.has(c.id)) {
      out.push(c)
      seen.add(c.id)
    }
  }
  for (const c of captures) {
    if (!seen.has(c.id)) out.push(c)
  }
  return out
}

function clustersTouchingCaptures(
  clusters: readonly DailyCaptureCluster[],
  captureIdSet: Set<string>,
): DailyCaptureCluster[] {
  return clusters
    .filter((cl) => cl.relatedCaptureIds.some((id) => captureIdSet.has(id)))
    .slice()
}

function buildRecap(params: {
  localDate: string
  orderedCaptures: QuickCaptureRow[]
  topClusters: DailyCaptureCluster[]
  mode: PracticePackMode
  estimatedMinutes: number
}): DayPracticeStep {
  const anchorId = params.orderedCaptures[0]?.id ?? 'meta'
  const typeCounts = new Map<string, number>()
  for (const c of params.orderedCaptures) {
    typeCounts.set(c.captureType, (typeCounts.get(c.captureType) ?? 0) + 1)
  }
  const bullets: string[] = []
  if (params.topClusters.length) {
    for (const cl of params.topClusters.slice(0, 3)) {
      bullets.push(`${cl.title}: ${cl.summary}`)
    }
  } else {
    bullets.push(`${params.orderedCaptures.length} moment${params.orderedCaptures.length === 1 ? '' : 's'} from ${params.localDate}`)
    const top = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]
    if (top) bullets.push(`Mostly ${top[0].replace(/_/g, ' ')} captures`)
  }
  const modeLine =
    params.mode === 'quick_rep'
      ? 'Quick loop: warm up, a few tight reps, one clear next step.'
      : params.mode === 'deeper_debrief'
        ? 'Deeper pass: more scenarios, coach space, and shadowing from what you actually heard and said.'
        : 'Balanced pack: a little structure, then reps clustered by what went together today.'
  return {
    id: stepId(),
    kind: 'short_recap',
    captureId: anchorId,
    headline: 'Today, in short',
    bullets: bullets.slice(0, 4),
    prompt: [modeLine, `About ${params.estimatedMinutes} minutes if you move steadily.`].join(' '),
    estimatedMinutes: params.estimatedMinutes,
  }
}

function repStepsForCapture(row: QuickCaptureRow, mode: PracticePackMode, maxForThis: number): DayPracticeStep[] {
  const primary = (row.bodyPrimary ?? row.transcript ?? '').trim()
  const secondary = (row.bodySecondary ?? '').trim() || null
  const slug = parseEnrichedScenario(row)
  const out: DayPracticeStep[] = []

  const push = (s: DayPracticeStep) => {
    if (out.length >= maxForThis) return
    out.push(s)
  }

  switch (row.captureType) {
    case 'save_word':
      if (primary) {
        const hints = extractWordPackHints(row.enrichedJson, row.bodySecondary, primary)
        const prompt = buildWordRepExercisePrompt(primary, hints.exampleLinesNl)
        const writingPromptNl = `Schrijf één nieuwe Nederlandse zin met “${primary.trim()}” (minimaal 6 woorden), liefst over je echte dag.`
        push({
          id: stepId(),
          kind: 'word_rep',
          captureId: row.id,
          dutch: primary,
          prompt,
          hintEn: secondary,
          pronunciationFocus: true,
          meaningEn: hints.meaningEn,
          usageWhenEn: hints.usageWhenEn,
          exampleLinesNl: hints.exampleLinesNl,
          writingPromptNl,
        })
        if (mode !== 'quick_rep' && maxForThis > 1) {
          push({
            id: stepId(),
            kind: 'listening_burst',
            captureId: row.id,
            text: buildListeningBurstText(primary, hints.exampleLinesNl),
            prompt:
              'Listen inside your head once, then say the whole line out loud twice — keep the rhythm relaxed, like you are chatting.',
          })
        }
        if (mode === 'deeper_debrief' && maxForThis > 2) {
          const passage = buildReadAloudPassageForWord(primary, hints.exampleLinesNl, hints.usageWhenEn)
          push({
            id: stepId(),
            kind: 'read_aloud',
            captureId: row.id,
            text: passage,
            prompt:
              'Use Read Aloud in Talk for scoring and playback, or stay here and read the passage twice for clarity and confidence.',
          })
        }
      }
      break
    case 'save_phrase': {
      if (!primary) break
      const hints = extractPhrasePackHints(row.enrichedJson, row.bodySecondary, primary)
      const phrase = primary.slice(0, 400)
      const writingPromptNl = `Schrijf één nieuwe zin (minimaal 8 woorden) met deze frase erin: “${phrase.slice(0, 120)}${phrase.length > 120 ? '…' : ''}”.`
      push({
        id: stepId(),
        kind: 'phrase_rep',
        captureId: row.id,
        dutch: phrase,
        prompt: buildPhraseExercisePrompt(phrase, hints.exampleLinesNl),
        hintEn: secondary,
        meaningEn: hints.meaningEn,
        usageWhenEn: hints.usageWhenEn,
        exampleLinesNl: hints.exampleLinesNl,
        writingPromptNl,
      })
      if (mode !== 'quick_rep') {
        push({
          id: stepId(),
          kind: 'listening_burst',
          captureId: row.id,
          text: buildPhraseListeningBurstText(phrase, hints.exampleLinesNl),
          prompt: 'Listen to the line in your head once, then say it twice with relaxed rhythm.',
        })
      }
      if (mode !== 'quick_rep') {
        push({
          id: stepId(),
          kind: 'read_aloud',
          captureId: row.id,
          text: buildReadAloudPassageForPhrase(phrase, hints.exampleLinesNl, hints.usageWhenEn),
          prompt: 'Read for clarity first, then once more as if you are actually there.',
        })
      }
      if (mode === 'deeper_debrief') {
        push({
          id: stepId(),
          kind: 'mini_scenario',
          captureId: row.id,
          scenarioSlug: slug,
          seedLine: phrase.slice(0, 140),
          prompt: 'Mini dialogue: stay in character for one back-and-forth using your phrase.',
        })
      }
      break
    }
    case 'paste_text': {
      if (!primary) break
      const th = extractTextCapturePracticeHints(row.enrichedJson, row.bodySecondary, primary)
      const anchor = th.anchorPhraseNl.slice(0, 400)
      const vocabBullets = th.keyVocabOrTags.length ? th.keyVocabOrTags.map((t) => `Theme / vocab: ${t}`) : []
      push({
        id: stepId(),
        kind: 'phrase_rep',
        captureId: row.id,
        dutch: anchor,
        prompt:
          'Anchor on this line from your paste — the rest is context. You will read the full passage next.',
        hintEn: th.shortExplanationEn,
        meaningEn: th.shortExplanationEn,
        usageWhenEn: secondary,
        exampleLinesNl: [
          anchor,
          ...(vocabBullets.length ? [`Tags from your capture: ${th.keyVocabOrTags.slice(0, 5).join(', ')}.`] : []),
        ].filter(Boolean),
        writingPromptNl: `Schrijf één zin in het Nederlands die hetzelfde idee uitdrukt als: “${anchor.slice(0, 100)}…”, maar met andere woorden.`,
      })
      push({
        id: stepId(),
        kind: 'read_aloud',
        captureId: row.id,
        text: primary.slice(0, 900),
        prompt: 'Full passage — skim once, then read aloud with steady pacing.',
        keyVocabEn: th.keyVocabOrTags.length ? th.keyVocabOrTags : null,
      })
      if (mode !== 'quick_rep') {
        push({
          id: stepId(),
          kind: 'listening_burst',
          captureId: row.id,
          text: anchor.slice(0, 400),
          prompt: 'Which line best matches the anchor you are practicing from this paste?',
        })
      }
      if (mode === 'deeper_debrief') {
        push({
          id: stepId(),
          kind: 'mini_scenario',
          captureId: row.id,
          scenarioSlug: slug,
          seedLine: anchor.slice(0, 140),
          prompt: 'Use Speak Live for a short improvisation that reuses your anchor line.',
        })
      }
      break
    }
    case 'photo_text': {
      if (!primary) break
      const th = extractTextCapturePracticeHints(row.enrichedJson, row.bodySecondary, primary)
      const anchor = th.anchorPhraseNl.slice(0, 400)
      push({
        id: stepId(),
        kind: 'phrase_rep',
        captureId: row.id,
        dutch: anchor,
        prompt: 'This text came from a photo in your day — lock onto this anchor before the full read.',
        hintEn: th.shortExplanationEn,
        meaningEn: th.shortExplanationEn,
        usageWhenEn: secondary,
        exampleLinesNl: [anchor],
        writingPromptNl: `Noteer in het Nederlands één korte vraag die je zou stellen over deze tekst (max. 15 woorden).`,
      })
      push({
        id: stepId(),
        kind: 'read_aloud',
        captureId: row.id,
        text: primary.slice(0, 900),
        prompt: 'On-the-spot read: menu, sign, or message — keep going even if a word is new.',
        keyVocabEn: th.keyVocabOrTags.length ? th.keyVocabOrTags : null,
      })
      if (mode !== 'quick_rep') {
        push({
          id: stepId(),
          kind: 'listening_burst',
          captureId: row.id,
          text: anchor.slice(0, 400),
          prompt: 'Shadow the anchor line, then pick the closest match.',
        })
      }
      if (mode === 'deeper_debrief') {
        push({
          id: stepId(),
          kind: 'coach_debrief',
          captureId: row.id,
          summary: primary.slice(0, 400),
          prompt: 'Optional: ask Language Coach one question about a tricky word or tone in this photo text.',
        })
      }
      break
    }
    case 'add_place': {
      const placeLine = secondary ?? 'Goedemiddag, ik heb een vraag.'
      push({
        id: stepId(),
        kind: 'phrase_rep',
        captureId: row.id,
        dutch: placeLine,
        prompt: `Next time at ${primary || 'this place'}: memorize this opener and say it walking in.`,
        hintEn: secondary ? null : 'Generic polite opener',
      })
      push({
        id: stepId(),
        kind: 'mini_scenario',
        captureId: row.id,
        scenarioSlug: slug,
        seedLine: primary ? `We zijn bij ${primary}.` : 'We beginnen een korte oefening.',
        prompt: `Weighted for this place — open Speak Live in “${slug}” when you want a live rehearsal.`,
      })
      break
    }
    case 'log_struggle': {
      const situation = primary.slice(0, 280) || 'Something felt hard today.'
      const corrected = secondary ?? 'Kunt u dat herhalen, alstublieft?'
      const sh = extractStrugglePracticeHints(row.enrichedJson, primary)
      push({
        id: stepId(),
        kind: 'correction_rep',
        captureId: row.id,
        situation: sh.likelyIssueEn ? `${situation}\n\nLikely friction: ${sh.likelyIssueEn}` : situation,
        correctedNl: corrected,
        prompt: 'Say the calm correction slowly; that is the line you keep for next time.',
      })
      if (mode !== 'quick_rep') {
        push({
          id: stepId(),
          kind: 'read_aloud',
          captureId: row.id,
          text: buildStruggleReadAloudPassage(situation, corrected),
          prompt: 'Read the situation once, then drill the calm line aloud.',
        })
      }
      if (mode !== 'quick_rep') {
        push({
          id: stepId(),
          kind: 'mini_scenario',
          captureId: row.id,
          scenarioSlug: slug,
          seedLine: `Je oefent opnieuw na: ${situation.slice(0, 120)}`,
          prompt: 'Short response rep: replay the moment with the corrected line ready.',
        })
      }
      if (mode === 'deeper_debrief') {
        push({
          id: stepId(),
          kind: 'listening_burst',
          captureId: row.id,
          text: corrected.slice(0, 400),
          prompt: 'Listen for the calm line, then say it twice before you respond in your head.',
        })
      }
      if (mode === 'deeper_debrief') {
        push({
          id: stepId(),
          kind: 'coach_debrief',
          captureId: row.id,
          summary: primary.slice(0, 400),
          prompt: 'Optional: open Language Coach with this struggle in mind for a short debrief.',
        })
      }
      break
    }
    case 'voice_note': {
      if (!primary) break
      const vh = extractVoiceNotePracticeHints(row.enrichedJson, row.transcript, primary)
      const polish = (vh.polishedPhraseNl ?? primary).slice(0, 400)
      const writingPromptNl = `Zeg het opnieuw, iets strakker: lees deze lijn hardop, dan zonder papier: “${polish.slice(0, 160)}${polish.length > 160 ? '…' : ''}”.`
      push({
        id: stepId(),
        kind: 'phrase_rep',
        captureId: row.id,
        dutch: polish,
        prompt: buildPhraseExercisePrompt(polish, [polish, primary.slice(0, 220)].filter((x, i, a) => a.indexOf(x) === i)),
        hintEn: secondary,
        meaningEn: vh.transcriptSummaryEn,
        usageWhenEn: vh.themeOrIssueEn,
        exampleLinesNl: [polish, primary.slice(0, 220)].filter((x) => x.trim().length > 4).slice(0, 3),
        writingPromptNl,
      })
      push({
        id: stepId(),
        kind: 'read_aloud',
        captureId: row.id,
        text: primary.slice(0, 900),
        prompt: 'Transcript read-aloud: chunk long stretches; aim for clear endings on each chunk.',
        keyVocabEn: vh.transcriptSummaryEn ? [vh.transcriptSummaryEn] : null,
      })
      push({
        id: stepId(),
        kind: 'listening_burst',
        captureId: row.id,
        text: polish.slice(0, 400),
        prompt: 'Which line is closest to the polished version you want to keep?',
      })
      if (mode !== 'quick_rep') {
        const scen = (vh.scenarioSlugGuess ?? slug).trim() || slug
        const seed = (vh.scenarioSeedNl ?? `Je herhaalt dit straks in het echt: ${polish.slice(0, 100)}`).slice(0, 200)
        push({
          id: stepId(),
          kind: 'mini_scenario',
          captureId: row.id,
          scenarioSlug: scen,
          seedLine: seed,
          prompt: 'Mini follow-up rep: one exchange using your improved line.',
        })
      }
      if (mode !== 'quick_rep') {
        push({
          id: stepId(),
          kind: 'coach_debrief',
          captureId: row.id,
          summary: (vh.coachSeedNl ?? polish).slice(0, 400),
          prompt: 'Optional: jump to Language Coach with this voice-note thread as the focus.',
        })
      }
      break
    }
    default:
      break
  }
  return out
}

function pickStrongestNext(ordered: QuickCaptureRow[]): DayPracticeStep {
  const struggle = ordered.find((c) => c.captureType === 'log_struggle')
  const voice = ordered.find((c) => c.captureType === 'voice_note')
  const place = ordered.find((c) => c.captureType === 'add_place')
  const paste = ordered.find((c) => c.captureType === 'paste_text' || c.captureType === 'photo_text')
  const phrase = ordered.find((c) => c.captureType === 'save_phrase')
  const word = ordered.find((c) => c.captureType === 'save_word')
  const pick = struggle ?? voice ?? place ?? paste ?? phrase ?? word ?? ordered[0]!
  let prompt: string
  let actionLabel: string | undefined
  if (pick.captureType === 'log_struggle') {
    prompt =
      'Strongest next step: open Language Coach for three minutes on your hardest moment, then leave one sentence you will reuse.'
    actionLabel = 'Coach + one sentence'
  } else if (pick.captureType === 'voice_note') {
    prompt = 'Strongest next step: record a 20-second voice reply in Dutch using your polished line from the reps above.'
    actionLabel = 'Voice reply'
  } else if (pick.captureType === 'add_place') {
    prompt = 'Strongest next step: next visit, say your opener out loud once before you walk in — no perfection required.'
    actionLabel = 'Real-world opener'
  } else if (pick.captureType === 'paste_text' || pick.captureType === 'photo_text') {
    prompt =
      'Strongest next step: pick your anchor line from this text and use it once today — written message or spoken aloud.'
    actionLabel = 'Anchor line once'
  } else if (pick.captureType === 'save_phrase') {
    prompt = 'Strongest next step: drop your saved phrase into one real conversation today — even a short chat counts.'
    actionLabel = 'Phrase in the wild'
  } else if (pick.captureType === 'save_word') {
    prompt = 'Strongest next step: use your word once in a real sentence today (chat or aloud).'
    actionLabel = 'Use in the wild'
  } else {
    prompt =
      'Strongest next step: pick one phrase from this pack and use it intentionally in your next Dutch interaction.'
    actionLabel = 'One intentional use'
  }
  return {
    id: stepId(),
    kind: 'strongest_next',
    captureId: pick.id,
    prompt,
    actionLabel,
  }
}

export function buildPersonalizedDayPracticePack(params: {
  localDate: string
  captures: QuickCaptureRow[]
  themeClusters: readonly DailyCaptureCluster[]
  /** Flat priority order from daily bundle (optional). */
  bundleCaptureIds?: readonly string[] | null
  mode?: PracticePackMode
}): DayPracticePackContent {
  const mode: PracticePackMode = params.mode ?? 'standard'
  const budget = modeBudget(mode)
  const idSet = new Set(params.captures.map((c) => c.id))
  const touching = clustersTouchingCaptures(params.themeClusters, idSet)
  const topClusters = touching.slice(0, budget.maxThemeAnchors)
  const orderedFromClusters: QuickCaptureRow[] = []
  const seen = new Set<string>()
  const byId = new Map(params.captures.map((c) => [c.id, c]))
  for (const cl of topClusters) {
    for (const id of cl.relatedCaptureIds) {
      const c = byId.get(id)
      if (c && !seen.has(id)) {
        orderedFromClusters.push(c)
        seen.add(id)
      }
    }
  }
  for (const c of params.captures) {
    if (!seen.has(c.id)) orderedFromClusters.push(c)
  }
  const orderedCaptures =
    topClusters.length > 0
      ? orderedFromClusters
      : orderCapturesForPack(params.captures, params.bundleCaptureIds ?? null)

  const steps: DayPracticeStep[] = []
  steps.push({ id: stepId(), kind: 'pack_meta', mode })
  steps.push(
    buildRecap({
      localDate: params.localDate,
      orderedCaptures,
      topClusters,
      mode,
      estimatedMinutes: budget.estimatedMinutes,
    }),
  )

  let repCount = 0
  const perCaptureReps = new Map<string, number>()

  let anchorsAdded = 0
  for (const cl of topClusters) {
    if (anchorsAdded >= budget.maxThemeAnchors) break
    const rep = cl.relatedCaptureIds.map((id) => byId.get(id)).find(Boolean)
    if (!rep) continue
    steps.push({
      id: stepId(),
      kind: 'theme_anchor',
      captureId: rep.id,
      themeTitle: cl.title,
      prompt: cl.summary,
    })
    anchorsAdded += 1
  }

  const repKey = (s: DayPracticeStep) => {
    if (!isRepStep(s) || !('captureId' in s)) return ''
    return `${s.kind}:${s.captureId}`
  }
  const repSeen = new Set<string>()

  outer: for (const c of orderedCaptures) {
    const used = perCaptureReps.get(c.id) ?? 0
    const room = budget.maxRepsPerCapture - used
    if (room <= 0) continue
    const generated = repStepsForCapture(c, mode, room)
    for (const s of generated) {
      if (!isRepStep(s)) continue
      const k = repKey(s)
      if (repSeen.has(k)) continue
      if (repCount >= budget.maxRepSteps) break outer
      repSeen.add(k)
      steps.push(s)
      repCount += 1
      perCaptureReps.set(c.id, (perCaptureReps.get(c.id) ?? 0) + 1)
    }
  }

  // If we still have rep budget (e.g. no clusters), walk captures again with remaining slots
  if (repCount < budget.maxRepSteps) {
    for (const c of orderedCaptures) {
      if (repCount >= budget.maxRepSteps) break
      const used = perCaptureReps.get(c.id) ?? 0
      if (used >= budget.maxRepsPerCapture) continue
      const generated = repStepsForCapture(c, mode, budget.maxRepsPerCapture - used)
      for (const s of generated) {
        if (!isRepStep(s)) continue
        if (repCount >= budget.maxRepSteps) break
        const k = repKey(s)
        if (repSeen.has(k)) continue
        repSeen.add(k)
        steps.push(s)
        repCount += 1
        perCaptureReps.set(c.id, (perCaptureReps.get(c.id) ?? 0) + 1)
      }
    }
  }

  steps.push(pickStrongestNext(orderedCaptures))

  const captureIds = [...new Set(orderedCaptures.map((c) => c.id))]

  return {
    localDate: params.localDate,
    title: titleForMode(mode),
    mode,
    estimatedMinutes: budget.estimatedMinutes,
    steps: steps.length ? steps : [],
    captureIds,
  }
}
