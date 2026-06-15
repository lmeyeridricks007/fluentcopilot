/**
 * Training Loop Generation Engine — FluentCopilot post-session drill selection.
 *
 * Pipeline: normalize context → generate raw candidates → score (session + memory + modality + duration + novelty + report alignment) → sort → rank/select with anti-spam.
 */
import type { SessionLearningInsights } from '../learningMemory/sessionLearningInsightTypes'
import type { UserLearningProfile } from '../learningMemory/userLearningProfileDocument'
import type { LiveSessionEvaluation, RecommendedAction, TurnEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import type { ReadAloudEvaluateResult } from '../../services/read-aloud/readAloudEvaluateTypes'
import { LANGUAGE_COACH_SCENARIO_SLUG } from '../speakLive/languageCoachSessionTypes'
import { normalizeWordKey } from '../learningMemory/learningInsightNormalization'
import { newId } from '../../shared/ids'
import type { SkillId } from '../skills/skillTypes'
import type {
  PersonalizedTrainingLoop,
  TrainingLoopCandidate,
  TrainingLoopCandidateSummary,
  TrainingLoopConfidence,
  TrainingLoopDifficulty,
  TrainingLoopGenerationDebug,
  TrainingLoopPracticeNowBundle,
  TrainingLoopSourceType,
  TrainingLoopStatus,
  TrainingLoopType,
} from './trainingLoopTypes'
import {
  buildListeningPersonalizedLoopPayload,
  buildMiniScenarioPayload,
  buildPronunciationDrillPayload,
  buildQuestionDrillPayload,
  buildReadAloudFixPayload,
  buildRetrySentencePayload,
  buildStorytellingDrillPayload,
  buildStructureDrillPayload,
  buildWeakWordsPayload,
} from './trainingLoopPayloadBuilders'
import { speakLiveComprehensionWeakForListeningLoops } from './speakLiveComprehensionSignals'
import { detectScenarioContentTheme } from './sessionAdapters/liveScenarioLoopAdapter'
import type { SessionLoopAdapterHints } from './sessionAdapters/sessionLoopAdapterTypes'
import { resolveSessionLoopAdapterHints } from './sessionAdapters/resolveSessionLoopAdapterHints'
import { DISMISSED_LOOP_TYPE_PENALTY_DAYS } from './trainingLoopLifecycleConstants'
import {
  buildWrongWordCorrectionMap,
  resolveWordPracticeTargets,
} from './weakWordPracticeTargets'

export type LoopGenerationInput = {
  userId: string
  sourceSessionId: string
  threadId: string | null
  scenarioId: string | null
  scenarioSlug: string | null
  sessionType: 'speak_live' | 'text_conversation' | 'read_aloud' | 'listening' | 'quick_capture'
  insights: SessionLearningInsights
  profile: UserLearningProfile
  speakLiveEvaluation: LiveSessionEvaluation | null
  readAloudResult: ReadAloudEvaluateResult | null
  /** Present when {@link sessionType} is `listening` — anchors pack + replay keys for payloads. */
  listeningSessionMeta?: {
    packId: string
    level: string
    scenarioKey: string | null
    missedClipIds: string[]
  } | null
}

export type RecentLoopDedupeRow = {
  dedupeKey: string | null
  loopType: TrainingLoopType
  status: TrainingLoopStatus
  createdAt: string
  /** Parsed from persistence for novelty / near-duplicate checks. */
  targetWeaknessKeys?: string[]
}

/** Explainable sub-scores (0–100 scale after composition). */
export type CandidateScoreComponents = {
  base: number
  sessionSignal: number
  memoryRecurrence: number
  modalityFit: number
  durationFit: number
  reportAlignment: number
  noveltyPenalty: number
  dismissedLoopPenalty: number
  overloadAdjust: number
  adapterBoost: number
}

export type LoopGenerationContext = {
  input: LoopGenerationInput
  source: TrainingLoopSourceType
  allow: Set<TrainingLoopType>
  adapterHints: SessionLoopAdapterHints
  easyBias: boolean
  stretchOk: boolean
  weakWordsSorted: SessionLearningInsights['weakWords']
  topWords: string[]
  wKeys: string[]
  topWeakestSkill: SkillId | null
  primaryRecoLoopType: TrainingLoopType | null
  primaryRecoReason: string | null
  hesitationStrong: boolean
  focusAreaLabel: string | null
}

const MS_DAY = 86_400_000

export function resolveTrainingLoopSourceType(params: {
  sessionType: LoopGenerationInput['sessionType']
  scenarioSlug: string | null
}): TrainingLoopSourceType {
  if (params.sessionType === 'quick_capture') return 'quick_capture'
  if (params.sessionType === 'read_aloud') return 'read_aloud'
  if (params.sessionType === 'text_conversation') return 'chat'
  if (params.sessionType === 'listening') return 'listening'
  const slug = (params.scenarioSlug ?? '').toLowerCase().replace(/-/g, '_')
  if (slug === LANGUAGE_COACH_SCENARIO_SLUG) return 'coach'
  return 'scenario'
}

function profileOverload(doc: UserLearningProfile, insights: SessionLearningInsights): boolean {
  const w = insights.weakWords.length + insights.weakPatterns.length + insights.pronunciationIssues.length
  if (w >= 8) return true
  if ((doc.weakVocabulary?.length ?? 0) + (doc.weakGrammarPatterns?.length ?? 0) > 28) return true
  return false
}

function profileStretchOk(doc: UserLearningProfile, insights: SessionLearningInsights): boolean {
  if (insights.strengths.length >= 3 && insights.weakWords.length <= 2) return true
  const sp = insights.scenarioPerformance
  if (sp?.rollingScore != null && sp.rollingScore >= 78) return true
  if ((doc.totalSessionsObserved ?? 0) >= 8 && insights.weakWords.length <= 2) return true
  return false
}

export function pickRetryTurnFromEvaluation(evaluation: LiveSessionEvaluation | null): TurnEvaluation | null {
  if (!evaluation?.turnEvaluations?.length) return null
  const turns = evaluation.turnEvaluations.filter((t) => (t.learnerTranscript ?? '').trim().length > 2)
  if (!turns.length) return null
  const scored = turns.map((t) => {
    const dims = t.dimensions ?? []
    const nat = dims.find((d) => /natural|fluency|grammar/i.test(d.label ?? ''))
    const score = typeof nat?.score === 'number' ? nat.score : 55
    const hasRw = Boolean(t.naturalRewrite?.improved && t.naturalRewrite?.original)
    return { t, score: hasRw ? score - 12 : score }
  })
  scored.sort((a, b) => a.score - b.score)
  return scored[0]?.t ?? null
}

export function buildDedupeKey(type: TrainingLoopType, keys: string[], extra?: string): string {
  const k = [...keys].map((x) => x.trim().toLowerCase()).filter(Boolean).sort().join('|')
  const tail = (extra ?? '').slice(0, 80).trim().toLowerCase()
  return `${type}:${k}:${tail}`
}

function mapSkillIdsForLoop(loopType: TrainingLoopType, source: TrainingLoopSourceType): string[] {
  if (source === 'quick_capture' && loopType === 'weak_words') {
    return ['vocabulary', 'pronunciation', 'natural_dutch']
  }
  if (source === 'quick_capture' && (loopType === 'retry_sentence' || loopType === 'read_aloud_fix')) {
    return ['natural_dutch', 'sentence_structure', 'pronunciation']
  }
  if (source === 'quick_capture' && loopType === 'mini_scenario') {
    return ['fluency', 'response_readiness', 'keeping_flow']
  }
  if (source === 'quick_capture' && loopType === 'question_drill') {
    return ['asking_questions', 'follow_up_questions', 'repair_clarification']
  }
  if (loopType === 'listening_burst') return ['gist_understanding', 'detail_recognition']
  if (loopType === 'missed_detail_retry') return ['detail_recognition', 'numbers_and_times']
  if (loopType === 'fast_speech_burst') return ['fast_speech_handling', 'reduced_spoken_dutch']
  if (loopType === 'listen_and_reply') return ['response_readiness', 'service_replies']
  if (loopType === 'route_detail_drill') return ['route_words', 'detail_recognition']
  if (loopType === 'number_time_drill') return ['numbers_and_times', 'quantities_and_items']
  if (loopType === 'question_drill') return ['asking_questions', 'follow_up_questions']
  if (loopType === 'pronunciation_drill') return ['pronunciation', 'fluency']
  if (loopType === 'read_aloud_fix' || loopType === 'weak_words') return ['pronunciation', 'pacing', 'fluency']
  if (loopType === 'storytelling_drill') return ['keeping_flow', 'fluency']
  if (loopType === 'structure_drill') return ['fluency', 'reacting', 'pacing']
  if (source === 'coach') return ['fluency', 'keeping_flow']
  return ['fluency', 'reacting']
}

export function weaknessKeysFromWords(words: string[]): string[] {
  return words.map((w) => normalizeWordKey(w)).filter(Boolean)
}

export function weaknessSignature(keys: string[]): string {
  return [...keys].map((x) => x.trim().toLowerCase()).filter(Boolean).sort().join('|')
}

function jaccardSimilarityKeys(a: string[], b: string[]): number {
  const sa = new Set(a.map((x) => x.trim().toLowerCase()).filter(Boolean))
  const sb = new Set(b.map((x) => x.trim().toLowerCase()).filter(Boolean))
  if (!sa.size && !sb.size) return 1
  if (!sa.size || !sb.size) return 0
  let inter = 0
  for (const x of sa) if (sb.has(x)) inter++
  const union = sa.size + sb.size - inter
  return union ? inter / union : 0
}

function mapActionTypeToLoopType(
  actionType: RecommendedAction['type'],
  allow: Set<TrainingLoopType>,
): TrainingLoopType | null {
  const candidates: TrainingLoopType[] = (() => {
    switch (actionType) {
      case 'pronunciation_drill':
        return ['pronunciation_drill']
      case 'rewrite_drill':
        return ['retry_sentence', 'structure_drill']
      case 'grammar_drill':
        return ['structure_drill']
      case 'save_words':
        return ['weak_words']
      case 'read_aloud':
        return ['read_aloud_fix']
      case 'speak_practice':
        return ['mini_scenario', 'pronunciation_drill']
      case 'next_scenario':
      case 'retry_scenario':
        return ['mini_scenario']
      case 'text_mode':
        return ['question_drill', 'structure_drill']
      default:
        return []
    }
  })()
  for (const lt of candidates) {
    if (allow.has(lt)) return lt
  }
  return null
}

function pickPrimaryRecommendedAction(evaluation: LiveSessionEvaluation | null): RecommendedAction | null {
  const actions = evaluation?.recommendedActions ?? []
  if (!actions.length) return null
  const prim = actions.filter((a) => a.priority === 'primary')
  return prim[0] ?? actions[0] ?? null
}

function weakWordsPayloadFromSessionWords(params: {
  topWords: string[]
  evaluation: LiveSessionEvaluation | null | undefined
  exampleSentences: string[]
  targetSkillIds: string[]
  referenceAudioUrls?: string[]
}) {
  const correctionMap = buildWrongWordCorrectionMap(params.evaluation)
  const resolved = resolveWordPracticeTargets(params.topWords, correctionMap)
  const practiceHints = resolved.map((r) => r.practiceHint ?? '')
  return buildWeakWordsPayload({
    words: resolved.map((r) => r.word),
    exampleSentences: params.exampleSentences,
    practiceHints: practiceHints.some((h) => h.length > 0) ? practiceHints : undefined,
    referenceAudioUrls: params.referenceAudioUrls,
    targetSkillIds: params.targetSkillIds,
  })
}

export function buildLoopGenerationContext(input: LoopGenerationInput): LoopGenerationContext {
  const source = resolveTrainingLoopSourceType({
    sessionType: input.sessionType,
    scenarioSlug: input.scenarioSlug,
  })
  const easyBias = profileOverload(input.profile, input.insights)
  const stretchOk = profileStretchOk(input.profile, input.insights)
  const weakWordsSorted = [...input.insights.weakWords].sort((a, b) => b.severityScore - a.severityScore)
  const correctionMap = buildWrongWordCorrectionMap(input.speakLiveEvaluation)
  const topWords = resolveWordPracticeTargets(
    weakWordsSorted.slice(0, 5).map((w) => w.displayText).filter(Boolean),
    correctionMap,
  ).map((r) => r.word)
  const wKeys = weaknessKeysFromWords(topWords)
  const sp = input.profile.userSkillProfile
  const topWeakestSkill = (sp?.weakestSkills?.[0] as SkillId | undefined) ?? null
  const hesProf = (input.profile.hesitationPatterns ?? []).slice().sort((a, b) => b.severityScore - a.severityScore)[0]
  const hesitationStrong =
    input.insights.hesitationIssues.length > 0 ||
    (hesProf != null && hesProf.severityScore >= 2 && (hesProf.occurrences ?? 0) >= 2)
  const adapterHints = resolveSessionLoopAdapterHints({
    input: {
      sessionType: input.sessionType,
      scenarioSlug: input.scenarioSlug,
      insights: input.insights,
      profile: input.profile,
      speakLiveEvaluation: input.speakLiveEvaluation,
      readAloudResult: input.readAloudResult,
    },
    source,
    hesitationStrong,
  })
  const allow = adapterHints.allowedLoopTypes
  const reco = pickPrimaryRecommendedAction(input.speakLiveEvaluation)
  const primaryRecoLoopType = reco ? mapActionTypeToLoopType(reco.type, allow) : null
  const primaryRecoReason = reco?.reason?.trim() ?? null
  const focusAreaLabel = input.speakLiveEvaluation?.focusArea?.label?.trim() ?? null
  return {
    input,
    source,
    allow,
    adapterHints,
    easyBias,
    stretchOk,
    weakWordsSorted,
    topWords,
    wKeys,
    topWeakestSkill,
    primaryRecoLoopType,
    primaryRecoReason,
    hesitationStrong,
    focusAreaLabel,
  }
}

function memoryRecurrenceBonus(profile: UserLearningProfile, keys: string[]): number {
  if (!keys.length) return 0
  const vocab = profile.weakVocabulary ?? []
  const grams = profile.weakGrammarPatterns ?? []
  const pron = profile.pronunciationIssues ?? []
  const hes = profile.hesitationPatterns ?? []
  let bonus = 0
  for (const k of keys) {
    const vk = vocab.find((v) => v.normalizedKey === k)
    if (vk && (vk.occurrences ?? 0) >= 2 && (vk.recoveryScore ?? 0) < 0.72) bonus += 5
    const gk = grams.find((g) => g.patternId === k)
    if (gk && (gk.occurrences ?? 0) >= 2) bonus += 4
    const pk = pron.find((p) => normalizeWordKey(p.targetKey) === k || p.targetKey.endsWith(k))
    if (pk && (pk.occurrences ?? 0) >= 2) bonus += 4
    const hk = hes.find((h) => h.patternId === k)
    if (hk && (hk.occurrences ?? 0) >= 2) bonus += 3
  }
  return Math.min(18, bonus)
}

function sessionSignalForCandidate(c: TrainingLoopCandidate, ctx: LoopGenerationContext): number {
  const { insights } = ctx.input
  let maxSev = 0
  const keys = new Set(c.targetWeaknessKeys.map((k) => k.trim().toLowerCase()).filter(Boolean))
  if (!keys.size && c.loopType === 'mini_scenario' && ctx.input.scenarioId) {
    const sp = insights.scenarioPerformance
    if (sp?.recentScore != null && sp.recentScore < 62) maxSev = Math.max(maxSev, 3)
    else if (sp?.rollingScore != null && sp.rollingScore < 65) maxSev = Math.max(maxSev, 2)
  }
  for (const w of insights.weakWords) {
    if (keys.has(w.normalizedKey.toLowerCase())) maxSev = Math.max(maxSev, w.severityScore)
  }
  for (const p of insights.weakPatterns) {
    if (keys.has(p.patternId.toLowerCase())) maxSev = Math.max(maxSev, p.severityScore)
  }
  for (const p of insights.pronunciationIssues) {
    const tail = normalizeWordKey(p.targetKey.split(':').pop() ?? p.targetKey)
    if (tail && keys.has(tail)) maxSev = Math.max(maxSev, p.severityScore)
  }
  for (const h of insights.hesitationIssues) {
    if (keys.has((h.patternId ?? '').toLowerCase())) maxSev = Math.max(maxSev, h.severityScore ?? 0)
  }
  for (const p of insights.weakPatterns) {
    const pid = (p.patternId ?? '').toLowerCase()
    if (pid.startsWith('listening:') && keys.has(pid)) maxSev = Math.max(maxSev, p.severityScore)
  }
  // Session-level headline: strongest fix from report
  if (ctx.focusAreaLabel && (c.loopType === 'structure_drill' || c.loopType === 'mini_scenario')) {
    maxSev = Math.max(maxSev, 2)
  }
  return Math.min(26, maxSev * 4)
}

function modalityFitScore(c: TrainingLoopCandidate, weakest: SkillId | null): number {
  if (!weakest) return 0
  const targets = new Set(c.targetSkills as SkillId[])
  if (targets.has(weakest)) return 12
  if (weakest === 'grammar' || weakest === 'sentence_structure') {
    if (c.loopType === 'structure_drill' || c.loopType === 'retry_sentence') return 10
  }
  if (weakest === 'pronunciation' && c.loopType === 'pronunciation_drill') return 12
  if ((weakest === 'asking_questions' || weakest === 'follow_up_questions') && c.loopType === 'question_drill')
    return 12
  if ((weakest === 'keeping_flow' || weakest === 'storytelling') && c.loopType === 'storytelling_drill') return 10
  if (weakest === 'pacing' && (c.loopType === 'read_aloud_fix' || c.loopType === 'structure_drill')) return 10
  return 0
}

function durationFitScore(estimatedMinutes: number): number {
  const m = Math.min(3, Math.max(0.25, estimatedMinutes))
  return Math.round((2.1 - m) * 4)
}

function noveltyPenaltyForType(loopType: TrainingLoopType, recent: RecentLoopDedupeRow[], now: number): number {
  const windowMs = 5 * MS_DAY
  let sameType = 0
  for (const r of recent) {
    if (r.status === 'dismissed') continue
    if (Date.parse(r.createdAt) < now - windowMs) continue
    if (r.loopType === loopType) sameType++
  }
  return Math.min(14, Math.max(0, sameType - 1) * 5)
}

/** Down-rank repeating the same drill family shortly after learner dismissed one. */
function dismissedLoopTypePenalty(loopType: TrainingLoopType, recent: RecentLoopDedupeRow[], now: number): number {
  const windowMs = DISMISSED_LOOP_TYPE_PENALTY_DAYS * MS_DAY
  let n = 0
  for (const r of recent) {
    if (r.status !== 'dismissed') continue
    if (r.loopType !== loopType) continue
    if (Date.parse(r.createdAt) < now - windowMs) continue
    n++
  }
  return Math.min(14, n * 5)
}

export function scoreTrainingLoopCandidate(
  c: TrainingLoopCandidate,
  ctx: LoopGenerationContext,
  recent: RecentLoopDedupeRow[],
  now: number,
): { score: number; components: CandidateScoreComponents } {
  const base = 38
  const sessionSignal = sessionSignalForCandidate(c, ctx)
  const memoryRecurrence = memoryRecurrenceBonus(ctx.input.profile, c.targetWeaknessKeys)
  const modalityFit = modalityFitScore(c, ctx.topWeakestSkill)
  const durationFit = durationFitScore(c.estimatedMinutes)
  let reportAlignment = 0
  if (ctx.primaryRecoLoopType && c.loopType === ctx.primaryRecoLoopType) reportAlignment += 15
  if (ctx.focusAreaLabel && c.loopType === 'structure_drill' && c.reason.includes(ctx.focusAreaLabel.slice(0, 24)))
    reportAlignment += 4
  const noveltyPenalty = noveltyPenaltyForType(c.loopType, recent, now)
  const dismissedLoopPenalty = dismissedLoopTypePenalty(c.loopType, recent, now)
  let overloadAdjust = 0
  if (ctx.easyBias) {
    overloadAdjust -= c.difficulty === 'stretch' ? 8 : 2
    if (c.loopType === 'weak_words' || c.loopType === 'pronunciation_drill') overloadAdjust += 3
  }
  const adapterBoost = ctx.adapterHints.preferredLoopTypesForSession.includes(c.loopType) ? 5 : 0
  let score = Math.round(
    base +
      sessionSignal +
      memoryRecurrence +
      modalityFit +
      durationFit +
      reportAlignment -
      noveltyPenalty -
      dismissedLoopPenalty +
      overloadAdjust +
      adapterBoost,
  )
  score = Math.max(28, Math.min(98, score))
  return {
    score,
    components: {
      base,
      sessionSignal,
      memoryRecurrence,
      modalityFit,
      durationFit,
      reportAlignment,
      noveltyPenalty,
      dismissedLoopPenalty,
      overloadAdjust,
      adapterBoost,
    },
  }
}

export function applyCandidateScoringModel(
  candidates: TrainingLoopCandidate[],
  ctx: LoopGenerationContext,
  recent: RecentLoopDedupeRow[],
  nowMs: number,
): void {
  const now = nowMs
  for (const c of candidates) {
    const { score, components } = scoreTrainingLoopCandidate(c, ctx, recent, now)
    c.priorityScore = score
    c.rankReason = `${c.rankReason} [sess+${components.sessionSignal} mem+${components.memoryRecurrence} mod+${components.modalityFit} dur+${components.durationFit} rep+${components.reportAlignment} nov-${components.noveltyPenalty} dis-${components.dismissedLoopPenalty} adp+${components.adapterBoost}]`
  }
}

function normalizedListeningLevel(profile: UserLearningProfile, fallback: string): string {
  const lv = (profile.levelEstimate ?? fallback).trim().toUpperCase()
  return lv === 'A1' || lv === 'A2' || lv === 'B1' ? lv : 'A2'
}

function listeningAnchorFromInput(input: LoopGenerationInput): {
  packId: string
  level: string
  scenarioKey: string | null
  missedClipIds: string[]
} {
  const m = input.listeningSessionMeta
  if (m) {
    const lv = (m.level ?? '').trim().toUpperCase()
    const level = lv === 'A1' || lv === 'A2' || lv === 'B1' ? lv : normalizedListeningLevel(input.profile, 'A2')
    return {
      packId: m.packId.trim() || 'pack-cafe-burst',
      level,
      scenarioKey: m.scenarioKey,
      missedClipIds: m.missedClipIds.filter(Boolean),
    }
  }
  const slug = `${input.scenarioId ?? ''} ${input.scenarioSlug ?? ''}`.toLowerCase()
  const pack = /train|station|ov|metro|bus|route|platform|spoor|tram/.test(slug) ? 'pack-train-platform' : 'pack-cafe-burst'
  const missed = input.insights.weakPatterns.flatMap((p) => p.evidenceRefs).slice(0, 4)
  return {
    packId: pack,
    level: normalizedListeningLevel(input.profile, 'A2'),
    scenarioKey: input.scenarioId,
    missedClipIds: missed,
  }
}

function pushListeningCandidate(
  out: TrainingLoopCandidate[],
  ctx: LoopGenerationContext,
  params: {
    loopType: TrainingLoopType
    title: string
    subtitle: string
    reason: string
    targetWeaknessKeys: string[]
    variation: string | null
    missedClipKeys: string[]
  },
): void {
  const { allow, source, easyBias } = ctx
  const input = ctx.input
  if (!allow.has(params.loopType)) return
  const anchor = listeningAnchorFromInput(input)
  const payload = buildListeningPersonalizedLoopPayload({
    packId: anchor.packId,
    level: anchor.level,
    scenarioKey: anchor.scenarioKey,
    variation: params.variation,
    missedClipKeys: params.missedClipKeys,
    listeningLoopKind: params.loopType,
  })
  out.push({
    sourceSessionId: input.sourceSessionId,
    threadId: input.threadId,
    sourceType: source,
    sourceScenarioId: input.scenarioId,
    loopSlot: 0,
    loopType: params.loopType,
    title: params.title,
    subtitle: params.subtitle,
    reason: params.reason,
    targetSkills: mapSkillIdsForLoop(params.loopType, source),
    targetWeaknessKeys: params.targetWeaknessKeys,
    estimatedMinutes: easyBias ? 0.55 : 0.85,
    difficulty: easyBias ? 'easy' : 'moderate',
    payload,
    confidence: params.missedClipKeys.length ? 'high' : 'medium',
    priorityScore: 0,
    dedupeKey: buildDedupeKey(params.loopType, params.targetWeaknessKeys, anchor.packId),
    rankReason: `Listening modality → ${params.loopType}.`,
  })
}

function buildListeningSessionCandidates(ctx: LoopGenerationContext): TrainingLoopCandidate[] {
  const input = ctx.input
  const patterns = new Set(input.insights.weakPatterns.map((p) => p.patternId))
  const anchor = listeningAnchorFromInput(input)
  const missed = anchor.missedClipIds
  const out: TrainingLoopCandidate[] = []

  if (patterns.has('listening:missed_detail') || missed.length) {
    pushListeningCandidate(out, ctx, {
      loopType: 'missed_detail_retry',
      title: 'Retry the missed details',
      subtitle: 'Same pack — lock concrete anchors on first listen.',
      reason: 'Concrete details moved quickly; a tight replay trains what you almost had.',
      targetWeaknessKeys: ['listening:missed_detail'],
      variation: null,
      missedClipKeys: missed.slice(0, 6),
    })
  }
  if (patterns.has('listening:number_time')) {
    pushListeningCandidate(out, ctx, {
      loopType: 'number_time_drill',
      title: 'Catch times & numbers',
      subtitle: 'Prices, quantities, and clock bits in polite bundles.',
      reason: 'Times and numbers hid in natural speech — isolate them with short bursts.',
      targetWeaknessKeys: ['listening:number_time'],
      variation: 'times',
      missedClipKeys: missed.slice(0, 3),
    })
  }
  if (patterns.has('listening:route_detail')) {
    pushListeningCandidate(out, ctx, {
      loopType: 'route_detail_drill',
      title: 'Route detail drill',
      subtitle: 'Platforms, transfers, and exits in real announcements.',
      reason: 'Route vocabulary moved quickly; rehearse one tight announcement style.',
      targetWeaknessKeys: ['listening:route_detail'],
      variation: 'route',
      missedClipKeys: missed.slice(0, 3),
    })
  }
  if (patterns.has('listening:fast_speech')) {
    pushListeningCandidate(out, ctx, {
      loopType: 'fast_speech_burst',
      title: 'Fast speech burst',
      subtitle: 'Counter-speed Dutch — honest first listen, then polish.',
      reason: 'Fast-speech clips were the friction point; short bursts rebuild reflexes.',
      targetWeaknessKeys: ['listening:fast_speech'],
      variation: 'fast',
      missedClipKeys: missed.slice(0, 3),
    })
  }
  if (patterns.has('listening:listen_reply')) {
    pushListeningCandidate(out, ctx, {
      loopType: 'listen_and_reply',
      title: 'Listen & reply',
      subtitle: 'Short service questions → natural one-beat answers.',
      reason: 'Practice the listen → answer rhythm you use live at counters and desks.',
      targetWeaknessKeys: ['listening:listen_reply'],
      variation: null,
      missedClipKeys: missed.slice(0, 3),
    })
  }
  pushListeningCandidate(out, ctx, {
    loopType: 'listening_burst',
    title: 'Listening burst',
    subtitle: 'Keep it short — same scenario lane while it is warm.',
    reason: 'Another compact burst keeps your ear honest without fatiguing focus.',
    targetWeaknessKeys: ['listening:burst'],
    variation: null,
    missedClipKeys: missed.slice(0, 3),
  })

  return out
}

function buildCrossModalityListeningCandidates(ctx: LoopGenerationContext): TrainingLoopCandidate[] {
  if (ctx.input.sessionType === 'listening') return []
  if (!speakLiveComprehensionWeakForListeningLoops(ctx.input.speakLiveEvaluation)) return []
  if (ctx.source !== 'coach' && ctx.source !== 'scenario') return []
  const input = ctx.input
  const theme = detectScenarioContentTheme(input.scenarioSlug)
  const transport = theme === 'transport'
  const packId = transport ? 'pack-train-platform' : 'pack-cafe-burst'
  const lv0 = (input.speakLiveEvaluation?.practicedLevel ?? input.profile.levelEstimate ?? 'A2').trim().toUpperCase()
  const level = lv0 === 'A1' || lv0 === 'A2' || lv0 === 'B1' ? lv0 : 'A2'
  const anchor = { packId, level, scenarioKey: input.scenarioId, missedClipIds: [] as string[] }
  const out: TrainingLoopCandidate[] = []
  const fakeInput: LoopGenerationInput = { ...input, listeningSessionMeta: anchor }
  const fakeCtx: LoopGenerationContext = { ...ctx, input: fakeInput }

  pushListeningCandidate(out, fakeCtx, {
    loopType: 'listen_and_reply',
    title: 'Ear check: listen & reply',
    subtitle: transport ? 'Short transport-style updates, then answer.' : 'Service counter prompts → quick Dutch replies.',
    reason:
      'Your last speaking session looked comprehension-heavy — a micro listening rep warms decoding before you speak again.',
    targetWeaknessKeys: ['listening:cross_modality', 'coach_comprehension_ear'],
    variation: transport ? 'route' : null,
    missedClipKeys: [],
  })
  pushListeningCandidate(out, fakeCtx, {
    loopType: 'listening_burst',
    title: 'Short listening burst',
    subtitle: 'Low-pressure decode before the next speak rep.',
    reason: 'Pair listening with weak comprehension signals so the next scenario feels less “blank on arrival”.',
    targetWeaknessKeys: ['listening:cross_modality'],
    variation: null,
    missedClipKeys: [],
  })
  return out
}

function buildQuickCaptureRawCandidates(ctx: LoopGenerationContext): TrainingLoopCandidate[] {
  const input = ctx.input
  const source: TrainingLoopSourceType = 'quick_capture'
  const { allow, topWords, wKeys, weakWordsSorted, easyBias } = ctx
  const insights = input.insights
  const out: TrainingLoopCandidate[] = []
  const learnerLine = (
    insights.weakWords[0]?.supportingText ??
    insights.weakWords[0]?.displayText ??
    insights.confidenceSummary
  ).trim()

  if (topWords.length >= 1 && allow.has('weak_words')) {
    const payload = weakWordsPayloadFromSessionWords({
      topWords: topWords.slice(0, 6),
      evaluation: input.speakLiveEvaluation,
      exampleSentences: weakWordsSorted
        .map((w) => w.supportingText ?? '')
        .filter((s) => s.trim().length > 4)
        .slice(0, 3),
      referenceAudioUrls: [],
      targetSkillIds: mapSkillIdsForLoop('weak_words', source),
    })
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'weak_words',
      title: 'Practice these weak words',
      subtitle: 'From your Quick Capture moments',
      reason: 'Words or phrases you saved from real life — short reps beat passive re-reading.',
      targetSkills: mapSkillIdsForLoop('weak_words', source),
      targetWeaknessKeys: wKeys.slice(0, 8),
      estimatedMinutes: easyBias ? 0.65 : 0.95,
      difficulty: easyBias ? 'easy' : 'moderate',
      payload,
      confidence: topWords.length >= 3 ? 'high' : 'medium',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('weak_words', wKeys),
      rankReason: 'Weak word signals from Quick Capture.',
    })
  }

  const wtn = insights.weakPatterns?.find((p) => p.patternId === 'qc_what_to_say_next')
  const corrected = wtn?.explanation?.trim()
  if (learnerLine && corrected && corrected !== learnerLine && allow.has('retry_sentence')) {
    const keys = weaknessKeysFromWords([learnerLine.slice(0, 48)])
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'retry_sentence',
      title: 'What to say next time',
      subtitle: 'Smoother line for the same moment',
      reason: 'Your capture included a clearer Dutch line for a similar situation — rehearse it aloud.',
      targetSkills: mapSkillIdsForLoop('retry_sentence', source),
      targetWeaknessKeys: keys,
      estimatedMinutes: 0.75,
      difficulty: 'moderate',
      payload: buildRetrySentencePayload({
        learnerOriginal: learnerLine.slice(0, 360),
        correctedVersion: corrected.slice(0, 360),
        explanationShort: 'Closer to what would sound natural on the spot.',
      }),
      confidence: 'medium',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('retry_sentence', keys, learnerLine),
      rankReason: 'What-to-say-next hint from Quick Capture.',
    })
  }

  const slug = (insights.scenarioPerformance?.scenarioSlug ?? input.scenarioSlug ?? 'train-station')
    .trim()
    .replace(/_/g, '-') || 'train-station'
  if (allow.has('mini_scenario')) {
    /**
     * `openingPrompt` surfaces under an "OPENING LINE" label on the practice card. Use the user's
     * own captured line directly (in their language) — DO NOT prefix it with English coach
     * meta-text (`Stay in the same real-life beat as your capture. Anchor: …`) because that is
     * what reads as a misleading "opening line" in the UI.
     */
    const anchorLine = learnerLine.slice(0, 200)
    const payload = buildMiniScenarioPayload({
      scenarioId: slug,
      objective:
        ctx.adapterHints.miniScenarioObjectiveOverride ??
        `Retry this situation (${slug.replace(/-/g, ' ')}).`,
      openingPrompt: anchorLine,
      expectedSkillFocus: mapSkillIdsForLoop('mini_scenario', source),
      supportingPhrase: insights.weakWords[0]?.displayText ?? null,
    })
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'mini_scenario',
      title: 'Retry this situation',
      subtitle: 'Mini scenario in the same domain',
      reason: 'Your capture clustered around this scenario family — one tight retry while it is fresh.',
      targetSkills: mapSkillIdsForLoop('mini_scenario', source),
      targetWeaknessKeys: [`scenario:${slug}`],
      estimatedMinutes: 1.2,
      difficulty: 'moderate',
      payload,
      confidence: 'medium',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('mini_scenario', [slug]),
      rankReason: 'Scenario domain from Quick Capture.',
    })
  }

  const passage = learnerLine
  if (passage.length > 28 && allow.has('read_aloud_fix')) {
    const payload = buildReadAloudFixPayload({
      passageText: passage,
      focusLabel: 'Read this from your day',
      targetWords: topWords.slice(0, 5),
      targetSounds: [],
      explanationShort: 'Slow read to stabilize wording you actually encountered.',
    })
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'read_aloud_fix',
      title: 'Read this from your day',
      subtitle: 'From a saved capture',
      reason: 'Accurate read of a line you chose — links recognition and pronunciation.',
      targetSkills: mapSkillIdsForLoop('read_aloud_fix', source),
      targetWeaknessKeys: wKeys.slice(0, 5),
      estimatedMinutes: 0.85,
      difficulty: 'easy',
      payload,
      confidence: 'medium',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('read_aloud_fix', wKeys, passage.slice(0, 48)),
      rankReason: 'Text capture → read-aloud stabilization.',
    })
  }

  if (insights.pronunciationIssues.length && topWords.length && allow.has('pronunciation_drill')) {
    const payload = buildPronunciationDrillPayload({
      words: topWords.slice(0, 5),
      targetSkillIds: mapSkillIdsForLoop('pronunciation_drill', source),
      soundFocus: 'chunk clarity',
    })
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'pronunciation_drill',
      title: 'Pronunciation touch-up',
      subtitle: 'Words you surfaced yourself',
      reason: 'Voice or high-salience words from Quick Capture — short pronunciation reps.',
      targetSkills: mapSkillIdsForLoop('pronunciation_drill', source),
      targetWeaknessKeys: wKeys.slice(0, 5),
      estimatedMinutes: 0.7,
      difficulty: 'easy',
      payload,
      confidence: 'medium',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('pronunciation_drill', wKeys),
      rankReason: 'Voice / pronunciation signal from capture.',
    })
  }

  if (insights.hesitationIssues.length && allow.has('question_drill')) {
    const payload = buildQuestionDrillPayload({
      prompts: ['Rehearse one follow-up you wished you had in that moment.'],
      exampleQuestions: ['Kunt u dat herhalen, alstublieft?', 'Wat bedoelt u precies?', 'Mag ik het anders zeggen?'],
      targetQuestionType: 'follow_up',
      scenarioContext: slug,
    })
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'question_drill',
      title: 'Questions under pressure',
      subtitle: 'Repair and clarify',
      reason: 'Your capture flagged hesitation asking or clarifying — quick question reps reduce freeze.',
      targetSkills: mapSkillIdsForLoop('question_drill', source),
      targetWeaknessKeys: ['quick_capture:questions'],
      estimatedMinutes: 0.8,
      difficulty: 'moderate',
      payload,
      confidence: 'medium',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('question_drill', ['quick_capture:questions']),
      rankReason: 'Hesitation / struggle tags from Quick Capture.',
    })
  }

  const listenSig = insights.weakPatterns?.some((p) => p.patternId === 'qc_modality:listening_pressure')
  if (listenSig && allow.has('listening_burst')) {
    const pack = /train|station|ov|metro|bus|route|platform|spoor|tram/.test(slug.toLowerCase())
      ? 'pack-train-platform'
      : 'pack-cafe-burst'
    const payload = buildListeningPersonalizedLoopPayload({
      packId: pack,
      level: 'A2',
      scenarioKey: slug,
      variation: 'quick_capture_followup',
      missedClipKeys: [],
      listeningLoopKind: 'listening_burst',
    })
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'listening_burst',
      title: 'Listen to this kind of reply',
      subtitle: 'Short burst in a matching context',
      reason: 'You noted trouble following spoken Dutch — pair capture memory with a low-stakes listen.',
      targetSkills: mapSkillIdsForLoop('listening_burst', source),
      targetWeaknessKeys: ['listening:quick_capture'],
      estimatedMinutes: 0.75,
      difficulty: 'easy',
      payload,
      confidence: 'medium',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('listening_burst', ['listening:quick_capture'], pack),
      rankReason: 'Listening pressure signal from capture.',
    })
  }

  return out
}

function buildRawCandidates(ctx: LoopGenerationContext): TrainingLoopCandidate[] {
  const input = ctx.input
  const { allow, easyBias, stretchOk, weakWordsSorted, topWords, wKeys, source, adapterHints: hints } = ctx
  const out: TrainingLoopCandidate[] = []

  if (input.sessionType === 'listening') {
    return dedupeCandidatesByTypeAndKeys(buildListeningSessionCandidates(ctx))
  }

  if (input.sessionType === 'quick_capture') {
    return dedupeCandidatesByTypeAndKeys(buildQuickCaptureRawCandidates(ctx))
  }

  if (topWords.length >= 2 && allow.has('weak_words')) {
    const payload = weakWordsPayloadFromSessionWords({
      topWords: topWords.slice(0, 5),
      evaluation: input.speakLiveEvaluation,
      exampleSentences: weakWordsSorted
        .slice(0, 3)
        .map((w) => w.supportingText ?? '')
        .filter((s) => s.trim().length > 4)
        .slice(0, 3),
      referenceAudioUrls: [],
      targetSkillIds: mapSkillIdsForLoop('weak_words', source),
    })
    const recoHint = ctx.primaryRecoLoopType === 'weak_words' && ctx.primaryRecoReason ? ` ${ctx.primaryRecoReason.slice(0, 120)}` : ''
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'weak_words',
      title: 'Practice these weak words',
      subtitle: 'One quick rep — say each word clearly.',
      reason: `Built from your last session — these words needed a little more clarity.${recoHint}`,
      targetSkills: mapSkillIdsForLoop('weak_words', source),
      targetWeaknessKeys: wKeys,
      estimatedMinutes: easyBias ? 0.65 : 1.1,
      difficulty: easyBias ? 'easy' : 'moderate',
      payload,
      confidence: topWords.length >= 4 ? 'high' : 'medium',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('weak_words', wKeys),
      rankReason: 'Multiple weak word signals in session insights.',
    })
  }

  const readAloudRetry = hints.readAloudRetryPhrase
  if (readAloudRetry && allow.has('retry_sentence')) {
    const payload = buildRetrySentencePayload({
      learnerOriginal: readAloudRetry.learnerOriginal,
      correctedVersion: readAloudRetry.correctedVersion,
      referenceAudioUrl: readAloudRetry.referenceAudioUrl,
      compareAudioUrl: null,
      explanationShort: readAloudRetry.explanationShort,
    })
    const keys = weaknessKeysFromWords([readAloudRetry.learnerOriginal.slice(0, 48)])
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'retry_sentence',
      title: 'Retry this phrase',
      subtitle: 'Unstable phrase from your read — align with the suggested line.',
      reason: 'Read-aloud segment feedback singled out this phrase; a tight retry builds stability.',
      targetSkills: mapSkillIdsForLoop('retry_sentence', source),
      targetWeaknessKeys: keys,
      estimatedMinutes: 0.75,
      difficulty: 'moderate',
      payload,
      confidence: 'high',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('retry_sentence', keys, readAloudRetry.learnerOriginal),
      rankReason: 'Read-aloud weak segment — phrase-level retry with suggested line.',
    })
  } else {
    const retryTurn = pickRetryTurnFromEvaluation(input.speakLiveEvaluation)
    const rw = retryTurn?.naturalRewrite
    if (retryTurn && rw?.original && rw.improved && allow.has('retry_sentence')) {
      const payload = buildRetrySentencePayload({
        learnerOriginal: rw.original.trim(),
        correctedVersion: rw.improved.trim(),
        referenceAudioUrl: retryTurn.referenceAudioUrl ?? null,
        compareAudioUrl: retryTurn.learnerAudioUrl ?? null,
        explanationShort:
          (rw.whyMoreNatural ?? retryTurn.mainFixLine ?? '').trim() || 'Say it again with this smoother shape.',
      })
      const keys = weaknessKeysFromWords([rw.original.slice(0, 48)])
      const reco =
        ctx.primaryRecoLoopType === 'retry_sentence' && ctx.primaryRecoReason
          ? ` Coach report: ${ctx.primaryRecoReason.slice(0, 100)}`
          : ''
      out.push({
        sourceSessionId: input.sourceSessionId,
        threadId: input.threadId,
        sourceType: source,
        sourceScenarioId: input.scenarioId,
        loopSlot: 0,
        loopType: 'retry_sentence',
        title: 'Retry this sentence',
        subtitle: 'Compare, then say it out loud.',
        reason: `This line is the fastest win from your last speaking turn.${reco}`,
        targetSkills: mapSkillIdsForLoop('retry_sentence', source),
        targetWeaknessKeys: keys,
        estimatedMinutes: 0.85,
        difficulty: 'moderate',
        payload,
        confidence: 'high',
        priorityScore: 0,
        dedupeKey: buildDedupeKey('retry_sentence', keys, rw.original),
        rankReason: 'Natural rewrite available on weakest-scored turn.',
      })
    }
  }

  const topPattern = input.insights.weakPatterns[0]
  if (topPattern && allow.has('structure_drill')) {
    const fa = ctx.focusAreaLabel ? ` Anchor: ${ctx.focusAreaLabel.slice(0, 72)}.` : ''
    const tail = hints.structurePromptTail?.trim()
    const p2 = tail ? `Try a second version — keep it short and natural.${fa} ${tail}` : `Try a second version — keep it short and natural.${fa}`
    const payload = buildStructureDrillPayload({
      prompts: [`Say one Dutch sentence that fixes: “${topPattern.label.slice(0, 120)}”.`, p2],
      modelAnswers: [],
      targetPatternId: topPattern.patternId,
      patternLabel: topPattern.label,
      skillFocus: mapSkillIdsForLoop('structure_drill', source),
    })
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'structure_drill',
      title: hints.structureDrillTitleHint?.trim() || 'Structure mini-drill',
      subtitle: topPattern.label.slice(0, 80),
      reason: (topPattern.explanation?.trim() || 'A tight pattern repeat keeps the fix sticky.') + fa,
      targetSkills: mapSkillIdsForLoop('structure_drill', source),
      targetWeaknessKeys: [topPattern.patternId],
      estimatedMinutes: easyBias ? 1.1 : 1.45,
      difficulty: easyBias ? 'easy' : 'moderate',
      payload,
      confidence: (topPattern.confidence ?? 0) >= 0.55 ? 'medium' : 'low',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('structure_drill', [topPattern.patternId]),
      rankReason: 'Top weak grammar pattern from session.',
    })
  }

  if (hints.chatSpeakingTransferPrompts?.length && allow.has('structure_drill') && source === 'chat') {
    const prompts = [
      ...hints.chatSpeakingTransferPrompts,
      'Say your best version twice aloud — second time closer to native rhythm.',
    ]
    const payload = buildStructureDrillPayload({
      prompts,
      modelAnswers: [],
      targetPatternId: 'chat_speaking_transfer',
      patternLabel: 'Chat → speaking transfer',
      skillFocus: ['pronunciation', 'fluency', 'pacing'],
    })
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'structure_drill',
      title: 'Chat → speaking transfer',
      subtitle: 'Typed line → spoken line.',
      reason: 'Chat adapter — move a written correction into short spoken reps so it sticks in real-time speech.',
      targetSkills: ['pronunciation', 'fluency', 'pacing'],
      targetWeaknessKeys: ['chat_speaking_transfer'],
      estimatedMinutes: easyBias ? 0.95 : 1.2,
      difficulty: 'moderate',
      payload,
      confidence: 'medium',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('structure_drill', ['chat_speaking_transfer']),
      rankReason: 'Chat messaging adapter — speaking transfer from text corrections.',
    })
  }

  if (ctx.hesitationStrong && allow.has('structure_drill')) {
    const topH = input.insights.hesitationIssues[0]
    const hesKey = topH?.patternId ?? 'hesitation_pacing'
    const label = topH?.label?.trim() || 'pauses and restarts'
    const payload = buildStructureDrillPayload({
      prompts: [
        `Say one short Dutch line, then pause half a beat at a clause boundary (not mid-word).`,
        `Say it again with steadier pacing — same meaning, fewer fillers.`,
      ],
      modelAnswers: [],
      targetPatternId: hesKey,
      patternLabel: label,
      skillFocus: ['pacing', 'fluency', 'keeping_flow'],
    })
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'structure_drill',
      title: 'Pacing & hesitation reset',
      subtitle: label.slice(0, 80),
      reason: `Session signals + memory point to hesitation/pacing — short reps beat long explanations.`,
      targetSkills: ['pacing', 'fluency', 'keeping_flow'],
      targetWeaknessKeys: [hesKey],
      estimatedMinutes: easyBias ? 0.9 : 1.2,
      difficulty: 'easy',
      payload,
      confidence: topH ? 'medium' : 'low',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('structure_drill', [hesKey], 'pacing'),
      rankReason: 'Hesitation / pacing signals (insights or recurring profile pattern).',
    })
  }

  const pron = input.insights.pronunciationIssues[0]
  const pronWords =
    input.insights.pronunciationIssues.length > 0
      ? input.insights.pronunciationIssues.slice(0, 5).map((p) => p.targetKey.split(':').pop() ?? p.targetKey)
      : topWords.slice(0, 4)

  if (allow.has('pronunciation_drill') && pronWords.filter(Boolean).length >= 2) {
    const cleanWords = pronWords.map((w) => w.replace(/_/g, ' ')).filter((w) => w.length > 1).slice(0, 6)
    const payload = buildPronunciationDrillPayload({
      words: cleanWords,
      soundFocus: pron?.issueType ?? null,
      tips: pron?.supportingText ? [pron.supportingText] : undefined,
      referenceAudioUrls: [],
      targetSkillIds: mapSkillIdsForLoop('pronunciation_drill', source),
    })
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'pronunciation_drill',
      title: 'Pronunciation micro-drill',
      subtitle: 'Repeat these words with crisp endings.',
      reason: 'Sound-level flags showed up — a short rep builds muscle memory.',
      targetSkills: mapSkillIdsForLoop('pronunciation_drill', source),
      targetWeaknessKeys: weaknessKeysFromWords(cleanWords),
      estimatedMinutes: 0.85,
      difficulty: easyBias ? 'easy' : 'moderate',
      payload,
      confidence: pron ? 'medium' : 'low',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('pronunciation_drill', cleanWords),
      rankReason: 'Pronunciation issues or weak word stems from session.',
    })
  }

  if (hints.liveMicroReadPassage && allow.has('read_aloud_fix') && input.sessionType === 'speak_live') {
    const passage = hints.liveMicroReadPassage.trim().slice(0, 420)
    const tw = topWords.slice(0, 6)
    const payload = buildReadAloudFixPayload({
      passageText: passage,
      focusLabel: ctx.hesitationStrong ? 'Light pauses at clause boundaries' : 'Clarity micro re-read',
      referenceAudioUrl: null,
      targetWords: tw,
      targetSounds: input.insights.pronunciationIssues.slice(0, 3).map((p) => p.issueType),
      explanationShort: null,
    })
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'read_aloud_fix',
      title: 'Micro re-read (from your session)',
      subtitle: hints.liveMicroReadSubtitle ?? 'Short passage — tighten pacing and endings.',
      reason:
        'Your scenario report suggested a speaking-quality or pacing polish pass — a tiny re-read locks it in without a full read-aloud session.',
      targetSkills: mapSkillIdsForLoop('read_aloud_fix', source),
      targetWeaknessKeys: weaknessKeysFromWords(tw.length ? tw : [passage.slice(0, 24)]),
      estimatedMinutes: easyBias ? 0.75 : 0.95,
      difficulty: 'easy',
      payload,
      confidence: 'medium',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('read_aloud_fix', weaknessKeysFromWords(tw), 'live_micro'),
      rankReason: 'Live scenario adapter — micro read when pacing/pronunciation warrants.',
    })
  }

  if (input.scenarioId && allow.has('mini_scenario')) {
    const slug = (input.scenarioSlug ?? '').toLowerCase()
    const spWeak = input.insights.scenarioPerformance?.weakSubskills ?? []
    const spWeak0 = spWeak[0]
    const defaultObjective =
      spWeak0
        ? `Tight rep on “${spWeak0.replace(/_/g, ' ')}” in the same scene.`
        : slug.includes('direction')
          ? 'One tight exchange about directions.'
          : slug.includes('order') || slug.includes('food')
            ? 'A 30-second rep on ordering politely.'
            : 'A short exchange that replays the hardest moment.'
    const objective = hints.miniScenarioObjectiveOverride ?? defaultObjective
    /**
     * `openingPrompt` is rendered under an "OPENING LINE" eyebrow on the report card — it MUST be
     * an actual Dutch line the learner can lean on, not English coach meta-text. The previous value
     * (`'Jump in with your first line — keep it simple and direct.'`) was meta about how to start,
     * not a line to start with — that mismatch is what produced "the opening line recommendation
     * does not seem correct" in field reports. We now source it from the same focus-area example
     * line that powers the read-aloud fix, falling back to empty when the session didn't flag a
     * specific line (the UI hides the section in that case).
     */
    const focusExampleLine = input.speakLiveEvaluation?.focusArea?.exampleLine?.trim() ?? ''
    const payload = buildMiniScenarioPayload({
      scenarioId: input.scenarioId,
      scenarioVariant: 'narrow_retry',
      objective,
      openingPrompt: focusExampleLine,
      expectedSkillFocus: mapSkillIdsForLoop('mini_scenario', source),
      targetTurnCount: 4,
      supportingPhrase: focusExampleLine || null,
    })
    const wk = [...(spWeak0 ? [spWeak0] : []), ...(input.scenarioId ? [input.scenarioId] : [])]
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'mini_scenario',
      title: 'Mini scenario rep',
      subtitle: 'Same scene — smaller goal.',
      reason:
        spWeak.length > 0
          ? `Scenario breakdown flagged weak sub-skills (${spWeak.slice(0, 2).join(', ')}); narrow rerun locks the fix.`
          : 'A narrow rerun is the best way to lock in the fix without pressure.',
      targetSkills: mapSkillIdsForLoop('mini_scenario', source),
      targetWeaknessKeys: wk.length ? wk : input.scenarioId ? [input.scenarioId] : [],
      estimatedMinutes: easyBias ? 1.35 : 1.75,
      difficulty: 'moderate',
      payload,
      confidence: spWeak.length ? 'high' : 'medium',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('mini_scenario', wk.length ? wk : [input.scenarioId ?? '']),
      rankReason:
        spWeak.length > 0
          ? 'Scenario performance — weak subskills from latest session.'
          : 'Scenario thread available — reuse scene for targeted rep.',
    })
  }

  if (allow.has('question_drill') && (source === 'coach' || source === 'chat')) {
    const scenarioContext =
      [input.scenarioSlug, input.scenarioId].filter(Boolean).join(' · ').trim().slice(0, 240) || null
    const payload = buildQuestionDrillPayload({
      prompts: hints.questionDrillPrompts ?? ['Ask three follow-up questions in Dutch about the last topic.'],
      exampleQuestions: hints.questionDrillExampleQuestions ?? [
        'Hoe laat is het?',
        'Waar moet ik instappen?',
        'Wat raad je aan?',
      ],
      targetQuestionType: 'follow_up',
      scenarioContext,
    })
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'question_drill',
      title: hints.questionDrillTitle ?? 'Follow-up question rep',
      subtitle: hints.questionDrillSubtitle ?? 'Three stronger questions.',
      reason:
        source === 'chat'
          ? 'Turn a written thread habit into spoken follow-ups—same intent, clearer mouth feel.'
          : 'Coach-style sessions improve fastest with crisp question practice.',
      targetSkills: mapSkillIdsForLoop('question_drill', source),
      targetWeaknessKeys: ['question_form'],
      estimatedMinutes: easyBias ? 1.1 : 1.35,
      difficulty: 'moderate',
      payload,
      confidence: 'medium',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('question_drill', ['follow_up']),
      rankReason: 'Coach/chat modality — prioritize question shaping.',
    })
  }

  const ra = input.readAloudResult
  if (ra && allow.has('read_aloud_fix')) {
    const passage = ra.targetText.trim().slice(0, 420)
    const hesFocus = ctx.hesitationStrong ? 'Light pauses at clause boundaries' : null
    const focus =
      hints.readAloudPacingFocusLabel?.trim() ??
      hesFocus ??
      ra.coaching?.focusArea?.trim() ??
      ctx.focusAreaLabel ??
      'Pacing and clarity'
    const tw = (ra.weakWords?.length ? ra.weakWords : topWords).slice(0, 6)
    const payload = buildReadAloudFixPayload({
      passageText: passage,
      focusLabel: focus,
      referenceAudioUrl: null,
      targetWords: tw,
      targetSounds: input.insights.pronunciationIssues.slice(0, 3).map((p) => p.issueType),
      explanationShort: ra.coaching?.summary?.trim() ?? null,
    })
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'read_aloud_fix',
      title: 'Read this short passage again',
      subtitle: 'Good next step for pacing.',
      reason: 'A second pass on the same lines tightens rhythm and mouth feel.',
      targetSkills: mapSkillIdsForLoop('read_aloud_fix', source),
      targetWeaknessKeys: weaknessKeysFromWords(tw),
      estimatedMinutes: easyBias ? 1.0 : 1.15,
      difficulty: easyBias ? 'easy' : 'moderate',
      payload,
      confidence: 'high',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('read_aloud_fix', weaknessKeysFromWords(tw), passage.slice(0, 40)),
      rankReason: 'Read aloud modality — passage replay is high leverage.',
    })
  }

  const slugStory = (input.scenarioSlug ?? '').includes('story')
  if (allow.has('storytelling_drill') && (slugStory || input.insights.sessionType === 'read_aloud')) {
    const payload = buildStorytellingDrillPayload({
      prompt: 'Tell what happened next in 3 short Dutch sentences (past time).',
      expectedSteps: ['Set the scene', 'Say what changed', 'End with a feeling or result'],
      modelStory: '',
      targetSkillFocus: ['keeping_flow', 'fluency'],
    })
    out.push({
      sourceSessionId: input.sourceSessionId,
      threadId: input.threadId,
      sourceType: source,
      sourceScenarioId: input.scenarioId,
      loopSlot: 0,
      loopType: 'storytelling_drill',
      title: 'Storytelling micro-flow',
      subtitle: 'Three beats — past event.',
      reason: 'Story-style practice keeps endings confident.',
      targetSkills: ['keeping_flow', 'fluency'],
      targetWeaknessKeys: ['story_flow'],
      estimatedMinutes: stretchOk ? 1.65 : 1.9,
      difficulty: stretchOk ? 'stretch' : 'moderate',
      payload,
      confidence: 'low',
      priorityScore: 0,
      dedupeKey: buildDedupeKey('storytelling_drill', ['story_flow']),
      rankReason: 'Storytelling-tagged scenario or read-aloud follow-up.',
    })
  }

  out.push(...buildCrossModalityListeningCandidates(ctx))

  for (const c of out) {
    if (easyBias && c.difficulty !== 'stretch') {
      c.difficulty = 'easy'
      c.estimatedMinutes = Math.max(0.45, c.estimatedMinutes * 0.88)
    }
  }

  return dedupeCandidatesByTypeAndKeys(out)
}

/** Drop redundant candidates with identical loopType + weakness signature (keep first). */
function dedupeCandidatesByTypeAndKeys(candidates: TrainingLoopCandidate[]): TrainingLoopCandidate[] {
  const seen = new Set<string>()
  const out: TrainingLoopCandidate[] = []
  for (const c of candidates) {
    const sig = `${c.loopType}|${weaknessSignature(c.targetWeaknessKeys)}`
    if (seen.has(sig)) continue
    seen.add(sig)
    out.push(c)
  }
  return out
}

function isRecentExactDuplicate(key: string, recent: RecentLoopDedupeRow[], now: number): boolean {
  const cutoff = now - 2 * MS_DAY
  return recent.some((r) => r.dedupeKey === key && Date.parse(r.createdAt) >= cutoff && r.status !== 'dismissed')
}

function isNearDuplicateLoop(c: TrainingLoopCandidate, recent: RecentLoopDedupeRow[], now: number): boolean {
  const candKeys = c.targetWeaknessKeys
  if (!candKeys.length) return false
  const cutoffSoft = now - 3 * MS_DAY
  for (const r of recent) {
    if (r.status === 'dismissed') continue
    const t = Date.parse(r.createdAt)
    if (t < cutoffSoft) continue
    const rKeys = r.targetWeaknessKeys ?? []
    if (!rKeys.length) continue
    const jac = jaccardSimilarityKeys(candKeys, rKeys)
    if (jac >= 0.88) return true
    if (jac >= 0.72 && r.loopType === c.loopType) return true
  }
  return false
}

function rotateTypePreferred(
  candidates: TrainingLoopCandidate[],
  used: TrainingLoopType[],
  avoidWeaknessSig: string | null,
): TrainingLoopCandidate | null {
  for (const c of candidates) {
    if (used.includes(c.loopType)) continue
    if (avoidWeaknessSig && weaknessSignature(c.targetWeaknessKeys) === avoidWeaknessSig) continue
    return c
  }
  for (const c of candidates) {
    if (!used.includes(c.loopType)) return c
  }
  return null
}

export function rankAndSelectTrainingLoops(params: {
  candidates: TrainingLoopCandidate[]
  recent: RecentLoopDedupeRow[]
  nowMs?: number
}): {
  primary: TrainingLoopCandidate | null
  secondary: TrainingLoopCandidate | null
  stretch: TrainingLoopCandidate | null
  suppressedDuplicates: string[]
  rankingNotes: string[]
} {
  const now = params.nowMs ?? Date.now()
  const suppressed: string[] = []
  const notes: string[] = []
  const sorted = [...params.candidates].sort((a, b) => b.priorityScore - a.priorityScore)

  const tryFilter = (nearDup: boolean): TrainingLoopCandidate[] => {
    const fresh: TrainingLoopCandidate[] = []
    for (const c of sorted) {
      if (isRecentExactDuplicate(c.dedupeKey, params.recent, now)) {
        suppressed.push(c.dedupeKey)
        notes.push(`Suppressed exact dedupe (48h): ${c.loopType}`)
        continue
      }
      if (nearDup && isNearDuplicateLoop(c, params.recent, now)) {
        notes.push(`Suppressed near-duplicate weakness: ${c.loopType}`)
        continue
      }
      fresh.push(c)
    }
    return fresh
  }

  let fresh = tryFilter(true)
  if (!fresh.length) {
    notes.push('Fallback: relaxed near-duplicate filter (exact dedupe only).')
    fresh = tryFilter(false)
  }

  if (!fresh.length) {
    return { primary: null, secondary: null, stretch: null, suppressedDuplicates: suppressed, rankingNotes: notes }
  }
  const primary = fresh[0] ?? null
  if (primary) notes.push(`Primary: ${primary.loopType} (score ${primary.priorityScore}) — ${primary.rankReason}`)
  const used: TrainingLoopType[] = primary ? [primary.loopType] : []
  const primaryWeakSig = primary ? weaknessSignature(primary.targetWeaknessKeys) : null

  let secondary = rotateTypePreferred(fresh.slice(1), used, primaryWeakSig)
  if (!secondary) secondary = rotateTypePreferred(fresh.slice(1), used, null)
  if (secondary) {
    used.push(secondary.loopType)
    secondary = { ...secondary, loopSlot: 1 }
    notes.push(`Secondary: ${secondary.loopType}`)
  }

  let stretchCand = fresh.find((c) => c.difficulty === 'stretch' && c.loopType !== primary?.loopType)
  if (!stretchCand) {
    const pool = fresh.filter((c) => c.loopType !== primary?.loopType && c.loopType !== secondary?.loopType)
    const base = pool[0]
    if (base) {
      stretchCand = {
        ...base,
        difficulty: 'stretch' as TrainingLoopDifficulty,
        title: `Stretch: ${base.title}`,
        dedupeKey: `${base.dedupeKey}:stretch`,
        priorityScore: Math.max(40, base.priorityScore - 6),
        rankReason: `${base.rankReason} (stretch rep — varied format)`,
      }
    }
  }
  let stretch =
    stretchCand && stretchCand.loopType !== secondary?.loopType
      ? { ...stretchCand, loopSlot: 2 as const, difficulty: 'stretch' as TrainingLoopDifficulty }
      : null
  if (stretch && primary && stretch.loopType === primary.loopType) stretch = null
  if (stretch) notes.push(`Stretch: ${stretch.loopType}`)
  return { primary, secondary, stretch, suppressedDuplicates: suppressed, rankingNotes: notes }
}

/**
 * Full pipeline entry (generation + scoring + selection) for tests and tooling.
 */
export function runTrainingLoopGenerationPipeline(params: {
  input: LoopGenerationInput
  recent: RecentLoopDedupeRow[]
  nowMs?: number
}): {
  context: LoopGenerationContext
  candidates: TrainingLoopCandidate[]
  selected: ReturnType<typeof rankAndSelectTrainingLoops>
} {
  const ctx = buildLoopGenerationContext(params.input)
  const raw = buildRawCandidates(ctx)
  applyCandidateScoringModel(raw, ctx, params.recent, params.nowMs ?? Date.now())
  raw.sort((a, b) => b.priorityScore - a.priorityScore)
  const selected = rankAndSelectTrainingLoops({ candidates: raw, recent: params.recent, nowMs: params.nowMs })
  return { context: ctx, candidates: raw, selected }
}

export function buildTrainingLoopCandidates(
  input: LoopGenerationInput,
  recent: RecentLoopDedupeRow[] = [],
): TrainingLoopCandidate[] {
  const ctx = buildLoopGenerationContext(input)
  const raw = buildRawCandidates(ctx)
  applyCandidateScoringModel(raw, ctx, recent, Date.now())
  raw.sort((a, b) => b.priorityScore - a.priorityScore)
  return raw
}

export function buildTrainingLoopPracticeBundle(params: {
  userId: string
  selected: {
    primary: TrainingLoopCandidate | null
    secondary: TrainingLoopCandidate | null
    stretch: TrainingLoopCandidate | null
  }
  summaries: TrainingLoopCandidateSummary[]
  suppressedDuplicates: string[]
  rankingNotes: string[]
  includeDebug: boolean
}): TrainingLoopPracticeNowBundle {
  const now = new Date().toISOString()
  const expires = new Date(Date.now() + 7 * MS_DAY).toISOString()
  const mk = (
    c: TrainingLoopCandidate | null,
    slot: 0 | 1 | 2,
    status: TrainingLoopStatus,
  ): PersonalizedTrainingLoop | null => {
    if (!c) return null
    const id = newId()
    return {
      id,
      userId: params.userId,
      sourceSessionId: c.sourceSessionId,
      threadId: c.threadId,
      sourceType: c.sourceType,
      sourceScenarioId: c.sourceScenarioId,
      loopSlot: slot,
      loopType: c.loopType,
      title: c.title,
      subtitle: c.subtitle ?? null,
      reason: c.reason,
      targetSkills: c.targetSkills,
      targetWeaknessKeys: c.targetWeaknessKeys,
      estimatedMinutes: c.estimatedMinutes,
      difficulty: c.difficulty,
      payload: c.payload,
      createdAt: now,
      updatedAt: now,
      expiresAt: expires,
      status,
      confidence: c.confidence as TrainingLoopConfidence,
      priorityScore: c.priorityScore,
      dedupeKey: c.dedupeKey,
    }
  }
  const primary = mk(params.selected.primary, 0, 'active')
  const secondary = mk(params.selected.secondary, 1, 'active')
  const stretch = mk(params.selected.stretch, 2, 'active')
  const debug: TrainingLoopGenerationDebug | null = params.includeDebug
    ? {
        candidates: params.summaries,
        chosenPrimary: primary ? { id: primary.id, loopType: primary.loopType } : null,
        chosenSecondary: secondary ? { id: secondary.id, loopType: secondary.loopType } : null,
        chosenStretch: stretch ? { id: stretch.id, loopType: stretch.loopType } : null,
        suppressedDuplicates: params.suppressedDuplicates,
        rankingNotes: params.rankingNotes,
      }
    : null
  return { primary, secondary, stretch, debug }
}

export function candidatesToSummaries(candidates: TrainingLoopCandidate[]): TrainingLoopCandidateSummary[] {
  return candidates.map((c) => ({
    loopType: c.loopType,
    title: c.title,
    priorityScore: c.priorityScore,
    rankReason: c.rankReason,
    dedupeKey: c.dedupeKey,
  }))
}
