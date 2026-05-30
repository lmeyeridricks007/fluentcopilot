import type { ListeningClip, ListeningDrillType, ListeningLevel } from '@/lib/listening-mode/schema'
import { LISTENING_PACKS } from '@/lib/listening-mode/catalog'
import type { ListeningLearnerProfile } from '@/lib/listening-mode/listeningProfileStorage'
import { LISTENING_PROFILE_DIMENSIONS, type ListeningProfileDimension } from '@/lib/listening-mode/listeningSkillModel'
import { listeningTopRecommendations } from '@/lib/listening-mode/listeningRecommendations'
import { effectiveSpeechRate } from '@/lib/listening-mode/listeningLevelRules'
import {
  adaptCoachCopyForLevel,
  impliedContextHintEn,
  levelScenarioSubtitle,
  listeningLevelContentBand,
} from '@/lib/listening-mode/listeningLevelContentRules'
import { humanizeListeningProfileDimension, pickWeakestDimension } from '@/lib/listening-mode/listeningSessionResolve'
import type {
  ListeningDetailDrillPayload,
  ListeningDrillAnswerOption,
  ListeningDrillPayload,
  ListeningDrillPayloadKind,
  ListeningFastSpeechDrillPayload,
  ListeningGistDrillPayload,
  ListeningInstructionDrillPayload,
  ListeningListenRespondDrillPayload,
  ListeningPersonalizedFocusDrillPayload,
  ListeningTtsAudio,
} from '@/lib/listening-mode/listeningDrillPayloadTypes'
import { resolveListeningMcqFromClip } from '@/lib/listening-mode/listeningMcqByLevel'

export type ListeningDrillPayloadBuildContext = {
  packId?: string | null
  profile?: ListeningLearnerProfile | null
  /** Override auto-derived copy for weak-area drills. */
  personalizedReasonEn?: string | null
  /**
   * Stable seed for shuffling MCQ tap order (Fisher–Yates + mulberry32).
   * Pass e.g. hash(sessionId + clipId) so order stays fixed for the clip but is not always “first option correct”.
   */
  mcqOrderSeed?: number
}

export function mapClipDrillTypeToPayloadKind(drillType: ListeningDrillType): ListeningDrillPayloadKind {
  switch (drillType) {
    case 'gist':
    case 'replay_reveal':
      return 'gist'
    case 'detail_catch':
      return 'detail'
    case 'listen_respond':
      return 'listen_respond'
    case 'order_instruction':
      return 'instruction'
    case 'fast_dutch':
      return 'fast_speech'
    case 'weak_area':
      return 'personalized_focus'
  }
}

function scenarioLabelFromId(scenarioId: string): string {
  return scenarioId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

function ttsBlock(clip: ListeningClip, sessionLevel: ListeningLevel, rateOffset = 0): ListeningTtsAudio {
  const rate = Math.max(0.72, Math.min(1.12, effectiveSpeechRate(sessionLevel, clip.speechRate) + rateOffset))
  return { mode: 'tts', linesNl: clip.speakLinesNl, rate }
}

/** Deterministic 32-bit FNV-1a — stable seeds from strings (never 0). */
export function listeningMcqOrderSeedFromString(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return (h >>> 0) || 1
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** `order[i]` = original option index shown at tap position `i` after shuffle. */
function shuffleOriginalIndices(orderLength: number, seed: number): number[] {
  const order = Array.from({ length: orderLength }, (_, i) => i)
  const rand = mulberry32(seed)
  for (let i = orderLength - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

function mcqFromClip(clip: ListeningClip, sessionLevel: ListeningLevel, orderSeed: number) {
  const { optionLabels, correctIndex } = resolveListeningMcqFromClip(clip, sessionLevel)
  const n = optionLabels.length
  if (n < 2) {
    const answerOptions = optionLabels.map((label, i) => ({ id: `opt-${i}`, label }))
    return { answerOptions, correctAnswerId: `opt-${Math.min(correctIndex, Math.max(0, n - 1))}` }
  }
  const order = shuffleOriginalIndices(n, orderSeed)
  const answerOptions = order.map((origIdx, newIdx) => ({
    id: `opt-${newIdx}`,
    label: optionLabels[origIdx],
  }))
  const correctNewIndex = order.indexOf(correctIndex)
  const correctAnswerId = `opt-${correctNewIndex}`
  return { answerOptions, correctAnswerId }
}

function splitInstructionSteps(transcriptNl: string): string[] {
  return transcriptNl
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8)
}

function reducedNaturalSpeechNote(clip: ListeningClip, sessionLevel: ListeningLevel): string | null {
  const tagStr = clip.listeningTags.join(' ').toLowerCase()
  if (tagStr.includes('reduced_speech') || tagStr.includes('reduced')) {
    return adaptCoachCopyForLevel(
      'Natural Dutch often drops the subject in quick counter speech — use stressed words (melk, halfvol, lactosevrij) as anchors.',
      sessionLevel,
      360,
    )
  }
  if (listeningLevelContentBand(sessionLevel).tier === 'stretch') {
    return adaptCoachCopyForLevel(
      'At this level, listen for compression: fewer function words, same practical intent.',
      sessionLevel,
      280,
    )
  }
  return null
}

function promptWithLevelCue(base: string, sessionLevel: ListeningLevel): string {
  const hint = impliedContextHintEn(sessionLevel)
  if (sessionLevel === 'B1' && hint) return `${base} ${hint}`
  if (sessionLevel === 'A1') return adaptCoachCopyForLevel(base, sessionLevel, 140)
  return base
}

function buildGist(clip: ListeningClip, sessionLevel: ListeningLevel, orderSeed: number): ListeningGistDrillPayload {
  const { answerOptions: acceptableAnswers, correctAnswerId } = mcqFromClip(clip, sessionLevel, orderSeed)
  const playbackCoachNoteEn =
    clip.drillType === 'replay_reveal'
      ? 'Premium flow: one honest first listen, then lock an answer — slower replay + transcript unlock afterward.'
      : null
  return {
    clipId: clip.id,
    scenarioId: clip.scenarioId,
    sessionLevel,
    clipAuthoredLevel: clip.level,
    sourceDrillType: clip.drillType,
    kind: 'gist',
    audio: ttsBlock(clip, sessionLevel),
    scenarioLabel: `${scenarioLabelFromId(clip.scenarioId)} · ${levelScenarioSubtitle(sessionLevel)}`,
    questionPrompt: promptWithLevelCue(clip.instructionEn, sessionLevel),
    acceptableAnswers,
    correctAnswerId,
    explanation: adaptCoachCopyForLevel(clip.meaningEn, sessionLevel),
    playbackCoachNoteEn,
  }
}

function buildDetail(clip: ListeningClip, sessionLevel: ListeningLevel, orderSeed: number): ListeningDetailDrillPayload {
  const { answerOptions, correctAnswerId } = mcqFromClip(clip, sessionLevel, orderSeed)
  const facet = clip.detailFacet ?? 'other'
  const band = listeningLevelContentBand(sessionLevel)
  return {
    clipId: clip.id,
    scenarioId: clip.scenarioId,
    sessionLevel,
    clipAuthoredLevel: clip.level,
    sourceDrillType: clip.drillType,
    kind: 'detail',
    audio: ttsBlock(clip, sessionLevel),
    scenarioLabel: scenarioLabelFromId(clip.scenarioId),
    detailTargets: [
      {
        id: 'primary',
        facet,
        promptEn: promptWithLevelCue(clip.instructionEn, sessionLevel),
        anchorNl: band.tier === 'foundational' ? null : clip.speakLinesNl[0]?.slice(0, 28) ?? null,
      },
    ],
    answerMode: 'mcq',
    answerOptions,
    correctAnswerId,
    revealExplanations: {
      summaryEn: adaptCoachCopyForLevel(clip.meaningEn, sessionLevel),
      transcriptNl: clip.transcriptNl,
    },
  }
}

function buildListenRespond(clip: ListeningClip, sessionLevel: ListeningLevel, orderSeed: number): ListeningListenRespondDrillPayload {
  const { answerOptions: acceptableShortResponses, correctAnswerId } = mcqFromClip(clip, sessionLevel, orderSeed)
  const band = listeningLevelContentBand(sessionLevel)
  const whatYouShouldSayNextEn =
    band.serviceNaturalness === 'plain'
      ? 'Give a short, polite Dutch reply that fits what you heard.'
      : band.serviceNaturalness === 'compressed'
        ? 'Answer in compact service Dutch — drop extras, keep tone warm.'
        : 'Give a short natural reply a Dutch speaker would use here.'
  return {
    clipId: clip.id,
    scenarioId: clip.scenarioId,
    sessionLevel,
    clipAuthoredLevel: clip.level,
    sourceDrillType: clip.drillType,
    kind: 'listen_respond',
    audio: ttsBlock(clip, sessionLevel),
    scenarioLabel: scenarioLabelFromId(clip.scenarioId),
    taskPromptEn: promptWithLevelCue(clip.instructionEn, sessionLevel),
    whatYouShouldSayNextEn,
    acceptableShortResponses,
    correctAnswerId,
    coachExplanation: adaptCoachCopyForLevel(clip.meaningEn, sessionLevel),
  }
}

function buildInstruction(clip: ListeningClip, sessionLevel: ListeningLevel, orderSeed: number): ListeningInstructionDrillPayload {
  const { answerOptions, correctAnswerId } = mcqFromClip(clip, sessionLevel, orderSeed)
  const steps = splitInstructionSteps(clip.transcriptNl)
  const band = listeningLevelContentBand(sessionLevel)
  const trimmedSteps = band.tier === 'foundational' ? steps.slice(0, 2) : steps
  return {
    clipId: clip.id,
    scenarioId: clip.scenarioId,
    sessionLevel,
    clipAuthoredLevel: clip.level,
    sourceDrillType: clip.drillType,
    kind: 'instruction',
    audio: ttsBlock(clip, sessionLevel),
    scenarioLabel: scenarioLabelFromId(clip.scenarioId),
    questionPromptEn: promptWithLevelCue(clip.instructionEn, sessionLevel),
    sequenceStepsNl: trimmedSteps.length ? trimmedSteps : [clip.transcriptNl],
    nextActionTargetEn: adaptCoachCopyForLevel(clip.meaningEn, sessionLevel, 220),
    answerOptions,
    correctAnswerId,
    revealExplanation: adaptCoachCopyForLevel(
      'After you answer, reveal the transcript to check word order for multi-step instructions.',
      sessionLevel,
    ),
  }
}

function buildFastSpeech(clip: ListeningClip, sessionLevel: ListeningLevel, orderSeed: number): ListeningFastSpeechDrillPayload {
  const { answerOptions, correctAnswerId } = mcqFromClip(clip, sessionLevel, orderSeed)
  const normal = ttsBlock(clip, sessionLevel, 0.06)
  const slower = ttsBlock(clip, sessionLevel, -0.14)
  const focus: 'gist' | 'detail' =
    clip.listeningTags.includes('key_details') || clip.detailFacet ? 'detail' : 'gist'
  return {
    clipId: clip.id,
    scenarioId: clip.scenarioId,
    sessionLevel,
    clipAuthoredLevel: clip.level,
    sourceDrillType: clip.drillType,
    kind: 'fast_speech',
    audio: normal,
    slowerAudio: slower,
    scenarioLabel: scenarioLabelFromId(clip.scenarioId),
    target: {
      focus,
      promptEn: promptWithLevelCue(clip.instructionEn, sessionLevel),
    },
    answerOptions,
    correctAnswerId,
    explanation: adaptCoachCopyForLevel(clip.meaningEn, sessionLevel),
    reducedNaturalSpeechExplanationEn: reducedNaturalSpeechNote(clip, sessionLevel),
  }
}

function emptyProfileForRecs(): ListeningLearnerProfile {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    dimensionStress: Object.fromEntries(LISTENING_PROFILE_DIMENSIONS.map((d) => [d, 0.35])) as Record<
      ListeningProfileDimension,
      number
    >,
    sessionIds: [],
  }
}

function resolveNextLoop(
  packId: string | undefined,
  profile: ListeningLearnerProfile | null | undefined,
  sessionLevel: ListeningLevel,
) {
  const p = profile ?? emptyProfileForRecs()
  const recs = listeningTopRecommendations(p, { excludePackId: packId ?? undefined, level: sessionLevel })
  const first = recs[0]
  if (first) {
    return { title: first.title, rationale: first.reason, packId: first.packId }
  }
  const fallback = LISTENING_PACKS.find((x) => x.id !== packId) ?? LISTENING_PACKS[0]
  return {
    title: fallback.title,
    rationale: 'Keep variety with another short burst.',
    packId: fallback.id,
  }
}

function buildPersonalized(
  clip: ListeningClip,
  sessionLevel: ListeningLevel,
  ctx: ListeningDrillPayloadBuildContext | undefined,
  orderSeed: number,
): ListeningPersonalizedFocusDrillPayload {
  const { answerOptions: acceptableAnswers, correctAnswerId } = mcqFromClip(clip, sessionLevel, orderSeed)
  const profile = ctx?.profile ?? null
  const weakest = profile ? pickWeakestDimension(profile.dimensionStress) : null
  const weaknessLabel = weakest ? humanizeListeningProfileDimension(weakest) : 'listening focus'
  const reason =
    ctx?.personalizedReasonEn?.trim() ||
    (weakest
      ? `We surfaced this clip because ${weaknessLabel} has been a recurring pinch in your local listening profile.`
      : 'Extra targeted rep to keep your ear honest on short Dutch bursts.')
  const next = resolveNextLoop(ctx?.packId ?? undefined, profile, sessionLevel)
  const selectedClips = [
    {
      clipId: clip.id,
      scenarioLabel: scenarioLabelFromId(clip.scenarioId),
      kind: 'personalized_focus' as const,
    },
  ]
  return {
    clipId: clip.id,
    scenarioId: clip.scenarioId,
    sessionLevel,
    clipAuthoredLevel: clip.level,
    sourceDrillType: clip.drillType,
    kind: 'personalized_focus',
    audio: ttsBlock(clip, sessionLevel),
    scenarioLabel: scenarioLabelFromId(clip.scenarioId),
    reasonThisSurfacedEn: adaptCoachCopyForLevel(reason, sessionLevel, 320),
    weaknessTarget: { label: weaknessLabel, dimension: weakest },
    selectedClips,
    nextLoopRecommendation: next,
    questionPrompt: promptWithLevelCue(clip.instructionEn, sessionLevel),
    acceptableAnswers,
    correctAnswerId,
    explanation: adaptCoachCopyForLevel(clip.meaningEn, sessionLevel),
  }
}

/**
 * Canonical builder: one typed payload per clip for premium session UX + downstream APIs.
 */
/** Normalized MCQ options for session UI (all drill kinds use id+label answers). */
export function drillAnswerOptions(p: ListeningDrillPayload): ListeningDrillAnswerOption[] {
  switch (p.kind) {
    case 'gist':
      return p.acceptableAnswers
    case 'detail':
      return p.answerOptions
    case 'listen_respond':
      return p.acceptableShortResponses
    case 'instruction':
      return p.answerOptions
    case 'fast_speech':
      return p.answerOptions
    case 'personalized_focus':
      return p.acceptableAnswers
  }
}

export function drillCorrectAnswerId(p: ListeningDrillPayload): string {
  switch (p.kind) {
    case 'gist':
      return p.correctAnswerId
    case 'detail':
      return p.correctAnswerId
    case 'listen_respond':
      return p.correctAnswerId
    case 'instruction':
      return p.correctAnswerId
    case 'fast_speech':
      return p.correctAnswerId
    case 'personalized_focus':
      return p.correctAnswerId
  }
}

/** Post-reveal coach copy (English) — unified for “What it meant”. */
export function drillCoachRevealText(p: ListeningDrillPayload): string {
  switch (p.kind) {
    case 'gist':
      return p.explanation
    case 'detail':
      return p.revealExplanations.summaryEn
    case 'listen_respond':
      return p.coachExplanation
    case 'instruction':
      return `${p.revealExplanation} ${p.nextActionTargetEn}`.trim()
    case 'fast_speech':
      return p.explanation
    case 'personalized_focus':
      return p.explanation
  }
}

export function drillPrimaryPrompt(p: ListeningDrillPayload): string {
  switch (p.kind) {
    case 'gist':
      return p.questionPrompt
    case 'detail':
      return p.detailTargets[0]?.promptEn ?? p.revealExplanations.summaryEn
    case 'listen_respond':
      return p.taskPromptEn
    case 'instruction':
      return p.questionPromptEn
    case 'fast_speech':
      return p.target.promptEn
    case 'personalized_focus':
      return p.questionPrompt
  }
}

function resolveMcqOrderSeed(
  clip: ListeningClip,
  sessionLevel: ListeningLevel,
  ctx?: ListeningDrillPayloadBuildContext,
): number {
  return ctx?.mcqOrderSeed ?? listeningMcqOrderSeedFromString(`${clip.id}:${sessionLevel}:${ctx?.packId ?? ''}`)
}

export function buildListeningDrillPayload(
  clip: ListeningClip,
  sessionLevel: ListeningLevel,
  ctx?: ListeningDrillPayloadBuildContext,
): ListeningDrillPayload {
  const orderSeed = resolveMcqOrderSeed(clip, sessionLevel, ctx)
  const kind = mapClipDrillTypeToPayloadKind(clip.drillType)
  switch (kind) {
    case 'gist':
      return buildGist(clip, sessionLevel, orderSeed)
    case 'detail':
      return buildDetail(clip, sessionLevel, orderSeed)
    case 'listen_respond':
      return buildListenRespond(clip, sessionLevel, orderSeed)
    case 'instruction':
      return buildInstruction(clip, sessionLevel, orderSeed)
    case 'fast_speech':
      return buildFastSpeech(clip, sessionLevel, orderSeed)
    case 'personalized_focus':
      return buildPersonalized(clip, sessionLevel, ctx, orderSeed)
  }
}
