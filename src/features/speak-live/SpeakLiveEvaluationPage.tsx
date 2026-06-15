'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  Mic, MicOff, ChevronDown, ChevronUp,
  Play, Square, ArrowLeftRight, BookmarkPlus, ArrowRight,
  CheckCircle2, XCircle, AlertCircle, Pause, Volume2,
  Languages, Sparkles, Hash, Check, TrendingUp, TrendingDown, Minus,
  RotateCcw, Timer,
} from 'lucide-react'
import type { ApiLiveSessionEvaluationResponse } from '@/lib/api/apiTypes'
import { getApiBaseUrl, isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { getApiUserId } from '@/lib/api/apiUser'
import {
  getClientTimeZone,
  invalidateProgressionQueries,
  postProgressionSessionComplete,
} from '@/lib/hooks/useProgression'
import { ApiRequestError } from '@/lib/api/apiErrors'
import { conversationClient, type SpeakLiveTtsWordBoundary } from '@/lib/api/conversationClient'
import { APP_LANGUAGE_COACH, APP_TALK_HUB, appSpeakLiveThreadRecap, speakLiveRunHref } from '@/lib/routing/appRoutes'
import type {
  SessionEvaluationReport, TurnEvaluation, ScoredDimension,
  FocusArea,
  WordAssessmentResult, GoalEvidence, EvidenceSummary,
  WrongWordDetection,
  SentenceGroundedReview,
  AudioCoaching,
  NaturalRewrite,
  PhoneCallPerformance,
  PhoneCallSentenceMoment,
  SmallTalkPerformance,
  MeetingNewPeoplePerformance,
  PartySocialPerformance,
  ExplainingSomethingPerformance,
  StorytellingPerformance,
  OpinionsDiscussionsPerformance,
} from './evaluation/reportTypes'
import { parseEvaluationReport } from './evaluation/reportTypes'
import {
  tokenKeyForMatch,
  englishGlossForDutchWord,
  DutchWordGlossPicker,
  prefetchDutchWordGlosses,
  type DutchWordGlossPrefetchSource,
  type WordCorrection,
} from './evaluation/dutchWordGlossSupport'
import { LanguageCoachDedicatedReport } from './evaluation/LanguageCoachDedicatedReport'
import { SessionVoiceTeacherSummaryCard } from './evaluation/SessionVoiceTeacherSummaryCard'
import type { SessionTeacherSummaryInput } from './evaluation/sessionTeacherVoiceSummary'
import { LearningMemoryRibbon, learningMemoryRibbonHasContent } from './evaluation/LearningMemoryRibbon'
import { ReportPracticeNowSection } from './evaluation/ReportPracticeNowSection'
import { ReportQuickCapturePrompt } from '@/components/capture/ReportQuickCapturePrompt'
import { EvaluationPreparingSteps } from './evaluation/EvaluationPreparingSteps'
import { EvaluationTimingBreakdown } from './evaluation/EvaluationTimingBreakdown'
import { ScenarioReportGenerationDevPanel } from './evaluation/ScenarioReportGenerationDevPanel'
import { ScenarioReportStageChips } from './evaluation/ScenarioReportStageChips'
import {
  activeScenarioReportStageChip,
  getScenarioReportLoadingHeadline,
  getScenarioReportLoadingSubtitle,
  isOptimizedScenarioReportLane,
  isPartialOptimizedScenarioReport,
  isScenarioReportDevDiagnosticsEnabled,
} from './evaluation/scenarioReportGenerationState'
import { fetchSpeakingProgression } from '@/lib/speaking/speakingProgressClient'
import type { SpeakingProgressSummary } from '@/lib/speaking/speakingProgressTypes'
import { isDevToolsEnabledClient } from '@/lib/dev-tools'
import { getSpeakLiveCatalogItem, LANGUAGE_COACH_SCENARIO_ID } from './speakLiveScenarios'

async function runWithRetry(sessionId: string, opts?: { forceRestart?: boolean }): Promise<ApiLiveSessionEvaluationResponse> {
  const max = 6
  let last: unknown
  for (let i = 0; i < max; i++) {
    try {
      return await conversationClient.runLiveSessionEvaluation(sessionId, opts)
    } catch (e) {
      last = e
      if (e instanceof ApiRequestError && e.status === 409 && i < max - 1) {
        await new Promise(r => setTimeout(r, 320 + i * 280))
        continue
      }
      throw e
    }
  }
  throw last
}

// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE HELPERS — split audio vs language
// ═══════════════════════════════════════════════════════════════════════════

type AudioEvidenceStatus = 'all' | 'partial' | 'none'
type LanguageEvidenceStatus = 'available' | 'unavailable'

function deriveAudioEvidence(es: EvidenceSummary): { status: AudioEvidenceStatus; label: string } {
  const total = es.totalLearnerTurnCount
  const recorded = es.audioTurnCount
  const assessed = es.audioPipelineDiagnostics?.turnsAssessedOk ?? es.azurePronunciationTurnCount
  if (assessed >= total && assessed > 0) return { status: 'all', label: `Scored on all ${total} sentences` }
  if (assessed > 0) return { status: 'partial', label: `Scored on ${assessed} of ${total} sentences` }
  if (recorded > 0) return { status: 'partial', label: `Recorded on ${recorded} of ${total} sentences, but not scored` }
  return { status: 'none', label: 'Missing' }
}

function summarizeAudioFailure(reason: string | undefined | null): string {
  const text = (reason ?? '').trim()
  if (!text) return 'This clip could not be scored.'
  if (/NoMatch/i.test(text)) return 'This clip was not recognized clearly enough to score pronunciation.'
  if (/parallel requests exceeded/i.test(text)) return 'Speech scoring failed on this clip because the speech service was overloaded.'
  return text
    .replace(/^Azure did not return a recognized result \([^)]+\)\.\s*/i, '')
    .slice(0, 180)
}

function deriveLanguageEvidence(es: EvidenceSummary): { status: LanguageEvidenceStatus; label: string } {
  const total = es.totalLearnerTurnCount
  const text = es.transcriptTurnCount
  if (es.transcriptAvailable && text > 0) return { status: 'available', label: `Available (${text} of ${total} sentences transcribed)` }
  return { status: 'unavailable', label: 'Missing' }
}

function formatDurationMs(ms: number | undefined | null): string {
  if (!ms || ms <= 0) return '0s'
  if (ms < 1000) return `${ms}ms`
  const sec = Math.round(ms / 100) / 10
  if (sec < 60) return `${sec}s`
  const wholeSec = Math.round(ms / 1000)
  const min = Math.floor(wholeSec / 60)
  const rem = wholeSec % 60
  return `${min}m ${rem}s`
}

function formatSessionDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds || 0))
  const min = Math.floor(safe / 60)
  const rem = safe % 60
  if (min <= 0) return `${rem}s`
  if (rem === 0) return `${min}m`
  return `${min}m ${rem}s`
}

function modeLabel(mode: string): string {
  if (mode === 'live_voice') return 'Speaking'
  if (mode === 'chat_voice') return 'Voice chat'
  return mode || 'Speaking'
}

function outcomeSummary(score: number | null | undefined): string {
  const s = score ?? 0
  if (s >= 90) {
    return 'Goals covered; remaining notes are polish.'
  }
  if (s >= 75) {
    return 'Main goals met; tighten wording and flow where noted.'
  }
  if (s >= 45) {
    return 'Partly on task — open goals or weaker lines still weigh on the score.'
  }
  return 'Biggest gap: task coverage — hit the missing prompts next run.'
}

function turnHasAudio(turn: TurnEvaluation): boolean {
  return turn.signalSources.audioMetrics === 'azure_audio'
}

const DEV_NOISE_RE = /\b(offline[:\s]|offline stub|offline template|offline mode|offline coach|connect the (?:evaluation |full |coach )?(?:LLM|model)|placeholder|enable the evaluation|re-open this report after|coach model|evaluation LLM|sentence-level coaching merges|recognition note:|no strong word-level flags|audio assessment payload)/i

/** Strip internal `[GOAL_ID]` tokens from Speak Live labels and LLM echoes (learner-facing copy). */
function stripSpeakLiveGoalIdBrackets(text: string): string {
  return text
    .replace(/\[[A-Za-z0-9_]+\]\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function scenarioGoalKeyForMatching(raw: string): string {
  const t = raw.trim().toLowerCase()
  const m = /^\[([a-z0-9_]+)\]/i.exec(t)
  return (m?.[1] ?? t).trim()
}

function humanizeCoachText(text: string): string {
  let next = text.trim()
  if (!next) return ''

  const normalized = next.toLowerCase().replace(/[.]+$/, '')
  if (normalized === 'incorrect structure for asking about time') {
    return 'Ask the departure time as one direct question.'
  }
  if (normalized === 'incorrect question structure') {
    return 'Use one direct question here.'
  }
  if (normalized === 'incorrect sentence structure') {
    return 'Turn this into one full Dutch sentence.'
  }

  next = next.replace(
    /^incorrect structure for asking about ([a-z -]+)\.?$/i,
    (_match, topic: string) => `Ask about ${topic.trim()} with one direct question.`,
  )

  return next
}

/** Shorten stock verbose coaching strings for display only (does not alter stored report data). */
function tightenCoachDisplayText(text: string): string {
  let t = text.trim()
  if (!t) return ''
  const apos = '\u2018'
  const aposEnd = '\u2019'
  t = t.replace(
    new RegExp(
      `^([${apos}${aposEnd}'"])([^${apos}${aposEnd}'"]{1,64})\\1\\s+is\\s+the\\s+expected\\s+dutch\\s+here\\s*[\\u2014\\u2013-]\\s*.+$`,
      'i',
    ),
    `Use ${apos}$2${aposEnd} here.`,
  )
  t = t.replace(
    new RegExp(
      `^([${apos}${aposEnd}'"])([^${apos}${aposEnd}'"]{1,64})\\1\\s+is\\s+the\\s+expected\\s+dutch\\s+here\\.?$`,
      'i',
    ),
    `Use ${apos}$2${aposEnd} here.`,
  )
  t = t.replace(/^this version is grammatically correct and clearly conveys[^.]*\.?\s*/i, 'Sounds natural in Dutch. ')
  t = t.replace(/^this sounds natural in dutch\.?\s*/i, 'Sounds natural in Dutch. ')
  t = t.replace(/^this line works better as\s*/i, 'Say: ')
  t = t.replace(/^in this scenario,?\s*/i, '')
  t = t.replace(/^we likely heard\s+/i, 'Heard ')
  t = t.replace(/, but in this context the correct target is probably\s+/i, ' — use ')
  t = t.replace(/\s+does not match standard wording for this meaning\.?$/i, '')
  t = t.replace(/\s{2,}/g, ' ')
  return t.trim()
}

function sanitizeCoachText(s: string | undefined | null): string {
  if (!s) return ''
  if (DEV_NOISE_RE.test(s)) return ''
  return tightenCoachDisplayText(humanizeCoachText(stripSpeakLiveGoalIdBrackets(s)))
}

function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(/[?.!,;:\u2026\u201c\u201d"']/g, '').replace(/\s+/g, ' ').trim()
}

function isSameAsOriginal(original: string, improved: string | undefined | null): boolean {
  if (!improved) return true
  return normalizeForCompare(original) === normalizeForCompare(improved)
}

function isAbortError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name?: string }).name === 'AbortError',
  )
}

function buildSnippetText(parts: Array<string | null | undefined>): string | null {
  const cleaned = parts
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
  if (cleaned.length === 0) return null
  return cleaned.join('. ')
}

function turnNeedsLanguageRepairForSummary(turn: TurnEvaluation): boolean {
  if ((turn.wrongWordDetections?.length ?? 0) > 0) return true
  if (turn.referenceKind === 'more_natural_dutch' && !isSameAsOriginal(turn.learnerTranscript || '', turn.referenceSentence || '')) {
    return true
  }
  const mainFix = (turn.mainFixLine ?? '').toLowerCase()
  return mainFix.includes('use “')
    || mainFix.includes('use "')
    || mainFix.includes('full dutch')
    || mainFix.includes('ask the ')
}

type SentenceSummarySignalTone = 'audio' | 'language' | 'warning' | 'scenario'

type SentenceSummarySignal = {
  label: string
  tone: SentenceSummarySignalTone
}

type SentenceCollapsedSummaryAdapter = {
  line: string | null
}

function turnCombinedScore(turn: TurnEvaluation): number | null {
  const overall = turn.combinedScores?.overallTurnScore
  if (typeof overall === 'number' && Number.isFinite(overall)) return overall

  const fallbackScores = [
    ...Object.values(turn.audioScores ?? {}),
    ...Object.values(turn.languageScores ?? {}),
  ].filter((score): score is number => typeof score === 'number' && Number.isFinite(score))

  if (fallbackScores.length === 0) return null
  return fallbackScores.reduce((sum, score) => sum + score, 0) / fallbackScores.length
}

function turnHasExplicitWrongWordIssue(turn: TurnEvaluation): boolean {
  if ((turn.wrongWordDetections?.length ?? 0) > 0) return true
  return turn.feedbackItems.some((item) => {
    const type = (item.type ?? '').toLowerCase()
    return type === 'wrong_word' || type === 'non_word' || type === 'word_choice'
  })
}

function turnMatchesMissingCoreGoal(
  turn: TurnEvaluation,
  missingCoreGoalIds: Set<string>,
  missingCoreTurnIds: Set<string>,
): boolean {
  if (missingCoreTurnIds.has(turn.turnId)) return true
  if (missingCoreGoalIds.size === 0) return false
  const relatedGoals = [...(turn.scenarioGoalFit?.relevantGoals ?? []), ...(turn.scenarioGoalTags ?? [])]
    .map((goal) => goal.trim().toLowerCase())
    .filter(Boolean)
  return relatedGoals.some((goal) => missingCoreGoalIds.has(scenarioGoalKeyForMatching(goal)))
}

function turnHasMeaningfulSentenceFeedback(turn: TurnEvaluation): boolean {
  return Boolean(
    turnHasExplicitWrongWordIssue(turn)
    || turnNeedsLanguageRepairForSummary(turn)
    || (turn.keyProblems ?? []).map(sanitizeCoachText).some(Boolean)
    || (turn.pronunciationIssues?.length ?? 0) > 0
    || (turn.fluencyIssues?.length ?? 0) > 0
    || (turn.audioFindings?.length ?? 0) > 0
    || (turn.transcriptCoaching.issues?.length ?? 0) > 0
    || (turn.sentenceGroundedReview?.whatToFix.length ?? 0) > 0
  )
}

function selectPrioritySentenceTurnId(
  turns: TurnEvaluation[],
  missingCoreGoalIds: Set<string>,
  missingCoreTurnIds: Set<string>,
): string | null {
  if (turns.length === 0) return null

  const byLowestCombinedScore = (rows: TurnEvaluation[]): TurnEvaluation[] => {
    return [...rows].sort((left, right) => {
      const a = turnCombinedScore(left)
      const b = turnCombinedScore(right)
      if (a == null && b == null) return left.turnIndex - right.turnIndex
      if (a == null) return 1
      if (b == null) return -1
      if (a !== b) return a - b
      return left.turnIndex - right.turnIndex
    })
  }

  const wrongWordTurns = turns.filter(turnHasExplicitWrongWordIssue)
  if (wrongWordTurns.length > 0) return byLowestCombinedScore(wrongWordTurns)[0]?.turnId ?? null

  const lowestScored = byLowestCombinedScore(turns).find((turn) => turnCombinedScore(turn) != null)
  if (lowestScored?.turnId) return lowestScored.turnId

  const missingGoalTurn = turns.find((turn) => turnMatchesMissingCoreGoal(turn, missingCoreGoalIds, missingCoreTurnIds))
  if (missingGoalTurn?.turnId) return missingGoalTurn.turnId

  const meaningfulTurn = turns.find(turnHasMeaningfulSentenceFeedback)
  if (meaningfulTurn?.turnId) return meaningfulTurn.turnId

  return turns[0]?.turnId ?? null
}

function buildSentenceSummarySignals(opts: {
  turn: TurnEvaluation
  hasAudio: boolean
  hasWordIssue: boolean
  hasLanguageCoachingNeed: boolean
  hasScenarioGap: boolean
}): SentenceSummarySignal[] {
  const { turn, hasWordIssue, hasLanguageCoachingNeed, hasScenarioGap } = opts
  const hasPronunciationFocus = Boolean(
    (turn.pronunciationIssues?.length ?? 0) > 0
    || (turn.fluencyIssues?.length ?? 0) > 0
    || (turn.audioCoaching?.wordAssessments ?? []).some((word) => word.status === 'weak' || word.status === 'unclear'),
  )
  const hasGrammar = (turn.transcriptCoaching?.issues?.length ?? 0) > 0

  const signals: SentenceSummarySignal[] = []
  if (hasWordIssue) signals.push({ label: 'Wrong word', tone: 'warning' })
  if (hasGrammar && signals.length < 2) signals.push({ label: 'Grammar', tone: 'language' })
  if (hasPronunciationFocus && signals.length < 2) signals.push({ label: 'Pronunciation', tone: 'audio' })
  if (hasScenarioGap && signals.length < 2) signals.push({ label: 'Scenario', tone: 'scenario' })
  if (hasLanguageCoachingNeed && !hasWordIssue && signals.length < 2) signals.push({ label: 'Language', tone: 'language' })
  return signals.slice(0, 2)
}

function compactCollapsedSummaryLine(text: string | null | undefined, max = 92): string | null {
  const cleaned = sanitizeCoachText(text).replace(/^Main fix:\s*/i, '').trim()
  if (!cleaned) return null
  if (cleaned.length <= max) return cleaned

  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0]?.trim()
  if (firstSentence && firstSentence.length <= max) return firstSentence

  const firstClause = cleaned.split(/\s+[—–-]\s+|;\s+|:\s+/)[0]?.trim()
  if (firstClause && firstClause.length >= 18 && firstClause.length <= max) {
    return /[.!?]$/.test(firstClause) ? firstClause : `${firstClause}.`
  }

  return `${cleaned.slice(0, max - 1).trimEnd()}…`
}

function collapsedScenarioSummary(goal: string | null | undefined): string | null {
  const normalized = (goal ?? '').trim().toLowerCase()
  if (!normalized) return null
  if (normalized === 'ask_departure_time') return 'Ask the departure time directly.'
  if (normalized === 'ask_delay_status') return 'Ask if the train is on time.'
  if (normalized === 'ask_platform') return 'Ask which platform it leaves from.'
  if (normalized === 'close_politely') return 'Close politely at the end.'

  const humanized = humanizeScenarioGoal(normalized)
  return humanized ? `Cover this scenario goal: ${humanized}.` : null
}

function collapsedVoiceSummary(turn: TurnEvaluation): string | null {
  const pronunciationLead = turn.pronunciationIssues[0]
  if (pronunciationLead?.word?.trim()) {
    const word = pronunciationLead.word.trim()
    const joined = `${pronunciationLead.issue ?? ''} ${pronunciationLead.fix ?? ''}`.toLowerCase()
    if (/\b(final|ending|end|last)\b/.test(joined)) return `Slow down the final word “${word}”.`
    if (/\bstress|emphasis\b/.test(joined)) return `Stress “${word}” more clearly.`
    if (/\blong|vowel|hold\b/.test(joined)) return `Hold “${word}” a bit longer.`
    return `Say “${word}” more clearly.`
  }

  const weakWord = (turn.audioCoaching?.wordAssessments ?? [])
    .filter((word) => word.status === 'weak' || word.status === 'unclear')
    .sort((left, right) => left.score - right.score)[0]
  if (weakWord?.word?.trim()) return `Say “${weakWord.word.trim()}” more clearly.`

  const fluencyLead = turn.fluencyIssues[0]?.segment?.trim()
  if (fluencyLead) return `Slow down “${fluencyLead}”.`

  const finding = sanitizeCoachText(turn.audioFindings[0]).trim()
  return compactCollapsedSummaryLine(finding)
}

/** UI-only adapter for collapsed sentence rows. Keeps summary generation out of the backend contract. */
function buildCollapsedSentenceSummaryAdapter(opts: {
  turn: TurnEvaluation
  corrections: WordCorrection[]
  preferredMainFix: string | null
  topProblem: string | null
  hasScenarioGap: boolean
}): SentenceCollapsedSummaryAdapter {
  const { turn, corrections, preferredMainFix, topProblem, hasScenarioGap } = opts

  const preferredLine = compactCollapsedSummaryLine(preferredMainFix)
  if (preferredLine) return { line: preferredLine }

  const explicitMainFixes = [
    turn.mainFixLine,
    turn.sentenceGroundedReview?.mainFix,
  ]
    .map((text) => sanitizeCoachText(text).replace(/^Main fix:\s*/i, '').trim())
    .filter((text) => text && !isVagueDutchWordingMainFix(text))

  const directMainFix = compactCollapsedSummaryLine(explicitMainFixes[0])
  if (directMainFix) return { line: directMainFix }

  const wordPair = corrections.find((row) => row.wrong.trim() && row.correction.trim())
  if (wordPair) {
    const gloss = englishGlossForDutchWord(wordPair.correction)
    const withMeaning = gloss ? `Use “${wordPair.correction}” (${gloss}), not “${wordPair.wrong}”.` : null
    const line = compactCollapsedSummaryLine(withMeaning) ?? compactCollapsedSummaryLine(`Use “${wordPair.correction}”, not “${wordPair.wrong}”.`)
    if (line) return { line }
  }

  const voiceLine = compactCollapsedSummaryLine(collapsedVoiceSummary(turn))
  if (voiceLine) return { line: voiceLine }

  if (hasScenarioGap) {
    const scenarioGoal = turn.scenarioGoalFit?.relevantGoals?.[0] ?? turn.scenarioGoalTags?.[0] ?? null
    const line = compactCollapsedSummaryLine(collapsedScenarioSummary(scenarioGoal))
    if (line) return { line }
  }

  const grammarCandidate = compactCollapsedSummaryLine(
    turn.transcriptCoaching.issues[0]?.fix
    || turn.transcriptCoaching.issues[0]?.issue
    || topProblem
    || turn.sentenceGroundedReview?.mainFix
    || turn.mainFixLine,
  )
  if (grammarCandidate) return { line: grammarCandidate }

  return { line: null }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO CONTROLLER — page-level, one clip at a time
// ═══════════════════════════════════════════════════════════════════════════

type PlaybackMode = 'learner' | 'reference' | 'compare'
type PlaybackState = 'idle' | 'loading' | 'playing' | 'error'

type ReferencePlaybackProgress = {
  turnId: string
  text: string
  currentTime: number
  duration: number
  wordBoundaries?: SpeakLiveTtsWordBoundary[]
} | null

type AudioController = {
  activeKey: string | null
  activeMode: PlaybackMode | null
  state: PlaybackState
  referenceProgress: ReferencePlaybackProgress
  playLearner: (turnId: string, url: string) => void
  playReference: (turnId: string, url: string, text?: string, wordBoundaries?: SpeakLiveTtsWordBoundary[]) => void
  playCompare: (turnId: string, learnerUrl: string, refUrl: string, text?: string) => void
  stop: () => void
  isActive: (turnId: string, mode: PlaybackMode, text?: string | null) => boolean
}

function useReportAudioController(): AudioController {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<PlaybackMode | null>(null)
  const [state, setState] = useState<PlaybackState>('idle')
  const [referenceProgress, setReferenceProgress] = useState<ReferencePlaybackProgress>(null)
  const audioA = useRef<HTMLAudioElement | null>(null)
  const audioB = useRef<HTMLAudioElement | null>(null)
  const comparePhase = useRef<'a' | 'b' | null>(null)

  const cleanup = useCallback(() => {
    for (const el of [audioA.current, audioB.current]) {
      if (el) {
        el.pause()
        el.onended = null
        el.onerror = null
        el.oncanplaythrough = null
        el.onplaying = null
        el.ontimeupdate = null
        el.onloadedmetadata = null
      }
    }
    comparePhase.current = null
    setReferenceProgress(null)
  }, [])

  const stop = useCallback(() => { cleanup(); setActiveKey(null); setActiveMode(null); setState('idle') }, [cleanup])

  useEffect(() => () => cleanup(), [cleanup])

  const playSingle = useCallback((
    turnId: string,
    url: string,
    mode: PlaybackMode,
    text?: string,
    wordBoundaries?: SpeakLiveTtsWordBoundary[],
  ) => {
    cleanup()
    setActiveKey(`${turnId}-${mode}`)
    setActiveMode(mode)
    setState('loading')
    console.log(`[Audio] playSingle ${mode} url=${url?.slice(0, 80)}`)
    const a = new Audio()
    audioA.current = a
    a.onplaying = () => { console.log('[Audio] playing'); setState('playing') }
    a.onended = () => { setReferenceProgress(null); setActiveKey(null); setActiveMode(null); setState('idle') }
    a.onerror = (e) => { console.error('[Audio] playback error', a.error?.code, a.error?.message, e); setState('error') }
    a.onloadedmetadata = () => {
      console.log(`[Audio] metadata loaded: duration=${a.duration} type=${a.currentSrc?.slice(0, 50)}`)
      if (mode === 'reference' && text?.trim()) {
        setReferenceProgress({
          turnId,
          text: text.trim(),
          currentTime: 0,
          duration: Number.isFinite(a.duration) && a.duration > 0 ? a.duration : 0,
          wordBoundaries: wordBoundaries?.length ? wordBoundaries : undefined,
        })
      }
    }
    a.ontimeupdate = () => {
      if (mode === 'reference' && text?.trim()) {
        setReferenceProgress({
          turnId,
          text: text.trim(),
          currentTime: a.currentTime,
          duration: Number.isFinite(a.duration) && a.duration > 0 ? a.duration : 0,
          wordBoundaries: wordBoundaries?.length ? wordBoundaries : undefined,
        })
      }
    }
    a.src = url
    void a.play().then(() => setState('playing')).catch((err) => {
      console.warn('[Audio] initial play() rejected, trying load()', err)
      a.oncanplaythrough = () => { void a.play().catch((e2) => { console.error('[Audio] canplaythrough play() failed', e2); setState('error') }) }
      a.load()
    })
  }, [cleanup])

  const playLearner = useCallback((tid: string, url: string) => playSingle(tid, url, 'learner'), [playSingle])
  const playReference = useCallback(
    (tid: string, url: string, text?: string, wordBoundaries?: SpeakLiveTtsWordBoundary[]) =>
      playSingle(tid, url, 'reference', text, wordBoundaries),
    [playSingle],
  )

  const playCompare = useCallback((turnId: string, learnerUrl: string, refUrl: string, text?: string) => {
    cleanup()
    setActiveKey(`${turnId}-compare`)
    setActiveMode('compare')
    setState('loading')
    comparePhase.current = 'a'
    const a = new Audio(learnerUrl)
    const b = new Audio(refUrl)
    audioA.current = a; audioB.current = b
    a.onplaying = () => setState('playing')
    a.onended = () => { comparePhase.current = 'b'; setTimeout(() => { void b.play().catch(() => setState('error')) }, 400) }
    a.onerror = () => setState('error')
    b.onloadedmetadata = () => {
      if (text?.trim()) {
        setReferenceProgress({
          turnId,
          text: text.trim(),
          currentTime: 0,
          duration: Number.isFinite(b.duration) && b.duration > 0 ? b.duration : 0,
        })
      }
    }
    b.ontimeupdate = () => {
      if (text?.trim()) {
        setReferenceProgress({
          turnId,
          text: text.trim(),
          currentTime: b.currentTime,
          duration: Number.isFinite(b.duration) && b.duration > 0 ? b.duration : 0,
        })
      }
    }
    b.onended = () => { setReferenceProgress(null); setActiveKey(null); setActiveMode(null); setState('idle'); comparePhase.current = null }
    b.onerror = () => setState('error')
    void a.play().then(() => setState('playing')).catch(() => {
      a.oncanplaythrough = () => { if (comparePhase.current === 'a') { void a.play().catch(() => setState('error')) } }
      a.load()
    })
  }, [cleanup])

  const isActive = useCallback((
    turnId: string,
    mode: PlaybackMode,
    text?: string | null,
  ) => {
    if (activeKey !== `${turnId}-${mode}`) return false
    if (mode !== 'reference' || !text?.trim()) return true
    return referenceProgress?.turnId === turnId && referenceProgress.text.trim() === text.trim()
  }, [activeKey, referenceProgress])

  return { activeKey, activeMode, state, referenceProgress, playLearner, playReference, playCompare, stop, isActive }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO CONTROLS per sentence — visual state for You / Native / Compare
// ═══════════════════════════════════════════════════════════════════════════

function SentenceAudioControls({ turnId, learnerSrc, refSrc, referenceText, onPlaySnippet, audio, hideMissingLearnerHint = false }: {
  turnId: string
  learnerSrc: string | null
  refSrc: string | null
  referenceText?: string | null
  onPlaySnippet?: (turnId: string, text: string) => Promise<void>
  audio: AudioController
  hideMissingLearnerHint?: boolean
}) {
  const learnerActive = audio.isActive(turnId, 'learner')
  const refActive = audio.isActive(turnId, 'reference', referenceText)
  const compareActive = audio.isActive(turnId, 'compare')
  const isPlaying = audio.state === 'playing'
  const isLoading = audio.state === 'loading'
  const [snippetLoading, setSnippetLoading] = useState(false)
  const effectiveLoading = isLoading || snippetLoading

  function btnCls(active: boolean, v: 'learner' | 'ref' | 'compare') {
    const b = 'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold active:scale-[0.97] transition-all'
    if (active && isPlaying) {
      return v === 'learner' ? `${b} border-violet-400 bg-violet-100 text-violet-900 ring-1 ring-violet-300`
        : v === 'ref' ? `${b} border-emerald-400 bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300`
        : `${b} border-violet-400 bg-violet-100 text-violet-900 ring-1 ring-violet-300`
    }
    if (active && effectiveLoading) return `${b} border-slate-300 bg-slate-100 text-slate-600 animate-pulse`
    return v === 'learner' ? `${b} border-slate-200 bg-white text-ink-primary hover:bg-slate-50`
      : v === 'ref' ? `${b} border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100`
      : `${b} border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100`
  }

  function handleClick(mode: 'learner' | 'reference' | 'compare') {
    if (audio.isActive(turnId, mode, mode === 'reference' ? referenceText : undefined) && (isPlaying || effectiveLoading)) { audio.stop(); return }
    if (mode === 'learner' && learnerSrc) audio.playLearner(turnId, learnerSrc)
    else if (mode === 'reference') {
      if (referenceText?.trim() && onPlaySnippet) {
        setSnippetLoading(true)
        void onPlaySnippet(turnId, referenceText).finally(() => setSnippetLoading(false))
      } else if (refSrc) {
        audio.playReference(turnId, refSrc, referenceText ?? undefined)
      }
    } else if (mode === 'compare' && learnerSrc) {
      if (refSrc) {
        audio.playCompare(turnId, learnerSrc, refSrc, referenceText ?? undefined)
      }
    }
  }

  const PIcon = ({ active }: { active: boolean }) =>
    active && isPlaying ? <Pause className="h-3.5 w-3.5" /> :
    active && effectiveLoading ? <Square className="h-3 w-3" /> :
    <Play className="h-3.5 w-3.5" />

  const hasError = audio.state === 'error' && (audio.isActive(turnId, 'learner') || audio.isActive(turnId, 'reference', referenceText) || audio.isActive(turnId, 'compare'))

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {learnerSrc ? (
          <button type="button" onClick={() => handleClick('learner')} className={btnCls(learnerActive, 'learner')}>
            <PIcon active={learnerActive} />Your recording
          </button>
        ) : null}
        {(refSrc || referenceText?.trim()) ? (
          <button type="button" onClick={() => handleClick('reference')} className={btnCls(refActive, 'ref')}>
            <PIcon active={refActive} />Dutch reference
          </button>
        ) : null}
        {learnerSrc && (refSrc || referenceText?.trim()) ? (
          <button type="button" onClick={() => handleClick('compare')} className={btnCls(compareActive, 'compare')}>
            {compareActive && isPlaying ? <Pause className="h-3.5 w-3.5" /> : <ArrowLeftRight className="h-3.5 w-3.5" />}
            Compare
          </button>
        ) : null}
      </div>
      {!learnerSrc && !hideMissingLearnerHint ? (
        <p className="text-[10px] text-slate-400 flex items-center gap-1"><MicOff className="h-3 w-3" />Your recording was not available for this sentence.</p>
      ) : null}
      {learnerSrc && !refSrc && !referenceText?.trim() ? (
        <p className="text-[10px] text-slate-400">Reference audio is not available yet.</p>
      ) : null}
      {hasError ? <p className="text-[10px] text-rose-500">Playback failed. Try again.</p> : null}
    </div>
  )
}

function ReferencePlaybackButton({ turnId, refSrc, snippetText, onPlaySnippet, audio, label = 'Dutch reference' }: {
  turnId: string
  refSrc: string | null
  snippetText?: string | null
  onPlaySnippet?: (turnId: string, text: string) => Promise<void>
  audio: AudioController
  label?: string
}) {
  const [snippetLoading, setSnippetLoading] = useState(false)
  if (!refSrc && !snippetText?.trim()) return null
  const active = audio.isActive(turnId, 'reference', snippetText)
  const isPlaying = audio.state === 'playing'
  const isLoading = (active && audio.state === 'loading') || snippetLoading
  const className = active && isPlaying
    ? 'inline-flex items-center gap-1.5 rounded-lg border border-emerald-400 bg-emerald-100 px-3 py-1.5 text-[11px] font-semibold text-emerald-900 ring-1 ring-emerald-300'
    : active && isLoading
      ? 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600 animate-pulse'
      : 'inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100'

  return (
    <button
      type="button"
      onClick={async () => {
        if (active && (isPlaying || isLoading)) {
          audio.stop()
          return
        }
        if (snippetText?.trim() && onPlaySnippet) {
          setSnippetLoading(true)
          try {
            await onPlaySnippet(turnId, snippetText)
          } finally {
            setSnippetLoading(false)
          }
          return
        }
        if (refSrc) {
          audio.playReference(turnId, refSrc)
        }
      }}
      className={className}
    >
      {active && isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      {label}
    </button>
  )
}

function ReferenceTextHighlight({ text, turnId, audio, className }: {
  text: string
  turnId: string
  audio: AudioController
  className?: string
}) {
  const progress = audio.referenceProgress
  const activeForText =
    progress &&
    progress.turnId === turnId &&
    progress.text.trim() === text.trim() &&
    progress.duration > 0
      ? progress
      : null

  const activeBoundaryIndex = activeForText ? getActiveReferenceBoundaryIndex(activeForText) : -1
  const segments = activeBoundaryIndex >= 0
    ? buildBoundaryOrderHighlightSegments(text, activeBoundaryIndex)
    : buildApproximateHighlightSegments(text, activeForText)
  return (
    <p className={className}>
      {segments.map((segment) => {
        return (
          <span
            key={segment.key}
            className={segment.active ? 'rounded bg-emerald-100 px-1 py-0.5 text-emerald-950 transition-colors' : undefined}
          >
            {segment.text}
          </span>
        )
      })}
    </p>
  )
}

function ReferenceWordHighlight({ word, turnId, audio }: { word: string; turnId: string; audio: AudioController }) {
  const active =
    audio.referenceProgress &&
    audio.referenceProgress.turnId === turnId &&
    audio.referenceProgress.text.trim().toLowerCase() === word.trim().toLowerCase()
  return (
    <span className={active ? 'inline-flex rounded-md bg-emerald-100 px-2 py-1 text-emerald-950 ring-1 ring-emerald-200 transition-colors' : 'inline-flex rounded-md bg-slate-50 px-2 py-1'}>
      {word}
    </span>
  )
}

function getActiveReferenceBoundaryIndex(progress: NonNullable<ReferencePlaybackProgress>): number {
  const boundaries = progress.wordBoundaries ?? []
  if (boundaries.length === 0) return -1
  const currentMs = Math.max(progress.currentTime * 1000, 0)
  let activeIdx = -1
  for (let idx = 0; idx < boundaries.length; idx += 1) {
    const boundary = boundaries[idx]!
    if (currentMs < boundary.audioOffsetMs) break
    activeIdx = idx
  }
  return activeIdx
}

function buildBoundaryOrderHighlightSegments(
  text: string,
  activeBoundaryIndex: number,
): Array<{ key: string; text: string; active: boolean }> {
  const wordMatches = Array.from(text.matchAll(/\S+/g))
  const activeWordIndex = Math.min(Math.max(wordMatches.length - 1, 0), activeBoundaryIndex)
  let wordIdx = -1
  return text.split(/(\s+)/).map((part, idx) => {
    if (/^\s+$/.test(part)) return { key: `space-${idx}`, text: part, active: false }
    wordIdx += 1
    return { key: `word-${idx}`, text: part, active: wordIdx === activeWordIndex }
  })
}

function buildApproximateHighlightSegments(
  text: string,
  activeForText: NonNullable<ReferencePlaybackProgress> | null,
): Array<{ key: string; text: string; active: boolean }> {
  const wordMatches = Array.from(text.matchAll(/\S+/g))
  const activeWordIndex = activeForText
    ? Math.min(
        Math.max(wordMatches.length - 1, 0),
        Math.floor((activeForText.currentTime / activeForText.duration) * Math.max(wordMatches.length, 1)),
      )
    : -1
  let wordIdx = -1
  return text.split(/(\s+)/).map((part, idx) => {
    if (/^\s+$/.test(part)) return { key: `space-${idx}`, text: part, active: false }
    wordIdx += 1
    return { key: `word-${idx}`, text: part, active: wordIdx === activeWordIndex }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE BAR — trust-first bands (aligned with backend verdictForDisplayScore)
// ═══════════════════════════════════════════════════════════════════════════

/** Strong ≥87 · Solid 72–86 · Developing 56–71 · Needs focus <56 */
type ReportScoreBand = 'strong' | 'solid' | 'developing' | 'needs'

function reportScoreBand(score: number | null): ReportScoreBand {
  if (score == null) return 'solid'
  if (score >= 87) return 'strong'
  if (score >= 72) return 'solid'
  if (score >= 56) return 'developing'
  return 'needs'
}

const REPORT_SCORE_VISUAL: Record<ReportScoreBand, { fill: string; track: string; num: string; verdict: string }> = {
  strong: {
    fill: 'bg-emerald-600',
    track: 'bg-emerald-100/90',
    num: 'text-emerald-950',
    verdict: 'border border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  solid: {
    fill: 'bg-violet-600',
    track: 'bg-violet-100/90',
    num: 'text-sky-950',
    verdict: 'border border-violet-200 bg-violet-50 text-violet-900',
  },
  developing: {
    fill: 'bg-amber-500',
    track: 'bg-amber-100/90',
    num: 'text-amber-950',
    verdict: 'border border-amber-200 bg-amber-50 text-amber-950',
  },
  needs: {
    fill: 'bg-rose-600',
    track: 'bg-rose-100/90',
    num: 'text-rose-950',
    verdict: 'border border-rose-200 bg-rose-50 text-rose-900',
  },
}

function ScoreBar({ score, max = 100 }: { score: number | null; max?: number }) {
  if (score == null) return null
  const pct = Math.min(100, Math.max(0, (score / max) * 100))
  const band = reportScoreBand(score)
  const v = REPORT_SCORE_VISUAL[band]
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={`flex-1 h-2 rounded-full overflow-hidden ${v.track}`}>
        <div className={`h-full rounded-full ${v.fill} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[12px] font-bold tabular-nums shrink-0 w-8 text-right ${v.num}`}>{Math.round(score)}</span>
    </div>
  )
}

function DimensionRow({ dim }: { dim: ScoredDimension }) {
  const justification = shortenCoachBullet(sanitizeCoachText(dim.meaning ?? ''), 130)
  const band = reportScoreBand(dim.score)
  const v = REPORT_SCORE_VISUAL[band]
  return (
    <div className="py-2 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="text-[13px] font-semibold text-ink-primary truncate flex-1">{dim.label}</p>
        {dim.score != null && dim.verdict ? (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${v.verdict}`}>{dim.verdict}</span>
        ) : null}
      </div>
      <ScoreBar score={dim.score} />
      {justification ? <p className="text-[11px] text-ink-secondary leading-snug mt-1.5">{justification}</p> : null}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// GOAL ROW
// ═══════════════════════════════════════════════════════════════════════════

function GoalRow({ goal }: { goal: GoalEvidence }) {
  const icon = goal.status === 'completed'
    ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
    : goal.status === 'partial'
      ? <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
      : <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
  const weightPct = goal.weight != null ? Math.round(goal.weight * 100) : null
  const stateLabel =
    goal.status === 'completed' ? 'completed' : goal.status === 'partial' ? 'partial' : goal.tier === 'stretch' ? 'not completed' : 'missing'
  const stateTone =
    goal.status === 'completed'
      ? 'text-emerald-700'
      : goal.status === 'partial'
        ? 'text-amber-700'
        : goal.tier === 'stretch'
          ? 'text-slate-500'
          : 'text-rose-600'
  const cardTint =
    goal.status === 'completed'
      ? 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-white shadow-[0_10px_28px_-18px_rgba(5,150,105,0.25)]'
      : goal.status === 'partial'
        ? 'border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-white shadow-[0_10px_28px_-18px_rgba(217,119,6,0.2)]'
        : 'border-slate-200/90 bg-white/90 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.3)]'
  return (
    <div className={`rounded-2xl border px-4 py-3.5 ${cardTint}`}>
      <div className="flex gap-3">
      {icon}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-[13px] font-semibold text-ink-primary leading-snug">
            {stripSpeakLiveGoalIdBrackets(goal.goalLabel)}
          </p>
          <span className={`text-[11px] font-semibold ${stateTone}`}>{stateLabel}</span>
          {weightPct != null ? (
            <span className="rounded-full bg-violet-100/90 px-2 py-0.5 text-[10px] font-semibold text-violet-900 ring-1 ring-violet-200/80">
              {weightPct}% weight
            </span>
          ) : null}
        </div>
        {goal.status === 'completed' && goal.evidenceText ? (
          <p className="mt-1.5 text-[12px] text-ink-secondary leading-relaxed">
            &ldquo;{goal.evidenceText.slice(0, 100)}{goal.evidenceText.length > 100 ? '…' : ''}&rdquo;
          </p>
        ) : goal.completionHint ? (
          <p className="mt-1.5 text-[12px] text-ink-secondary leading-snug">
            <span className="font-semibold text-ink-primary">Try:</span>{' '}
            &ldquo;{shortenCoachBullet(sanitizeCoachText(goal.completionHint), 120)}&rdquo;
          </p>
        ) : (
          <p className="mt-1.5 text-[12px] text-slate-500">Not covered in this session.</p>
        )}
      </div>
      </div>
    </div>
  )
}

function FocusAreaCard({
  focus,
  reportTitle,
  retryHref,
  priorityTurnId,
  priorityLearnerLine,
  saving,
  savedKeys,
  onSave,
}: {
  focus: FocusArea
  reportTitle: string
  retryHref: string
  priorityTurnId: string | null
  priorityLearnerLine: string | null
  saving: string | null
  savedKeys: Set<string>
  onSave: (input: Record<string, unknown>) => void
}) {
  const ctaLabel = focus.cta === 'practice_now' ? 'Practice this now'
    : focus.cta === 'retry_scenario' ? 'Retry this scenario'
    : 'Save this phrase'
  const example = (focus.exampleLine ?? '').trim()
  const focusSaveKey =
    `focus-save-phrase-${priorityTurnId ?? 'na'}-${example.slice(0, 48).replace(/\s+/g, '-')}`
  const scenarioLabel = reportTitle.trim()
  const yourLineRaw = (focus.learnerOriginalLine ?? priorityLearnerLine ?? '').trim()
  const yourLine =
    yourLineRaw.length > 320 ? `${sanitizeCoachText(yourLineRaw.slice(0, 317))}…` : sanitizeCoachText(yourLineRaw)

  return (
    <section className="rounded-[28px] border border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-white to-violet-50/80 p-5 shadow-[0_20px_44px_-28px_rgba(109,40,217,0.35)] ring-1 ring-violet-100/60">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-800/90">Fix this next</p>
          <p className="text-[20px] font-semibold tracking-tight text-ink-primary leading-tight">
            {stripSpeakLiveGoalIdBrackets(focus.label)}
          </p>
          {scenarioLabel ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700/75">Scenario · {scenarioLabel}</p>
          ) : null}
        </div>
        {yourLine ? (
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600/90">Your line</p>
            <p className="mt-1.5 text-[14px] font-medium leading-snug text-ink-primary break-words">&ldquo;{yourLine}&rdquo;</p>
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-violet-100/90 bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-700/90">Context</p>
            <p className="mt-1.5 text-[13px] text-ink-primary leading-snug">{sanitizeCoachText(focus.why)}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-violet-900 via-sky-950 to-indigo-950 px-4 py-3.5 text-white shadow-[0_14px_32px_-18px_rgba(30,58,138,0.75)] ring-1 ring-violet-700/40">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-200/90">Try this</p>
            <p className="mt-1.5 text-[15px] font-semibold leading-snug text-white">
              {example ? `“${sanitizeCoachText(example)}”` : 'Use the model line on your next try.'}
            </p>
          </div>
        </div>
        {focus.cta === 'retry_scenario' ? (
          <a
            href={retryHref}
            className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-[13px] font-semibold text-white shadow-[0_16px_30px_-20px_rgba(124,58,237,0.8)] transition hover:bg-violet-500 active:scale-[0.99]"
          >
            <ArrowRight className="h-4 w-4" />
            {ctaLabel}
          </a>
        ) : null}
        {focus.cta === 'practice_now' ? (
          <a
            href={retryHref}
            className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-[13px] font-semibold text-white shadow-[0_16px_30px_-20px_rgba(5,150,105,0.55)] transition hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99]"
          >
            <Play className="h-4 w-4" />
            {ctaLabel}
          </a>
        ) : null}
        {focus.cta === 'save_phrase' ? (
          <SaveButton
            busyKey={focusSaveKey}
            saving={saving}
            savedKeys={savedKeys}
            label={example ? ctaLabel : 'Nothing to save yet'}
            savedLabel="Saved to practice"
            idle={`inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl border-2 border-violet-300 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-[13px] font-semibold text-white shadow-[0_14px_28px_-16px_rgba(124,58,237,0.55)] transition hover:from-violet-500 hover:to-fuchsia-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50`}
            done="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-400 bg-emerald-600 px-4 py-3 text-[13px] font-semibold text-white disabled:opacity-60"
            disabled={!example}
            onClick={() => {
              if (!example) return
              onSave({
                type: 'save_phrase',
                title: `Focus: ${example.slice(0, 52)}`,
                content: [
                  priorityLearnerLine ? `Your line: ${priorityLearnerLine}` : 'Your line: (see session)',
                  `Model line: ${example}`,
                  `Scenario: ${reportTitle}`,
                  focus.why ? `Why: ${sanitizeCoachText(focus.why)}` : '',
                ].filter(Boolean).join('\n'),
                sourceTurnId: priorityTurnId,
                saveBusyKey: focusSaveKey,
                learnerOriginalSentence: priorityLearnerLine ?? '',
                improvedSentence: example,
                tagCategory: 'phrasing_upgrade',
                suggestedTrainingMode: null,
              })
            }}
          />
        ) : null}
      </div>
    </section>
  )
}

function ProgressionSignalSection({ progression }: { progression: SpeakingProgressSummary | null }) {
  const items: Array<{ tone: 'up' | 'down' | 'steady'; text: string }> = []
  if (!progression || progression.sampleSize < 2) {
    return (
      <section className="rounded-3xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.35)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-tertiary">Recent progress</p>
        <p className="mt-2 text-[13px] text-ink-secondary leading-snug">First tracked run for this scenario.</p>
      </section>
    )
  }

  if (progression.pronunciation.trend === 'improving') {
    items.push({ tone: 'up', text: progression.pronunciation.note || 'Pronunciation is steadier than your recent sessions.' })
  }
  if (progression.rhythm.trend === 'improving') {
    items.push({ tone: 'up', text: progression.rhythm.note || 'Rhythm and pacing are getting smoother.' })
  }
  for (const area of progression.improvingAreas.slice(0, 2)) {
    if (items.length >= 3) break
    items.push({ tone: 'up', text: area })
  }
  for (const weak of progression.repeatedWeakAreas.slice(0, 2)) {
    if (items.length >= 3) break
    items.push({ tone: 'down', text: weak.startsWith('Still') ? weak : `Still working on: ${weak}` })
  }
  if (items.length === 0) {
    items.push({
      tone: 'steady',
      text: progression.pronunciation.note || 'Your speaking is steady. Keep pushing the same core habit next session.',
    })
  }

  return (
    <section className="rounded-3xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.35)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-tertiary">Recent progress</p>
          <p className="mt-1 text-[13px] text-ink-secondary leading-snug">What&apos;s shifting in your speaking.</p>
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {items.slice(0, 3).map((item, i) => (
          <li key={`${item.text}-${i}`} className="flex gap-3 rounded-2xl bg-slate-50 px-3.5 py-3 text-[13px] text-ink-primary">
            <span className="mt-0.5 shrink-0">
              {item.tone === 'up' ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : item.tone === 'down' ? (
                <TrendingDown className="h-4 w-4 text-amber-600" />
              ) : (
                <Minus className="h-4 w-4 text-slate-500" />
              )}
            </span>
            <span className="leading-relaxed">{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// EVALUATION UNAVAILABLE PAGE
// ═══════════════════════════════════════════════════════════════════════════

function EvalUnavailablePage({ isUnavailable, noAudio, noModel, userMsg, debugInfo, fullError, sessionId, onRetry, onRestart, onBack, onRecap }: {
  isUnavailable: boolean; noAudio: boolean; noModel: boolean
  userMsg: string; debugInfo: string | null; fullError: string; sessionId: string
  onRetry: () => void; onRestart: () => void; onBack: () => void; onRecap: () => void
}) {
  const [showDebug, setShowDebug] = useState(false)

  return (
    <div className="min-h-[100dvh] bg-white px-5 py-16 max-w-md mx-auto flex flex-col items-center gap-5 text-center">
      <div className="flex items-center justify-center h-14 w-14 rounded-full bg-slate-100">
        {noAudio ? <MicOff className="h-7 w-7 text-slate-400" /> : <AlertCircle className="h-7 w-7 text-slate-400" />}
      </div>
      <div className="space-y-2">
        <h1 className="text-[18px] font-bold text-ink-primary">
          {isUnavailable ? 'Evaluation not available' : 'Something went wrong'}
        </h1>
        <p className="text-[14px] text-ink-secondary leading-relaxed">
          {noAudio
            ? 'No voice recording was captured during this session. The evaluation report requires a recording of your spoken Dutch to provide useful feedback.'
            : noModel
              ? 'The coaching model could not process this session right now. This is usually temporary.'
              : userMsg || 'We couldn\u2019t process this session.'}
        </p>
      </div>
      {noAudio ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-left w-full">
          <p className="text-[13px] font-semibold text-ink-primary mb-1.5">What to do next</p>
          <ul className="space-y-1.5 text-[13px] text-ink-secondary leading-relaxed">
            <li className="flex gap-2"><span className="text-slate-400 shrink-0">1.</span>Check that your microphone is connected and allowed in your browser.</li>
            <li className="flex gap-2"><span className="text-slate-400 shrink-0">2.</span>Try the scenario again — your voice will be recorded automatically.</li>
          </ul>
        </div>
      ) : null}
      <div className="flex flex-col gap-2.5 w-full">
        {!noAudio ? (
          <button type="button" className="rounded-xl bg-slate-900 px-5 py-3 text-[13px] font-semibold text-white w-full"
            onClick={onRetry}>Try again</button>
        ) : null}
        {!noAudio ? (
          <button type="button" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-[13px] font-semibold text-slate-900 w-full"
            onClick={onRestart}>Restart report from scratch</button>
        ) : null}
        <button type="button" className="rounded-xl bg-slate-900 px-5 py-3 text-[13px] font-semibold text-white w-full"
          onClick={onBack}>
          {noAudio ? 'Try the scenario again' : 'Back to Talk hub'}
        </button>
        <button type="button" className="text-[12px] text-slate-500 hover:underline" onClick={onRecap}>Read the conversation instead</button>
      </div>

      {/* Debug / technical details */}
      <div className="w-full pt-3 border-t border-slate-100">
        <button type="button" onClick={() => setShowDebug(d => !d)}
          className="text-[11px] font-medium text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto">
          {showDebug ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Technical details
        </button>
        {showDebug ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left space-y-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Session ID</p>
              <p className="text-[11px] font-mono text-ink-secondary break-all">{sessionId}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Error</p>
              <p className="text-[11px] font-mono text-ink-secondary break-all leading-relaxed">{fullError}</p>
            </div>
            {debugInfo ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Validation issues</p>
                <ul className="space-y-1">
                  {debugInfo.split('; ').map((issue, i) => (
                    <li key={i} className="text-[11px] font-mono text-rose-600 leading-relaxed">{issue}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Timestamp</p>
              <p className="text-[11px] font-mono text-ink-secondary">{new Date().toISOString()}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// WORD EVIDENCE (VOICE — pronunciation chips from Azure)
// ═══════════════════════════════════════════════════════════════════════════

/** Aligned with session score bands: ≥86 strong, ≥70 solid, ≥52 developing, else needs work */
const WORD_STATUS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  strong: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-900', dot: 'bg-emerald-600', label: 'Strong' },
  okay: { bg: 'bg-violet-50 border-violet-200', text: 'text-violet-900', dot: 'bg-violet-600', label: 'Solid' },
  weak: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-950', dot: 'bg-amber-500', label: 'Developing' },
  unclear: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-900', dot: 'bg-rose-600', label: 'Needs work' },
}

function WordDetailPanel({ w, onClose, turnId, referenceText, onPlaySnippet, audio }: {
  w: WordAssessmentResult; onClose: () => void
  turnId: string; referenceText: string | null; onPlaySnippet: (turnId: string, text: string) => Promise<void>; audio: AudioController
}) {
  const s = WORD_STATUS[w.status] ?? WORD_STATUS.okay
  const needsWork = w.status === 'weak' || w.status === 'unclear'
  const refActive = audio.isActive(turnId, 'reference', w.word)
  const isPlaying = refActive && audio.state === 'playing'
  const [snippetLoading, setSnippetLoading] = useState(false)
  const isLoading = (refActive && audio.state === 'loading') || snippetLoading

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
        <p className="text-[15px] font-bold text-ink-primary">&ldquo;{w.word}&rdquo;</p>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.text}`}>{s.label} &middot; {Math.round(w.score)}</span>
      </div>
      {w.issueType ? <p className="px-4 text-[11px] text-ink-secondary leading-relaxed">{w.issueType === 'vowel' ? 'Vowel sound' : w.issueType === 'consonant' ? 'Consonant sound' : w.issueType === 'stress' ? 'Word stress' : w.issueType === 'pronunciation' ? 'Pronunciation' : w.issueType}</p> : null}
      {w.instruction ? <p className="px-4 pt-1.5 text-[12px] text-ink-primary leading-relaxed">{w.instruction}</p> : null}
      {needsWork ? (
        <div className="px-4 pt-2">
          <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Reference word</p>
            <p className="mt-1 text-[12px] font-medium text-ink-primary leading-relaxed">
              <ReferenceWordHighlight word={w.word} turnId={turnId} audio={audio} />
            </p>
          </div>
          {referenceText?.trim() ? (
            <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Reference sentence</p>
              <ReferenceTextHighlight
                text={referenceText}
                turnId={turnId}
                audio={audio}
                className="mt-1 text-[12px] font-medium text-ink-primary leading-relaxed"
              />
            </div>
          ) : null}
          <button type="button"
            onClick={async () => {
              if (isPlaying || isLoading) { audio.stop(); return }
              setSnippetLoading(true)
              try {
                await onPlaySnippet(turnId, w.word)
              } finally {
                setSnippetLoading(false)
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold active:scale-[0.97] transition-all ${
              isPlaying ? 'border-emerald-400 bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300'
              : isLoading ? 'border-slate-300 bg-slate-100 text-slate-600 animate-pulse'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
            }`}>
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isPlaying ? 'Pause' : `Hear “${w.word}”`}
          </button>
          <p className="text-[10px] text-ink-tertiary mt-1.5">This plays the selected reference word. Use the sentence reference above if you want to hear it in context.</p>
        </div>
      ) : null}
      <div className="px-4 pt-2 pb-3"><button type="button" onClick={onClose} className="text-[11px] font-medium text-ink-tertiary hover:text-ink-secondary">Close</button></div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// WRONG WORD DETECTION — language-based, works without audio
// Parses transcriptCoaching.issues and feedbackItems for word-level errors.
// ═══════════════════════════════════════════════════════════════════════════

function wrongDetectionsToCorrections(d: WrongWordDetection[]): WordCorrection[] {
  return d.map((w) => ({
    wrong: w.observedToken,
    correction: w.suggestedCorrection,
    explanation: w.uncertainHearing
      ? `Heard “${w.observedToken}” — use “${w.suggestedCorrection}”.`
      : w.whyItMatters ?? '',
  }))
}

function strArrUnknown(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => String(x).trim()).filter(Boolean)
}

function isVagueDutchWordingMainFix(text: string): boolean {
  const t = sanitizeCoachText(text).toLowerCase().trim()
  if (!t || t.length > 160) return false
  if (/more natural dutch word here/.test(t)) return true
  if (/use the more natural dutch word/.test(t)) return true
  if (/use (a |the )?more natural dutch/i.test(t) && !/[«""''„].+[»""'']/.test(t)) return true
  if (/try (a |the )?more natural dutch/i.test(t)) return true
  if (/sounds more natural|learner dutch|more natural version/i.test(t) && t.length < 100 && !/[«""“].{2,}[»""”]/.test(t)) return true
  return false
}

/** “Van witter station” → call out **welk** vs mis-heard middle word. */
function coachLineVanWelkStationFragment(transcript: string): string | null {
  const raw = transcript.trim()
  const m = /^van\s+([a-zà-ÿ]+)\s+station\.?$/i.exec(raw)
  if (!m) return null
  const heard = m[1].trim()
  if (/^welk(e)?$/i.test(heard)) return null
  return `Use “welk” (which), not “${heard}”. Full line: “Van welk station vertrekt de trein?”`
}

function insightKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9äöüëïà-ÿ]+/gi, ' ').trim().slice(0, 88)
}

function isSameCoachingIdea(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = insightKey(sanitizeCoachText(a))
  const right = insightKey(sanitizeCoachText(b))
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
}

function dedupeCoachItems(
  items: Array<string | null | undefined>,
  existing: Array<string | null | undefined> = [],
): string[] {
  const out: string[] = []
  for (const raw of items) {
    const text = sanitizeCoachText(raw).trim()
    if (!text) continue
    if (existing.some((item) => isSameCoachingIdea(text, item))) continue
    if (out.some((item) => isSameCoachingIdea(text, item))) continue
    out.push(text)
  }
  return out
}

function shortenCoachBullet(text: string, max = 96): string {
  const t = sanitizeCoachText(text).trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

/** Legacy / edge-case coach lines where a goal label ended with "." before "and". */
function polishCoachSummaryPunctuation(s: string): string {
  return s.replace(/\.\s+and\b/gi, ', and').replace(/\.\s+or\b/gi, ', or')
}

function clampHeroCoachSummary(opts: {
  coachSummary?: string
  coachHeadline?: string
  keyTakeaway?: string
  weightedCompletion: number | undefined
  fixBullets: string[]
}): string {
  let base =
    sanitizeCoachText(opts.coachSummary)
    || sanitizeCoachText(opts.coachHeadline)
    || sanitizeCoachText(opts.keyTakeaway)
    || outcomeSummary(opts.weightedCompletion)
  base = polishCoachSummaryPunctuation(base).trim()
  for (const bullet of opts.fixBullets) {
    if (bullet && isSameCoachingIdea(base, bullet)) {
      base =
        sanitizeCoachText(opts.coachHeadline)
        || sanitizeCoachText(opts.keyTakeaway)
        || outcomeSummary(opts.weightedCompletion)
      break
    }
  }
  const sentences = base.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
  let out = sentences.slice(0, 2).join(' ')
  if (out.length > 240) out = `${out.slice(0, 237).trimEnd()}…`
  return out
}

function buildWhatWentWellBullets(report: SessionEvaluationReport, turns: TurnEvaluation[]): string[] {
  const out: string[] = []
  const pool: string[] = []

  for (const g of (report.taskOutcome?.goalEvidence ?? []).filter(
    (goal) => goal.tier !== 'stretch' && goal.status === 'completed',
  )) {
    pool.push(stripSpeakLiveGoalIdBrackets(g.goalLabel))
  }

  for (const d of report.overall?.dimensions ?? []) {
    if (d.score != null && d.score >= 86 && (d.verdict?.trim() || d.meaning?.trim())) {
      const bit = d.meaning?.trim() ? `${d.label}: ${shortenCoachBullet(d.meaning, 72)}` : `${d.label}: ${d.verdict}`
      pool.push(bit)
    }
  }

  for (const turn of turns) {
    for (const s of (turn.keyStrengths ?? []).map(sanitizeCoachText).filter(Boolean)) {
      pool.push(s)
    }
    for (const s of (turn.transcriptCoaching?.strengths ?? []).map(sanitizeCoachText).filter(Boolean)) {
      pool.push(s)
    }
    const w = turn.sentenceGroundedReview?.whatWorked?.map(sanitizeCoachText).filter(Boolean) ?? []
    for (const s of w) pool.push(s)
  }

  for (const raw of pool) {
    const line = shortenCoachBullet(raw, 100)
    if (!line) continue
    const next = dedupeCoachItems([line], out)
    if (next.length === 0) continue
    out.push(next[0]!)
    if (out.length >= 3) break
  }
  return out
}

function buildFixNextBullets(opts: {
  report: SessionEvaluationReport
  derivedFocus: FocusArea | null
  languageTakeaway: string
  voiceTakeaway: string
  sessionHasAnyAudio: boolean
}): string[] {
  const pool: string[] = []
  for (const a of opts.report.recommendedActions ?? []) {
    if (a.priority !== 'primary') continue
    const line = sanitizeCoachText(a.title || a.reason).trim()
    if (line) pool.push(line)
  }
  if (opts.derivedFocus) {
    pool.push(stripSpeakLiveGoalIdBrackets(opts.derivedFocus.label))
  }
  if (opts.languageTakeaway.trim()) pool.push(opts.languageTakeaway.trim())
  if (opts.sessionHasAnyAudio && opts.voiceTakeaway.trim()) pool.push(opts.voiceTakeaway.trim())

  const out = dedupeCoachItems(pool.map((p) => shortenCoachBullet(p, 120)))
  return out.slice(0, 2)
}

function pickPracticePhraseForReport(derivedFocus: FocusArea | null, priorityTurn: TurnEvaluation | null): {
  phrase: string
  turnId: string | null
  learnerLine: string | null
} {
  const fromFocus = derivedFocus?.exampleLine?.trim()
  if (fromFocus) {
    return { phrase: fromFocus, turnId: priorityTurn?.turnId ?? null, learnerLine: priorityTurn?.learnerTranscript ?? null }
  }
  if (!priorityTurn) return { phrase: '', turnId: null, learnerLine: null }
  const transcript = priorityTurn.learnerTranscript || priorityTurn.transcriptOriginal || ''
  const api = priorityTurn.wrongWordDetections ?? []
  const corrections = api.length > 0 ? wrongDetectionsToCorrections(api) : extractWordCorrections(priorityTurn)
  const picked = pickDisplayCorrectedPhrase(transcript, corrections, [
    priorityTurn.naturalRewrite?.improved,
    priorityTurn.referenceSentence,
  ])
  if (picked.trim()) {
    return { phrase: picked.trim(), turnId: priorityTurn.turnId, learnerLine: transcript }
  }
  const ref = priorityTurn.referenceSentence?.trim()
  if (ref && !isSameAsOriginal(transcript, ref)) {
    return { phrase: ref, turnId: priorityTurn.turnId, learnerLine: transcript }
  }
  return { phrase: '', turnId: priorityTurn.turnId, learnerLine: transcript || null }
}

function buildPatternGuideLines(transcript: string, issueTexts: string[]): string[] {
  const joined = issueTexts.join(' ').toLowerCase()
  const t = transcript.trim().toLowerCase()
  const out: string[] = []
  if (/\?/.test(transcript)) {
    out.push(
      'Question pattern: finite verb early (after a question word like **hoe laat** / **waar**, or as the first word in yes/no questions), then subject, then the detail you need.',
    )
  }
  if (joined.includes('time') || joined.includes('departure') || joined.includes('schedule') || joined.includes('clock') || t.includes('hoe laat')) {
    out.push(
      'Departure-time line: **Hoe laat + finite verb + subject + naar + destination + ?** — e.g. “Hoe laat vertrekt de trein naar Amsterdam?”',
    )
  }
  if (joined.includes('word order') || joined.includes('verb') || joined.includes('inversion')) {
    out.push(
      'Main statement clause: **Subject + finite verb in second position + time/manner/place + other verbs at the end** when you are not asking a question.',
    )
  }
  if (out.length === 0) {
    out.push(
      'Short service question template: **(optional question word) + finite verb + subject + key detail + ?** — keep one clear intent per question.',
    )
  }
  return out
}

/** Renders `**like this**` as bold; other text stays normal. */
function renderDoubleStarBold(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    const inner = /^\*\*([^*]+)\*\*$/.exec(part)
    if (inner) {
      return (
        <strong key={i} className="font-bold text-violet-950 tracking-tight">
          {inner[1]}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function transcriptGrammarStructureIssues(tc: TurnEvaluation['transcriptCoaching']): Array<{ area: string; issue: string; fix: string }> {
  return (tc.issues ?? []).filter((iss) => {
    const a = (iss.area ?? '').toLowerCase()
    const i = (iss.issue ?? '').toLowerCase()
    return (
      a.includes('grammar')
      || a.includes('structure')
      || a.includes('syntax')
      || a.includes('sentence')
      || i.includes('word order')
      || i.includes('sentence structure')
      || i.includes('question structure')
      || i.includes('verb')
      || i.includes('tense')
    )
  })
}

function GrammarStructureExplainer({
  turn,
  transcript,
  dedupeAgainst = [],
}: {
  turn: TurnEvaluation
  transcript: string
  /** Phrases already shown above (e.g. main fix) — omit repeats. */
  dedupeAgainst?: string[]
}) {
  const le = turn.languageEvaluation && typeof turn.languageEvaluation === 'object'
    ? (turn.languageEvaluation as Record<string, unknown>)
    : null
  const grammar = strArrUnknown(le?.grammarIssues)
  const structure = strArrUnknown(le?.sentenceStructureIssues)
  const qNotes = strArrUnknown(le?.questionFormNotes)
  const wNotes = strArrUnknown(le?.wordOrderNotes)
  const vNotes = strArrUnknown(le?.verbTenseNotes)
  const learnerLineRaw = typeof le?.learnerFacingGrammarLine === 'string' ? le.learnerFacingGrammarLine.trim() : ''
  const whyBetterRaw = typeof le?.whyItIsBetter === 'string' ? le.whyItIsBetter.trim() : ''
  const tcIssues = transcriptGrammarStructureIssues(turn.transcriptCoaching)
  if (
    grammar.length === 0
    && structure.length === 0
    && qNotes.length === 0
    && wNotes.length === 0
    && vNotes.length === 0
    && !learnerLineRaw
    && !whyBetterRaw
    && tcIssues.length === 0
  ) {
    return null
  }

  const issueTexts = [...grammar, ...structure, ...qNotes, ...wNotes, ...vNotes, ...tcIssues.map((i) => `${i.issue} ${i.fix}`)]
  const patternLines = buildPatternGuideLines(transcript, issueTexts)

  const prior = dedupeAgainst.map((s) => sanitizeCoachText(s).trim()).filter(Boolean)
  const learnerLine = learnerLineRaw && !prior.some((p) => isSameCoachingIdea(learnerLineRaw, p))
    ? sanitizeCoachText(learnerLineRaw).trim()
    : ''
  const whyBetter = whyBetterRaw && !prior.some((p) => isSameCoachingIdea(whyBetterRaw, p)) && (!learnerLine || !isSameCoachingIdea(whyBetterRaw, learnerLine))
    ? sanitizeCoachText(whyBetterRaw).trim()
    : ''

  const fromTranscriptCoaching = tcIssues.map((iss) => {
    const issue = sanitizeCoachText(iss.issue).trim()
    const fix = sanitizeCoachText(iss.fix).trim()
    if (!issue) return ''
    return fix ? `${issue} → ${fix}` : issue
  }).filter(Boolean)

  const mergedBullets = dedupeCoachItems(
    [...grammar, ...structure, ...qNotes, ...wNotes, ...vNotes, ...fromTranscriptCoaching],
    [...prior, learnerLine, whyBetter],
  ).slice(0, 4)

  const showIntro = Boolean(learnerLine || whyBetter)
  const showBullets = mergedBullets.length > 0

  if (!showIntro && !showBullets && patternLines.length === 0) return null

  return (
    <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 px-3.5 py-3 space-y-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-900/90">Grammar</p>
      {learnerLine ? <p className="text-[12px] text-ink-primary leading-relaxed">{learnerLine}</p> : null}
      {whyBetter ? <p className="text-[11px] text-ink-secondary leading-relaxed">{whyBetter}</p> : null}
      {showBullets ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800/80 mb-0.5">Notes</p>
          <ul className="space-y-1">
            {mergedBullets.map((line, i) => (
              <li key={`m-${i}`} className="text-[12px] text-ink-primary leading-relaxed flex gap-2">
                <span className="text-violet-500 shrink-0 mt-0.5">·</span>
                <span>{sanitizeCoachText(line)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {patternLines.length > 0 ? (
        <div className="rounded-xl border border-violet-300/90 bg-gradient-to-br from-violet-100/90 via-white to-violet-50/80 px-3.5 py-3 shadow-[0_10px_24px_-18px_rgba(91,33,182,0.35)] ring-1 ring-violet-200/60">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-900 mb-2">Pattern (EN)</p>
          <ul className="space-y-2.5">
            {patternLines.map((line, i) => (
              <li key={`p-${i}`} className="text-[12px] text-ink-primary leading-relaxed">
                {renderDoubleStarBold(line)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Apply all word-level corrections to produce a full corrected line (every matching token). */
function buildCorrectedTranscript(transcript: string, corrections: WordCorrection[]): string {
  const usable = corrections.filter(c => c.wrong.trim() && c.correction.trim())
  if (!usable.length) return transcript
  const parts = transcript.split(/(\s+)/)
  return parts
    .map((part) => {
      if (/^\s+$/.test(part)) return part
      const key = tokenKeyForMatch(part)
      if (!key) return part
      const hit = usable.find(c => c.wrong.toLowerCase() === key)
      if (!hit) return part
      const lead = part.match(/^['"„‚«»(]+/u)?.[0] ?? ''
      const trail = part.match(/['"»),.!?;:…]+$/u)?.[0] ?? ''
      const core = part.slice(lead.length, part.length - trail.length)
      if (tokenKeyForMatch(core) !== hit.wrong.toLowerCase()) return part
      return `${lead}${hit.correction}${trail}`
    })
    .join('')
}

/**
 * Catch remaining tokens (word boundaries, minor glue) after whitespace-aware pass.
 * Caps replacements per `wrong` to how many times it appeared in the **original** transcript so a correction
 * that still contains `wrong` as a word cannot spiral into repeated junk (e.g. duplicated tokens).
 */
function buildCorrectedTranscriptLoose(transcript: string, corrections: WordCorrection[]): string {
  let out = buildCorrectedTranscript(transcript, corrections)
  const usable = [...corrections].filter((c) => c.wrong.trim() && c.correction.trim())
  usable.sort((a, b) => b.wrong.length - a.wrong.length)
  for (const c of usable) {
    const wrong = c.wrong.trim()
    const correction = c.correction.trim()
    const maxN = (transcript.match(new RegExp(`\\b${escapeRegExp(wrong)}\\b`, 'gi')) ?? []).length
    if (maxN === 0) continue
    const applyRe = new RegExp(`\\b${escapeRegExp(wrong)}\\b`, 'gi')
    let n = 0
    out = out.replace(applyRe, () => {
      n += 1
      return n <= maxN ? correction : wrong
    })
  }
  return out
}

/** Heuristic: mechanical merges or bad model output with runaway repetition. */
function isGarbledCorrectionOutput(s: string): boolean {
  const t = s.trim()
  if (t.length < 28) return false
  const words = t
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((w) => w.length >= 6)
  const counts = new Map<string, number>()
  for (const w of words) {
    counts.set(w, (counts.get(w) ?? 0) + 1)
    if ((counts.get(w) ?? 0) >= 4) return true
  }
  return false
}

/** Prefer LLM-backed full-line rewrites over token-spliced “corrected sentence” when available. */
function pickDisplayCorrectedPhrase(
  transcript: string,
  corrections: WordCorrection[],
  candidates: readonly (string | null | undefined)[],
): string {
  const base = transcript.trim()
  const pickFromCandidates = (): string => {
    for (const raw of candidates) {
      const c = typeof raw === 'string' ? raw.trim() : ''
      if (!c || isSameAsOriginal(transcript, c)) continue
      if (isGarbledCorrectionOutput(c)) continue
      return c
    }
    return ''
  }

  const rows = corrections.filter((c) => c.wrong.trim() && c.correction.trim())
  if (!rows.length) {
    const hit = pickFromCandidates()
    return hit || base
  }

  const hit = pickFromCandidates()
  if (hit) return hit

  const mechanical = buildCorrectedTranscriptLoose(transcript, rows).trim()
  if (mechanical && !isGarbledCorrectionOutput(mechanical)) return mechanical
  if (mechanical) return base || mechanical
  return base
}

function isMonologuePracticeScenario(scenarioId: string | undefined): boolean {
  const s = (scenarioId ?? '').trim().toLowerCase().replace(/-/g, '_')
  return s === 'storytelling' || s === 'explaining_something'
}

/**
 * Longest usable Dutch rewrite among LLM / stitched candidates — practice script for long turns.
 * Prefers rewrites that cover a meaningful share of a long transcript when several lengths exist.
 */
function pickFullMonologuePracticeReference(
  transcript: string,
  candidates: readonly (string | null | undefined)[],
): string {
  const base = transcript.trim()
  const minLen = base.length >= 120 ? Math.min(100, Math.floor(base.length * 0.22)) : 0
  const pool = (floor: number) =>
    candidates
      .map((raw) => (typeof raw === 'string' ? raw.trim() : ''))
      .filter((c) => {
        if (!c || isSameAsOriginal(base, c)) return false
        if (isGarbledCorrectionOutput(c)) return false
        if (floor > 0 && c.length < floor) return false
        return true
      })
  const scored = pool(minLen).length ? pool(minLen) : pool(0)
  if (!scored.length) return ''
  return scored.reduce((a, b) => (b.length > a.length ? b : a))
}

function extractWordCorrections(turn: TurnEvaluation): WordCorrection[] {
  const corrections: WordCorrection[] = []
  const seen = new Set<string>()

  for (const fb of turn.feedbackItems) {
    const w = fb.evidence?.word?.trim()
    if (!w || seen.has(w.toLowerCase())) continue
    if (fb.type === 'wrong_word' || fb.type === 'non_word' || fb.type === 'word_choice' || fb.issue?.toLowerCase().includes('not a') || fb.issue?.toLowerCase().includes('incorrect word') || fb.issue?.toLowerCase().includes('wrong word')) {
      seen.add(w.toLowerCase())
      corrections.push({ wrong: w, correction: fb.fix || '', explanation: fb.explanation || fb.issue || '' })
    }
  }

  for (const iss of turn.transcriptCoaching.issues) {
    if (seen.size > 4) break
    const lower = (iss.issue + ' ' + (iss.area || '')).toLowerCase()
    if (lower.includes('wrong word') || lower.includes('not a dutch') || lower.includes('non-word') || lower.includes('incorrect word') || lower.includes('non-existent') || lower.includes('misspelling')) {
      const wordMatch = iss.issue.match(/[""«]([^""»]+)[""»]/) || iss.issue.match(/"([^"]+)"/)
      const w = wordMatch?.[1]?.trim()
      if (w && !seen.has(w.toLowerCase())) {
        seen.add(w.toLowerCase())
        corrections.push({ wrong: w, correction: iss.fix || '', explanation: iss.issue })
      }
    }
  }

  const normalizedTranscript = normalizeForCompare(turn.learnerTranscript || turn.transcriptOriginal || '')
  if (!seen.has('denk') && /^denk je wel$/.test(normalizedTranscript)) {
    seen.add('denk')
    corrections.push({
      wrong: 'Denk',
      correction: 'Dank',
      explanation: 'Use “Dank je wel” to thank someone. “Denk je wel” sounds like “do you think indeed,” which does not fit this closing.',
    })
  }

  return corrections
}

function AnnotatedSentence({ transcript, corrections }: { transcript: string; corrections: WordCorrection[] }) {
  if (corrections.length === 0) return <p className="text-[14px] font-medium text-ink-primary leading-snug">{transcript}</p>

  const wrongSet = new Map(corrections.map(c => [c.wrong.toLowerCase(), c]))
  const tokens = transcript.split(/(\s+)/)

  return (
    <p className="text-[15px] font-semibold leading-relaxed tracking-tight">
      {tokens.map((tok, i) => {
        if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>
        const key = tokenKeyForMatch(tok)
        const match = key ? wrongSet.get(key) : undefined
        if (match) {
          return (
            <span key={i} className="inline rounded-md bg-rose-100/90 px-0.5 ring-1 ring-rose-300/80">
              <span className="text-rose-800 underline decoration-rose-500 decoration-2 underline-offset-[3px]">{tok}</span>
            </span>
          )
        }
        return <span key={i} className="text-ink-primary">{tok}</span>
      })}
    </p>
  )
}

function SaveButton({ busyKey, saving, savedKeys, label, savedLabel, idle, done, onClick, disabled = false }: {
  busyKey: string; saving: string | null; savedKeys: Set<string>
  label: string; savedLabel: string; idle: string; done: string
  onClick: () => void
  disabled?: boolean
}) {
  const saved = savedKeys.has(busyKey)
  const busy = saving === busyKey
  return (
    <button type="button" disabled={busy || saved || disabled} onClick={onClick} className={saved ? done : idle}>
      {saved ? <Check className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
      {saved ? savedLabel : busy ? 'Saving…' : label}
    </button>
  )
}

function classificationLabel(det: WrongWordDetection | undefined): string {
  if (!det) return 'Correction'
  switch (det.classification) {
    case 'likely_misrecognition':
      return 'Likely intended word'
    case 'wrong_word_choice':
      return 'Word choice'
    case 'misspelling':
      return 'Spelling'
    case 'non_word':
      return 'Not Dutch here'
    default:
      return 'Correction'
  }
}

function WordCorrectionPanel({
  transcript,
  corrections,
  /** Full recommended line: prefer LLM natural rewrite from parent; never raw mechanical splice when avoidable. */
  correctedFullPhrase,
  detections,
  scenarioTitle,
  turnId,
  refSrc,
  onPlaySnippet,
  audio,
  saving,
  savedKeys,
  onSave,
  hideFullSentenceBand = false,
}: {
  transcript: string
  corrections: WordCorrection[]
  correctedFullPhrase: string
  detections?: WrongWordDetection[]
  scenarioTitle: string
  turnId: string
  refSrc: string | null
  onPlaySnippet: (turnId: string, text: string) => Promise<void>
  audio: AudioController
  saving: string | null
  savedKeys: Set<string>
  onSave: (input: Record<string, unknown>) => void
  hideFullSentenceBand?: boolean
}) {
  const rows = corrections.filter(c => c.wrong.trim() && c.correction.trim())
  if (rows.length === 0) return null

  const correctedFull = correctedFullPhrase.trim() || transcript
  const scene = scenarioTitle.trim() || 'this situation'
  const primary = rows[0]

  const saveWordKey = `wc-word-${turnId}`
  const savePhraseKey = `wc-phrase-${turnId}`
  const practiceKey = `wc-practice-${turnId}`

  return (
    <section className="rounded-2xl border border-violet-200/90 bg-gradient-to-b from-violet-50/95 via-white to-white shadow-sm overflow-hidden ring-1 ring-violet-100/60">
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5 border-b border-violet-100/80 bg-violet-50/50">
        <Sparkles className="h-4 w-4 text-violet-600 shrink-0" />
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-violet-900">Words</h3>
      </div>

      <div className="divide-y divide-violet-100/80">
        {rows.map((c, i) => {
          const det = detections?.find(d => d.observedToken.toLowerCase() === c.wrong.toLowerCase())
          const why = sanitizeCoachText(c.explanation.trim())
          const scenarioLine = shortenCoachBullet(why.length >= 100 ? why : `${why}${why && scene ? ` · ${scene}` : ''}`, 160)
          return (
            <div key={`${c.wrong}-${i}`} className="px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-700/90 mb-2">{classificationLabel(det)}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Heard</p>
                  <p className="text-[16px] font-bold text-rose-800 tabular-nums tracking-tight">&ldquo;{c.wrong}&rdquo;</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Better Dutch</p>
                  <p className="text-[16px] font-bold text-emerald-800 tracking-tight">&ldquo;{c.correction}&rdquo;</p>
                </div>
              </div>
              <p className="text-[12px] text-ink-secondary leading-snug mt-2.5">{scenarioLine}</p>
            </div>
          )
        })}
      </div>

      {!hideFullSentenceBand ? (
        <div className="border-t border-violet-100/80 bg-gradient-to-br from-violet-100/90 via-white to-violet-100/80 px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-900 mb-0.5">Try this</p>
          <p className="text-[10px] text-violet-900/75 mb-1.5 leading-snug">
            Full-line rewrite when available; otherwise safe word-level fixes.
          </p>
          <ReferenceTextHighlight text={correctedFull} turnId={turnId} audio={audio} className="text-[15px] font-semibold text-sky-950 leading-snug" />
          <DutchWordGlossPicker phrase={correctedFull} corrections={rows} detections={detections} label="Tap a word" />
          {(refSrc || correctedFull.trim()) ? (
            <div className="mt-2.5">
              <SentenceAudioControls
                turnId={turnId}
                learnerSrc={null}
                refSrc={refSrc}
                referenceText={correctedFull}
                onPlaySnippet={onPlaySnippet}
                audio={audio}
                hideMissingLearnerHint
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="px-4 py-3 flex flex-wrap gap-2 border-t border-violet-100/60 bg-white">
        <SaveButton busyKey={saveWordKey} saving={saving} savedKeys={savedKeys}
          label="Save corrected word" savedLabel="Saved"
          idle="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[11px] font-semibold text-emerald-950 hover:bg-emerald-100/90 disabled:opacity-60 active:scale-[0.98]"
          done="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-100 px-3.5 py-2.5 text-[11px] font-semibold text-emerald-800 disabled:opacity-60"
          onClick={() => onSave({ type: 'save_pronunciation_word', title: `Word: "${primary.correction}"`, content: [`Correct: ${primary.correction}`, `You had: ${primary.wrong}`, `Scenario: ${scene}`, primary.explanation].join('\n'), sourceTurnId: turnId, saveBusyKey: saveWordKey, learnerOriginalSentence: primary.wrong, improvedSentence: primary.correction, tagCategory: 'pronunciation_drill', suggestedTrainingMode: 'pronunciation' })} />
        <SaveButton busyKey={savePhraseKey} saving={saving} savedKeys={savedKeys}
          label="Save corrected phrase" savedLabel="Saved"
          idle="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2.5 text-[11px] font-semibold text-violet-950 hover:bg-violet-100/90 disabled:opacity-60 active:scale-[0.98]"
          done="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-100 px-3.5 py-2.5 text-[11px] font-semibold text-emerald-800 disabled:opacity-60"
          onClick={() => onSave({ type: 'save_phrase', title: 'Corrected phrase', content: [`Original: ${transcript}`, `Corrected: ${correctedFull}`, `Scenario: ${scene}`].join('\n'), sourceTurnId: turnId, saveBusyKey: savePhraseKey, learnerOriginalSentence: transcript, improvedSentence: correctedFull, tagCategory: 'phrasing_upgrade', suggestedTrainingMode: null })} />
        <SaveButton busyKey={practiceKey} saving={saving} savedKeys={savedKeys}
          label="Practice this word" savedLabel="Added"
          idle="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[11px] font-semibold text-ink-primary hover:bg-slate-50 disabled:opacity-60 active:scale-[0.98]"
          done="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-100 px-3.5 py-2.5 text-[11px] font-semibold text-emerald-800 disabled:opacity-60"
          onClick={() => onSave({ type: 'pronunciation_drill', title: `Practice: "${primary.correction}"`, content: [`Drill word: ${primary.correction}`, `Replace: ${primary.wrong}`, `In sentence: ${correctedFull}`].join('\n'), sourceTurnId: turnId, saveBusyKey: practiceKey, learnerOriginalSentence: primary.wrong, improvedSentence: primary.correction, tagCategory: 'pronunciation_drill', suggestedTrainingMode: 'pronunciation_drill' })} />
      </div>
    </section>
  )
}

function buildGlossPrefetchSources(turns: TurnEvaluation[], scenarioTitle: string): DutchWordGlossPrefetchSource[] {
  const sources = new Map<string, DutchWordGlossPrefetchSource>()

  for (const turn of turns) {
    const transcript = turn.learnerTranscript || turn.transcriptOriginal || ''
    const detections = turn.wrongWordDetections ?? []
    const corrections = detections.length > 0 ? wrongDetectionsToCorrections(detections) : extractWordCorrections(turn)

    const tc = turn.transcriptCoaching
    const nr = turn.naturalRewrite && !isSameAsOriginal(transcript, turn.naturalRewrite.improved) ? turn.naturalRewrite : null
    const hasWordIssue = corrections.some((c) => c.wrong.trim() && c.correction.trim())
    const fallbackLanguageFix = !hasWordIssue && !nr && (tc.issues?.length ?? 0) === 0
      ? inferFallbackLanguageFix(
          transcript,
          scenarioTitle,
          turn.referenceSentence?.trim()
            ? { sentence: turn.referenceSentence, reason: turn.referenceSentenceReason }
            : null,
        )
      : null
    const preferredRewrite = repairScenarioRewrite(
      fallbackLanguageFix?.rewrite
        ? { original: transcript, improved: fallbackLanguageFix.rewrite, whyMoreNatural: fallbackLanguageFix.why }
        : nr,
      scenarioTitle,
      turn.referenceSentence,
    )
    const sgr = turn.sentenceGroundedReview
    const lengthProblems = evaluationMentionsLengthTightening(turn.keyProblems)
    const leImp =
      typeof turn.languageEvaluation?.improvedVersion === 'string'
        ? turn.languageEvaluation.improvedVersion.trim()
        : ''
    const refS = turn.referenceSentence?.trim() ?? ''
    const lengthFallbackPhrase =
      lengthProblems && leImp && !isSameAsOriginal(transcript, leImp)
        ? leImp
        : lengthProblems && refS && !isSameAsOriginal(transcript, refS)
          ? refS
          : ''
    const languageNativePhrase = fallbackLanguageFix?.rewrite || sgr?.nativePhrase || lengthFallbackPhrase || ''

    if (corrections.length > 0) {
      const correctedFull = pickDisplayCorrectedPhrase(transcript, corrections, [
        preferredRewrite?.improved,
        nr?.improved,
        leImp,
        languageNativePhrase,
        refS,
      ]).trim()
      if (correctedFull) {
        sources.set(`word-correction::${turn.turnId}`, {
          phrase: correctedFull,
          corrections,
          detections: detections.length > 0 ? detections : undefined,
        })
      }
    }
    const hasLanguageCoachingNeed = Boolean(
      hasWordIssue ||
      fallbackLanguageFix ||
      nr ||
      (tc.issues?.length ?? 0) > 0 ||
      (sgr?.whatToFix.length ?? 0) > 0 ||
      (lengthProblems && Boolean(lengthFallbackPhrase)),
    )
    const showLanguageRewriteCard = Boolean(
      languageNativePhrase.trim() &&
      hasLanguageCoachingNeed &&
      !isSameAsOriginal(transcript, languageNativePhrase),
    )
    const phrase = showLanguageRewriteCard ? languageNativePhrase : preferredRewrite?.improved ?? ''
    if (phrase.trim() && (showLanguageRewriteCard || preferredRewrite)) {
      sources.set(`rewrite::${turn.turnId}`, {
        phrase: phrase.trim(),
        corrections,
        detections: detections.length > 0 ? detections : undefined,
      })
    }
  }

  return [...sources.values()]
}

// ═══════════════════════════════════════════════════════════════════════════
// SENTENCE REVIEW CARD — single-attempt coach layout (playback unchanged)
// ═══════════════════════════════════════════════════════════════════════════

function coachFocusLine(
  turn: TurnEvaluation,
  corrections: WordCorrection[],
  sgr: SentenceGroundedReview | undefined,
  topProblem: string | null,
): string {
  const transcript = turn.learnerTranscript || turn.transcriptOriginal || ''
  const fromApi = sanitizeCoachText((turn.mainFixLine ?? '').replace(/^Main fix:\s*/i, '').trim())
  const vagueApi = Boolean(fromApi && isVagueDutchWordingMainFix(fromApi))
  const pair = corrections.find(c => c.wrong.trim() && c.correction.trim())

  if (fromApi && !vagueApi) return fromApi

  if (pair && (!fromApi || vagueApi)) {
    const gloss = englishGlossForDutchWord(pair.correction)
    return gloss
      ? `Use “${pair.correction}” (${gloss}), not “${pair.wrong}”.`
      : `Use “${pair.correction}”, not “${pair.wrong}”.`
  }

  const vanStationLine = coachLineVanWelkStationFragment(transcript)
  if (vanStationLine && (!fromApi || vagueApi)) return vanStationLine

  const nr = turn.naturalRewrite && !isSameAsOriginal(transcript, turn.naturalRewrite.improved)
    ? turn.naturalRewrite
    : null
  if (vagueApi && nr?.improved?.trim()) {
    const imp = sanitizeCoachText(nr.improved).trim()
    const why = sanitizeCoachText(nr.whyMoreNatural || '').trim()
    const whyShort = why.length > 100 ? `${why.slice(0, 97)}…` : why
    return whyShort ? `Say “${imp}” (${whyShort})` : `Say “${imp}” — clearer Dutch for this line.`
  }

  if (vagueApi && sgr?.mainFix?.trim() && !isVagueDutchWordingMainFix(sgr.mainFix)) {
    return sanitizeCoachText(sgr.mainFix.replace(/^Main fix:\s*/i, '').trim())
  }

  if (fromApi) return fromApi

  if (sgr?.mainFix?.trim()) return sanitizeCoachText(sgr.mainFix.replace(/^Main fix:\s*/i, '').trim())
  if (topProblem) return sanitizeCoachText(topProblem)
  return ''
}

function toSentenceCase(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function humanizeScenarioGoal(goal: string): string {
  const raw = goal.trim()
  if (!raw) return 'complete this part of the scenario'
  const normalized = raw.toLowerCase()
  if (normalized === 'ask_departure_time') return 'ask about the departure time'
  if (normalized === 'ask_delay_status') return 'ask if the train is on time'
  if (normalized === 'ask_platform') return 'ask which platform the train leaves from'
  if (normalized === 'close_politely') return 'close politely'
  if (normalized.includes('_')) return normalized.replace(/_/g, ' ')
  return raw.charAt(0).toLowerCase() + raw.slice(1)
}

/** Scenario goals from the DB are often full Dutch sentences — do not glue them after English “helps you …”. */
function isDutchScenarioGoalLabel(goal: string): boolean {
  const t = goal.trim()
  if (!t) return false
  if (/^[a-z][a-z0-9_]*$/i.test(t) && t.includes('_')) return false
  return /\b(u|uw|je|jij|zeg|wilt|wil|kunt|afspraak|reserveren|reserverings|duidelijk|belangrijk|sluit|bevestig|tafel|restaurant|kapper|plek|beschikbaar)\b/i.test(
    t,
  )
}

function inferFallbackLanguageFix(
  transcript: string,
  scenarioTitle: string,
  reference?: { sentence: string; reason?: string | null } | null,
): { mainFix: string; rewrite: string | null; why: string } | null {
  const raw = transcript.trim()
  const normalized = normalizeForCompare(raw)
  if (!raw || normalized.length < 4) return null

  if (/^denk je wel$/.test(normalized)) {
    return {
      mainFix: 'Use “Dank je wel”, not “Denk je wel”.',
      rewrite: 'Dank je wel.',
      why: 'This is a word-choice error, not just a pronunciation issue: Dutch uses “dank” for thanking someone here.',
    }
  }

  const timeMatch = /ik vraag jou wat de tijd naar ([a-zà-ÿ' -]+)/i.exec(raw)
  if (timeMatch) {
    const destination = toSentenceCase(timeMatch[1].trim().replace(/[?.!,;:]+$/g, ''))
    return {
      mainFix: 'Ask the departure time directly instead of describing the question.',
      rewrite: `Hoe laat vertrekt de trein naar ${destination}?`,
      why: 'Dutch speakers ask this as one direct question; your current line sounds translated and incomplete.',
    }
  }

  const shortFragment =
    normalized.split(' ').length <= 4 &&
    !/\b(is|zijn|ben|bent|heeft|heb|hebben|gaat|ga|vertrekt|vertrek|komt|kom|wil|wilt|kan|kun|moet)\b/.test(normalized)

  if (/^van [a-zà-ÿ-]+ station$/i.test(raw) || (shortFragment && /\bstation\b/i.test(raw))) {
    return {
      mainFix: 'Turn this fragment into one full Dutch question.',
      rewrite: 'Van welk station vertrekt de trein?',
      why: 'Right now this lands as loose words, not a clear station question that staff can answer directly.',
    }
  }

  if (shortFragment && /[a-zà-ÿ]/i.test(raw)) {
    const ref = (reference?.sentence ?? '').trim()
    if (ref && normalizeForCompare(ref) !== normalizeForCompare(raw)) {
      const whyFromApi = (reference?.reason ?? '').trim()
      return {
        mainFix: `Say “${ref}” — that is the natural Dutch for this moment.`,
        rewrite: ref,
        why:
          whyFromApi ||
          `The reference line is clearer than a fragment here — it is how Dutch usually sounds in ${scenarioTitle.toLowerCase()}.`,
      }
    }
    return {
      mainFix: 'Turn this into one full Dutch sentence before you polish pronunciation.',
      rewrite: null,
      why: `In ${scenarioTitle.toLowerCase()}, fragments make the meaning harder to follow than a slower but complete sentence.`,
    }
  }

  return null
}

function repairScenarioRewrite(
  rewrite: { original: string; improved: string; whyMoreNatural: string } | null,
  scenarioTitle: string,
  referenceSentence: string,
): { original: string; improved: string; whyMoreNatural: string } | null {
  if (!rewrite) return null
  const scene = scenarioTitle.trim().toLowerCase()
  if (!(scene.includes('train') || scene.includes('station'))) return rewrite

  const improved = rewrite.improved.trim()
  const match = /^wat is de tijd naar ([a-zà-ÿ' -]+)\??$/i.exec(improved)
  if (!match) return rewrite

  const destination = toSentenceCase(match[1].trim())
  const repaired =
    referenceSentence.trim() && /trein/i.test(referenceSentence)
      ? referenceSentence.trim()
      : `Hoe laat vertrekt de trein naar ${destination}?`

  return {
    ...rewrite,
    improved: repaired,
    whyMoreNatural: 'Ask about the train directly here so station staff can answer right away.',
  }
}

function whyThisMatters(
  turn: TurnEvaluation,
  corrections: WordCorrection[],
  scenarioTitle: string,
): string | null {
  const scene = scenarioTitle.toLowerCase().replace(/[^a-z\s]/g, '').trim() || 'this scenario'
  if (corrections.length > 0) {
    return `In ${scene}, the correct word carries the key meaning.`
  }
  const goals = turn.scenarioGoalFit?.relevantGoals ?? []
  if (goals.length > 0) {
    const g = goals[0].trim()
    if (isDutchScenarioGoalLabel(g)) {
      const booking = /\bbooking\b/i.test(scenarioTitle) || /\breservation\b/i.test(scenarioTitle)
      if (booking) {
        return (
          `This line maps to your practice goal: "${g}". ` +
          'In plain English: open with a clear booking or appointment request and add useful details (what, when, how many people).'
        )
      }
      return `This line maps to your practice goal: "${g}".`
    }
    return `This line helps you ${humanizeScenarioGoal(g)}.`
  }
  const hasWeakWords = turn.audioCoaching?.wordAssessments?.some(w => w.status === 'weak' || w.status === 'unclear')
  if (hasWeakWords) {
    return `In short ${scene} questions, the ending carries the key meaning.`
  }
  return null
}

function pickAdaptiveActions(turn: TurnEvaluation, corrections: WordCorrection[]): Array<{ type: string; title: string; detail: string; targetPhrase?: string; targetWord?: string }> {
  const hasWordIssue = corrections.some(c => c.wrong.trim() && c.correction.trim())
  const hasWeakPronunciation = turn.audioCoaching?.wordAssessments?.some(w => w.status === 'weak' || w.status === 'unclear')
  const hasAudio = turn.signalSources.audioMetrics === 'azure_audio'
  const wordingOk = turn.naturalRewrite
    ? normalizeForCompare(turn.learnerTranscript || '') === normalizeForCompare(turn.naturalRewrite.improved || '')
    : false

  const picked: Array<{ type: string; title: string; detail: string; targetPhrase?: string; targetWord?: string }> = []
  const seen = new Set<string>()

  const maybePick = (act: typeof turn.improvementActions[number]) => {
    const key = `${act.type}:${act.title}`.toLowerCase()
    if (seen.has(key) || picked.length >= 4) return
    seen.add(key)
    picked.push(act)
  }

  for (const act of turn.improvementActions) {
    if (picked.length >= 4) break
    if (act.type === 'scenario_follow_up' && !wordingOk) { maybePick(act); continue }
    if (act.type === 'save_phrase' && hasWordIssue) { maybePick(act); continue }
    if (act.type === 'save_improved_version' && hasWordIssue) { maybePick(act); continue }
    if (act.type === 'save_pronunciation_word' && hasWeakPronunciation) { maybePick(act); continue }
    if (act.type === 'save_rhythm_drill' && hasAudio && !hasWordIssue) { maybePick(act); continue }
    if (act.type === 'sentence_drill') { maybePick(act); continue }
  }

  if (picked.length === 0 && turn.improvementActions.length > 0) {
    maybePick(turn.improvementActions[0])
  }

  if (wordingOk && !hasWordIssue) {
    return picked.filter(a => a.type !== 'save_natural_phrasing' && a.type !== 'save_improved_version')
  }

  return picked.slice(0, 4)
}

function evaluationMentionsLengthTightening(texts: readonly string[]): boolean {
  const blob = texts.join(' ').toLowerCase()
  return /\b(shorter|shorten|phrase length|length could|too long|longer than|longer|long|wordy|verbose|unnecessary|compact|tight|kort|korter|beknopt|bondiger)\b/.test(
    blob,
  )
}

function coachFocusRider(
  hasWordIssue: boolean,
  hasAudio: boolean,
  transcript: string,
  naturalRewrite: NaturalRewrite | null,
  ac: AudioCoaching | null,
  fallbackLanguageFix: { mainFix: string; rewrite: string | null; why: string } | null,
  keyProblems: readonly string[],
): string | null {
  if (hasWordIssue) return null
  if (fallbackLanguageFix) {
    return fallbackLanguageFix.rewrite
      ? `Use a full Dutch line here first, then polish the sounds inside that sentence.`
      : `Fix the wording first; pronunciation drills matter more once the sentence itself is clear Dutch.`
  }
  if (!hasAudio) return 'No recording for this line — feedback below is from your text, not how you sounded.'
  const wordingOk = naturalRewrite ? isSameAsOriginal(transcript, naturalRewrite.improved) : false
  const weakN = ac?.wordAssessments?.filter(w => w.status === 'weak' || w.status === 'unclear').length ?? 0
  const lengthTension = evaluationMentionsLengthTightening(keyProblems)
  if (lengthTension) {
    return 'Focus on the shorter Dutch line under Language review (same intent, fewer words) — then polish delivery if you have audio.'
  }
  if (wordingOk && weakN > 0) return 'Your line reads fine — the win is cleaner sounds on the flagged words.'
  if (wordingOk) return 'Wording is fine for this moment; if you have audio, spend reps on delivery, not rewrites.'
  if (weakN >= 2) return 'A few words cost clarity — keep the same sentence and steady those syllables.'
  return null
}

function SentenceSectionShell({
  tone,
  title,
  icon,
  children,
}: {
  tone: 'language' | 'voice' | 'evidence' | 'actions'
  title: string
  icon?: ReactNode
  children: ReactNode
}) {
  const toneMap = {
    language: {
      shell: 'rounded-[24px] bg-violet-50/55 ring-1 ring-violet-100/90',
      header: 'text-violet-700',
    },
    voice: {
      shell: 'rounded-[24px] bg-violet-50/55 ring-1 ring-violet-100/90',
      header: 'text-violet-700',
    },
    evidence: {
      shell: 'rounded-[24px] bg-slate-50/90 ring-1 ring-slate-200/90',
      header: 'text-slate-700',
    },
    actions: {
      shell: 'rounded-[24px] bg-white ring-1 ring-slate-200/90 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)]',
      header: 'text-slate-600',
    },
  } as const
  const style = toneMap[tone]
  return (
    <section className={`${style.shell} px-4 py-4`}>
      <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] ${style.header}`}>
        {icon}
        <span>{title}</span>
      </div>
      <div className="mt-3 space-y-3.5">{children}</div>
    </section>
  )
}

function SentenceInset({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/90 px-4 py-3 shadow-[0_8px_22px_-14px_rgba(15,23,42,0.12)] ${className}`.trim()}
    >
      {children}
    </div>
  )
}

function socialPhrasingRewriteRows(tc: TurnEvaluation['transcriptCoaching']): Array<{ label: string; text: string }> {
  const ro = tc.rewriteOptions
  const raw = [ro.safeForLevel, ro.moreNatural, ro.stretch, ro.alternativePhrasing].filter(
    (x): x is { label: string; text: string } => Boolean(x && typeof x.text === 'string' && x.text.trim()),
  )
  const seen = new Set<string>()
  const out: Array<{ label: string; text: string }> = []
  for (const x of raw) {
    const k = x.text.trim().toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push({ label: x.label, text: x.text.trim() })
  }
  return out
}

function SentenceReviewCard({ turn, resolvedMedia, saving, savedKeys, onSave, audio, scenarioTitle, scenarioId = '', onPlaySnippet, expanded, onToggle, hasScenarioGap, isPrioritySentence, collapsedMainFixDedupeAgainst }: {
  turn: TurnEvaluation; resolvedMedia: { learner?: string; reference?: string }
  saving: string | null; savedKeys: Set<string>; onSave: (input: Record<string, unknown>) => void; audio: AudioController
  scenarioTitle: string
  /** When `small_talk` or `party_social`, show multi-line phrasing coaching from `transcriptCoaching.rewriteOptions`. */
  scenarioId?: string
  onPlaySnippet: (turnId: string, text: string) => Promise<void>
  expanded: boolean
  onToggle: () => void
  hasScenarioGap: boolean
  isPrioritySentence: boolean
  /** Session-level bullets already state this fix — hide the collapsed “Main fix” repeat. */
  collapsedMainFixDedupeAgainst?: string[]
}) {
  const [selectedWord, setSelectedWord] = useState<WordAssessmentResult | null>(null)
  const [showAllActions, setShowAllActions] = useState(false)
  const sentenceCardRef = useRef<HTMLElement>(null)
  /** Only scroll after a deliberate open from this row — not initial auto-expand of the first turn. */
  const scrollIntoViewAfterUserOpenRef = useRef(false)

  useEffect(() => {
    if (!expanded || !scrollIntoViewAfterUserOpenRef.current) return
    scrollIntoViewAfterUserOpenRef.current = false
    let cancelled = false
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return
        sentenceCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
      })
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(id)
    }
  }, [expanded, turn.turnId])

  const hasAudio = turnHasAudio(turn)
  const learnerSrc = resolvedMedia.learner ?? null
  const refSrc = resolvedMedia.reference ?? null
  const transcript = turn.learnerTranscript || turn.transcriptOriginal || ''
  const ac = turn.audioCoaching
  const ev = ac?.evidence
  const tc = turn.transcriptCoaching
  const nr = turn.naturalRewrite && !isSameAsOriginal(transcript, turn.naturalRewrite.improved) ? turn.naturalRewrite : null
  const hasWordData = hasAudio && ac != null && ac.wordAssessments.length > 0
  const pronunciationSnippetText = useMemo(
    () => buildSnippetText(turn.pronunciationIssues.slice(0, 2).map((pi) => pi.word)),
    [turn.pronunciationIssues],
  )
  const fluencySnippetText = useMemo(
    () => buildSnippetText(turn.fluencyIssues.slice(0, 2).map((fi) => fi.segment)),
    [turn.fluencyIssues],
  )
  const apiDetections = turn.wrongWordDetections ?? []
  const corrections = useMemo(() => {
    const api = turn.wrongWordDetections ?? []
    if (api.length > 0) return wrongDetectionsToCorrections(api)
    return extractWordCorrections(turn)
  }, [turn])

  const sgr = turn.sentenceGroundedReview
  const hasWordIssue = corrections.some(c => c.wrong.trim() && c.correction.trim())
  const fallbackLanguageFix = useMemo(
    () =>
      !hasWordIssue && !nr && (tc.issues?.length ?? 0) === 0
        ? inferFallbackLanguageFix(
            transcript,
            scenarioTitle,
            turn.referenceSentence?.trim()
              ? { sentence: turn.referenceSentence, reason: turn.referenceSentenceReason }
              : null,
          )
        : null,
    [hasWordIssue, nr, tc.issues, transcript, scenarioTitle, turn.referenceSentence, turn.referenceSentenceReason],
  )
  const preferredRewrite = useMemo(() => {
    const base = fallbackLanguageFix?.rewrite
      ? { original: transcript, improved: fallbackLanguageFix.rewrite, whyMoreNatural: fallbackLanguageFix.why }
      : nr
    return repairScenarioRewrite(base, scenarioTitle, turn.referenceSentence)
  }, [fallbackLanguageFix, nr, transcript, scenarioTitle, turn.referenceSentence])

  const cleanProblems = useMemo(() => turn.keyProblems.map(sanitizeCoachText).filter(Boolean), [turn.keyProblems])
  const cleanStrengths = useMemo(() => turn.keyStrengths.map(sanitizeCoachText).filter(Boolean), [turn.keyStrengths])
  const topFix = cleanProblems[0] || null

  const coachFocus = useMemo(
    () => fallbackLanguageFix?.mainFix || coachFocusLine(turn, corrections, sgr, topFix),
    [fallbackLanguageFix, turn, corrections, sgr, topFix],
  )
  const coachRider = useMemo(
    () => coachFocusRider(hasWordIssue, hasAudio, transcript, turn.naturalRewrite, ac, fallbackLanguageFix, turn.keyProblems),
    [hasWordIssue, hasAudio, transcript, turn.naturalRewrite, ac, fallbackLanguageFix, turn.keyProblems],
  )
  const hideDuplicateSgrMain = Boolean(
    sgr?.mainFix?.trim() && insightKey(sgr.mainFix) === insightKey(coachFocus),
  )
  const scenarioContext = useMemo(
    () => whyThisMatters(turn, corrections, scenarioTitle),
    [turn, corrections, scenarioTitle],
  )
  const languageWhatWorked = useMemo(
    () => dedupeCoachItems(sgr?.whatWorked ?? [], [coachFocus, scenarioContext]),
    [sgr?.whatWorked, coachFocus, scenarioContext],
  )
  const languageWhatToFix = useMemo(
    () => dedupeCoachItems(
      fallbackLanguageFix ? [fallbackLanguageFix.why] : (sgr?.whatToFix ?? []),
      [coachFocus, coachRider, scenarioContext, fallbackLanguageFix?.mainFix, sgr?.mainFix],
    ),
    [fallbackLanguageFix, sgr?.whatToFix, sgr?.mainFix, coachFocus, coachRider, scenarioContext],
  )
  const lengthProblems = evaluationMentionsLengthTightening(turn.keyProblems)
  const leImp =
    typeof turn.languageEvaluation?.improvedVersion === 'string'
      ? turn.languageEvaluation.improvedVersion.trim()
      : ''
  const refS = turn.referenceSentence?.trim() ?? ''
  const lengthFallbackPhrase =
    lengthProblems && leImp && !isSameAsOriginal(transcript, leImp)
      ? leImp
      : lengthProblems && refS && !isSameAsOriginal(transcript, refS)
        ? refS
        : ''
  const languageNativePhrase = fallbackLanguageFix?.rewrite || sgr?.nativePhrase || lengthFallbackPhrase || ''
  const languageWhyBetter = sanitizeCoachText(fallbackLanguageFix?.why || sgr?.whyBetter || '')
  const wordCorrectionDisplayPhrase = useMemo(
    () =>
      pickDisplayCorrectedPhrase(transcript, corrections, [
        preferredRewrite?.improved,
        nr?.improved,
        leImp,
        languageNativePhrase,
        refS,
      ]),
    [transcript, corrections, preferredRewrite, nr, leImp, languageNativePhrase, refS],
  )
  const fullMonologuePracticeReference = useMemo(
    () =>
      isMonologuePracticeScenario(scenarioId)
        ? pickFullMonologuePracticeReference(transcript, [
            leImp,
            preferredRewrite?.improved,
            nr?.improved,
            languageNativePhrase,
            wordCorrectionDisplayPhrase,
            refS,
          ])
        : '',
    [scenarioId, transcript, leImp, preferredRewrite, nr, languageNativePhrase, wordCorrectionDisplayPhrase, refS],
  )
  const coachFocusForMainFix = useMemo(() => {
    const cf = (coachFocus ?? '').trim()
    if (!cf) return ''
    const full = fullMonologuePracticeReference.trim()
    if (full && normalizeForCompare(cf) === normalizeForCompare(full)) return ''
    return coachFocus ?? ''
  }, [coachFocus, fullMonologuePracticeReference])
  const scenarioContextForUi = useMemo(() => {
    const raw = (scenarioContext ?? '').trim()
    if (!raw) return null
    const s = sanitizeCoachText(raw)
    if (!s) return null
    if (isSameCoachingIdea(s, coachFocus)) return null
    if (coachFocusForMainFix && isSameCoachingIdea(s, coachFocusForMainFix)) return null
    if (coachRider && isSameCoachingIdea(s, coachRider)) return null
    if (fullMonologuePracticeReference && isSameCoachingIdea(s, fullMonologuePracticeReference)) return null
    return shortenCoachBullet(s, 220)
  }, [scenarioContext, coachFocus, coachFocusForMainFix, coachRider, fullMonologuePracticeReference])
  const hasLanguageCoachingNeed = Boolean(
    hasWordIssue ||
    fallbackLanguageFix ||
    nr ||
    (tc.issues?.length ?? 0) > 0 ||
    (sgr?.whatToFix.length ?? 0) > 0 ||
    (lengthProblems && Boolean(lengthFallbackPhrase)),
  )
  const showLanguageRewriteCard = Boolean(
    languageNativePhrase.trim() &&
    hasLanguageCoachingNeed &&
    !isSameAsOriginal(transcript, languageNativePhrase),
  )
  const phraseForSayThis = useMemo(() => {
    const w = wordCorrectionDisplayPhrase.trim()
    if (w && !isSameAsOriginal(transcript, w)) return w
    if (showLanguageRewriteCard && languageNativePhrase.trim()) return languageNativePhrase.trim()
    const pr = preferredRewrite?.improved?.trim()
    if (pr && !isSameAsOriginal(transcript, pr)) return pr
    return ''
  }, [transcript, wordCorrectionDisplayPhrase, showLanguageRewriteCard, languageNativePhrase, preferredRewrite])
  const showRecommendedLineInSayThisPill = Boolean(
    phraseForSayThis.trim() && !isSameAsOriginal(transcript, phraseForSayThis),
  )
  const hideWordCorrectionDuplicateBand = Boolean(
    phraseForSayThis
    && normalizeForCompare(phraseForSayThis) === normalizeForCompare(wordCorrectionDisplayPhrase.trim() || transcript),
  )
  const rewriteWhyForUi = useMemo(() => {
    const raw = showLanguageRewriteCard ? languageWhyBetter : sanitizeCoachText(preferredRewrite?.whyMoreNatural ?? '')
    const t = raw.trim()
    if (!t) return null
    const fixLine = sanitizeCoachText((coachFocusForMainFix || coachFocus || '').trim())
    if (fixLine && isSameCoachingIdea(t, fixLine)) return null
    if (scenarioContextForUi && isSameCoachingIdea(t, scenarioContextForUi)) return null
    if (coachRider && isSameCoachingIdea(t, coachRider)) return null
    return shortenCoachBullet(t, 220)
  }, [
    showLanguageRewriteCard,
    languageWhyBetter,
    preferredRewrite,
    coachFocusForMainFix,
    coachFocus,
    scenarioContextForUi,
    coachRider,
  ])
  const practiceNextLine = useMemo(() => {
    const pattern = sanitizeCoachText(sgr?.pattern)
    if (!pattern) return null
    return isSameCoachingIdea(pattern, coachFocus) ||
      isSameCoachingIdea(pattern, coachRider) ||
      languageWhatToFix.some((item) => isSameCoachingIdea(pattern, item))
      ? null
      : pattern
  }, [sgr?.pattern, coachFocus, coachRider, languageWhatToFix])
  const adaptiveActions = useMemo(
    () => pickAdaptiveActions(turn, corrections),
    [turn, corrections],
  )
  const visibleActions = showAllActions ? adaptiveActions : adaptiveActions.slice(0, 2)
  const hiddenActionCount = Math.max(0, adaptiveActions.length - visibleActions.length)

  const voiceLead = useMemo(() => {
    if (!hasAudio) return null
    const mv = (sgr?.mainVoiceFix ?? '').trim()
    if (mv) return mv
    const findings = (turn.audioFindings ?? []).map(sanitizeCoachText).filter(Boolean)
    if (findings.length > 0) return findings[0]
    const w = ac?.wordAssessments?.filter(x => x.status === 'weak' || x.status === 'unclear').sort((a, b) => a.score - b.score)[0]
    if (w) return `“${w.word}” is where clarity slips most — match the reference length and stress.`
    return null
  }, [hasAudio, turn, ac, sgr])

  /** Per-word Azure evidence is all strong/solid and there are no issue chips — skip "work on voice" copy that would contradict the score grid. */
  const voiceSurfaceLooksConfident = useMemo(() => {
    if (!hasAudio || !ac?.wordAssessments?.length) return false
    if (ac.wordAssessments.some((w) => w.status === 'weak' || w.status === 'unclear')) return false
    if ((turn.pronunciationIssues?.length ?? 0) > 0 || (turn.fluencyIssues?.length ?? 0) > 0) return false
    if (ev?.weakWords.length) return false
    if (
      ev &&
      (ev.rushedEndings.length > 0 ||
        ev.pauseIssues.length > 0 ||
        ev.problematicSegments.length > 0 ||
        ev.stressIssues.length > 0)
    ) {
      return false
    }
    return true
  }, [hasAudio, ac, turn, ev])

  const compareHints = turn.compareListenFor ?? []
  const hasEvidenceSnippet = Boolean(
    hasAudio && ev && (
      ev.strongWords.length > 0 ||
      ev.weakWords.length > 0 ||
      ev.problematicSegments.length > 0 ||
      ev.pauseIssues.length > 0 ||
      ev.stressIssues.length > 0 ||
      ev.rushedEndings.length > 0
    ),
  )
  const showWordEvidenceSection = hasAudio && (hasWordData || hasEvidenceSnippet)
  const summarySignals = useMemo(
    () => buildSentenceSummarySignals({
      turn,
      hasAudio,
      hasWordIssue,
      hasLanguageCoachingNeed,
      hasScenarioGap,
    }),
    [turn, hasAudio, hasWordIssue, hasLanguageCoachingNeed, hasScenarioGap],
  )
  const collapsedSummary = useMemo(
    () => buildCollapsedSentenceSummaryAdapter({
      turn,
      corrections,
      preferredMainFix: coachFocus,
      topProblem: topFix,
      hasScenarioGap,
    }),
    [turn, corrections, coachFocus, topFix, hasScenarioGap],
  )
  const signalToneClass: Record<SentenceSummarySignalTone, string> = {
    audio: 'border-slate-200/80 bg-slate-50/90 text-slate-700',
    language: 'border-slate-200/80 bg-white/92 text-slate-700',
    warning: 'border-amber-200/75 bg-amber-50/80 text-amber-900',
    scenario: 'border-slate-200/80 bg-slate-100/85 text-slate-600',
  }
  const mainFixSummary = collapsedSummary.line
  const hideCollapsedMainFixRepeat = Boolean(
    mainFixSummary
    && (collapsedMainFixDedupeAgainst ?? []).some((prior) => isSameCoachingIdea(mainFixSummary, prior)),
  )

  return (
    <article
      ref={sentenceCardRef}
      className={`overflow-hidden rounded-[28px] scroll-mt-24 transition-[box-shadow,border-color,background-color,transform] duration-200 ${
        expanded
          ? 'border border-slate-200/90 bg-white shadow-[0_18px_38px_-28px_rgba(15,23,42,0.45)]'
          : isPrioritySentence
            ? 'border border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,252,245,0.96),rgba(255,255,255,1))] shadow-[0_16px_34px_-28px_rgba(217,119,6,0.22)]'
            : 'border border-slate-200/75 bg-[linear-gradient(180deg,rgba(250,250,249,0.98),rgba(255,255,255,1))] shadow-[0_12px_30px_-28px_rgba(15,23,42,0.18)]'
      }`}
    >
      {/* ── COLLAPSED ── */}
      <button type="button"
        onClick={() => {
          if (expanded) {
            setSelectedWord(null)
            setShowAllActions(false)
            scrollIntoViewAfterUserOpenRef.current = false
          } else {
            scrollIntoViewAfterUserOpenRef.current = true
          }
          onToggle()
        }}
        className={`group grid w-full min-h-touch grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3.5 gap-y-2 px-4 py-4 text-left transition-[background-color,transform] duration-200 active:scale-[0.995] sm:px-5 ${
          expanded ? 'hover:bg-slate-50/35' : 'hover:bg-slate-50/70'
        }`}
      >
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold shrink-0 mt-0.5 ring-1 ${
          isPrioritySentence && !expanded
            ? 'bg-amber-50 text-amber-900 ring-amber-200/80'
            : 'bg-slate-100/90 text-ink-secondary ring-slate-200/80'
        }`}>
          {turn.turnIndex + 1}
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold tracking-tight text-ink-primary leading-[1.3] sm:text-[15.5px]">{transcript}</p>
          {mainFixSummary && !hideCollapsedMainFixRepeat ? (
            <div className="mt-2 flex items-start gap-2.5">
              <span className="mt-[0.32rem] inline-flex h-1.5 w-1.5 rounded-full bg-amber-400/80 shrink-0" />
              <p className="min-w-0 text-[12px] text-slate-700 leading-snug line-clamp-2 sm:text-[12.5px]">
                <span className="font-semibold text-amber-950">Fix:</span>{' '}
                <span className="font-medium">{mainFixSummary}</span>
              </p>
            </div>
          ) : null}
          {summarySignals.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {summarySignals.map((signal) => (
                <span
                  key={signal.label}
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.02em] shadow-[0_4px_10px_-8px_rgba(15,23,42,0.14)] ${signalToneClass[signal.tone]}`}
                >
                  {signal.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-start gap-1.5 shrink-0">
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-[background-color,color,transform,box-shadow] duration-200 ${
            expanded
              ? 'bg-slate-100 text-ink-secondary ring-1 ring-slate-200/80 shadow-inner'
              : 'bg-white/96 text-slate-500 ring-1 ring-slate-200/85 shadow-[0_10px_20px_-16px_rgba(15,23,42,0.3)] group-hover:bg-slate-50 group-hover:text-slate-700'
          }`}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </div>
      </button>

      {/* ── EXPANDED ── */}
      {expanded ? (
        <div className="border-t border-slate-100 px-4 pb-5 pt-4 space-y-6 bg-[linear-gradient(180deg,rgba(248,250,252,0.76),rgba(255,255,255,1)_18%)] sm:px-5">
          <section className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-slate-200/90 space-y-4">
            <div className="flex items-center gap-2">
              <Languages className="h-3.5 w-3.5 text-violet-600 shrink-0" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Say this</p>
            </div>
            <div className="rounded-[18px] bg-slate-50/90 px-3.5 py-3 ring-1 ring-slate-200/80 space-y-3">
              {showRecommendedLineInSayThisPill ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800/90">Recommended</p>
                  <ReferenceTextHighlight
                    text={phraseForSayThis}
                    turnId={turn.turnId}
                    audio={audio}
                    className="text-[15px] font-semibold text-ink-primary leading-snug mt-1"
                  />
                </div>
              ) : null}
              <div>
                {showRecommendedLineInSayThisPill ? (
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-1">You said</p>
                ) : null}
                <AnnotatedSentence transcript={transcript} corrections={corrections} />
              </div>
            </div>
            {(coachFocusForMainFix || coachFocus) ? (
              <p className="text-[14px] font-semibold text-amber-950 leading-snug">
                {sanitizeCoachText((coachFocusForMainFix || coachFocus).trim())}
              </p>
            ) : null}
            {fullMonologuePracticeReference ? (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 px-3.5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-900/75">Full Dutch (practice)</p>
                <p className="mt-2 text-[14px] text-amber-950 whitespace-pre-wrap leading-relaxed">{fullMonologuePracticeReference}</p>
                <p className="mt-2 text-[11px] text-amber-900/80 leading-snug">Read aloud a few times, then try again without looking.</p>
              </div>
            ) : null}
            {phraseForSayThis ? (
              <div className="space-y-2">
                {!showRecommendedLineInSayThisPill ? (
                  <ReferenceTextHighlight
                    text={phraseForSayThis}
                    turnId={turn.turnId}
                    audio={audio}
                    className="text-[15px] font-semibold text-ink-primary leading-snug"
                  />
                ) : null}
                <DutchWordGlossPicker
                  phrase={phraseForSayThis}
                  corrections={corrections}
                  detections={apiDetections.length ? apiDetections : undefined}
                  label="Tap a word"
                />
                {(refSrc || phraseForSayThis.trim()) ? (
                  <SentenceAudioControls
                    turnId={turn.turnId}
                    learnerSrc={null}
                    refSrc={refSrc}
                    referenceText={phraseForSayThis}
                    onPlaySnippet={onPlaySnippet}
                    audio={audio}
                    hideMissingLearnerHint
                  />
                ) : null}
              </div>
            ) : null}
            <WordCorrectionPanel
              transcript={transcript}
              corrections={corrections}
              correctedFullPhrase={wordCorrectionDisplayPhrase}
              detections={apiDetections.length ? apiDetections : undefined}
              scenarioTitle={scenarioTitle}
              turnId={turn.turnId}
              refSrc={refSrc}
              onPlaySnippet={onPlaySnippet}
              audio={audio}
              saving={saving}
              savedKeys={savedKeys}
              onSave={onSave}
              hideFullSentenceBand={hideWordCorrectionDuplicateBand}
            />

            <GrammarStructureExplainer
              turn={turn}
              transcript={transcript}
              dedupeAgainst={[
                coachFocus,
                coachFocusForMainFix,
                fullMonologuePracticeReference,
                coachRider,
                scenarioContext,
                fallbackLanguageFix?.mainFix,
                sgr?.mainFix,
              ].filter(Boolean) as string[]}
            />

            {sgr ? (
              <div className="space-y-3">
                {!hideDuplicateSgrMain && sgr.mainFix?.trim() && !isSameCoachingIdea(sgr.mainFix, coachFocus) ? (
                  <SentenceInset className="border-l-[3px] border-l-violet-500 bg-gradient-to-r from-violet-50/95 to-white">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-800 mb-0.5">Angle</p>
                    <p className="text-[13px] text-ink-primary leading-snug">{sgr.mainFix}</p>
                  </SentenceInset>
                ) : null}
                {languageWhatWorked.length > 0 || languageWhatToFix.length > 0 ? (
                  <SentenceInset className="space-y-3 border-l-[3px] border-l-emerald-500 bg-gradient-to-r from-emerald-50/90 to-white">
                    {languageWhatWorked.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">Worked</p>
                        <ul className="space-y-1">
                          {languageWhatWorked.slice(0, 2).map((s, i) => (
                            <li key={i} className="text-[12px] text-ink-primary leading-relaxed flex gap-2"><span className="text-emerald-500 shrink-0 mt-0.5">·</span><span>{s}</span></li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {languageWhatToFix.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800/90 mb-1">Adjust</p>
                        <ul className="space-y-1">
                          {languageWhatToFix.slice(0, 2).map((s, i) => (
                            <li key={i} className="text-[12px] text-ink-primary leading-relaxed flex gap-2"><span className="text-amber-500 shrink-0 mt-0.5">·</span><span>{s}</span></li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </SentenceInset>
                ) : null}
                {practiceNextLine ? (
                  <SentenceInset className="bg-violet-100/70">
                    <p className="text-[11px] text-violet-900 leading-relaxed"><span className="font-semibold">Practice next:</span> {practiceNextLine}</p>
                  </SentenceInset>
                ) : null}
              </div>
            ) : (
              <>
                {cleanStrengths.length > 0 || cleanProblems.length > 0 ? (
                  <SentenceInset className="space-y-3 border-l-[3px] border-l-emerald-500 bg-gradient-to-r from-emerald-50/80 to-white">
                    {cleanStrengths.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">Worked</p>
                        <ul className="space-y-1">
                          {cleanStrengths.slice(0, 2).map((s, i) => (
                            <li key={i} className="text-[12px] text-ink-primary leading-relaxed flex gap-2"><span className="text-emerald-500 shrink-0 mt-0.5">·</span><span>{s}</span></li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {cleanProblems.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">Adjust</p>
                        <ul className="space-y-1">
                          {cleanProblems.slice(0, 2).map((s, i) => (
                            <li key={i} className="text-[12px] text-ink-primary leading-relaxed flex gap-2"><span className="text-amber-500 shrink-0 mt-0.5">·</span><span>{s}</span></li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </SentenceInset>
                ) : null}
                {preferredRewrite ? null : turn.naturalRewrite?.improved && isSameAsOriginal(transcript, turn.naturalRewrite.improved) && !fallbackLanguageFix ? (
                  <SentenceInset className="bg-emerald-50/90">
                    <p className="text-[12px] text-emerald-800 font-medium leading-relaxed">Wording is already fine here. Spend your reps on delivery.</p>
                  </SentenceInset>
                ) : null}
              </>
            )}

            {tc.issues.length > 0 ? (
              <SentenceInset>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Grammar</p>
                {tc.issues.slice(0, 3).map((iss, i) => (
                  <div key={i} className="flex gap-2 py-1 text-[12px] leading-relaxed">
                    <span className="text-rose-400 shrink-0 mt-0.5">·</span>
                    <div><span className="text-ink-primary">{iss.issue}</span>{iss.fix ? <span className="text-emerald-700 ml-1">→ {iss.fix}</span> : null}</div>
                  </div>
                ))}
              </SentenceInset>
            ) : null}
            {(scenarioId === 'small_talk' ||
              scenarioId === 'party_social' ||
              scenarioId === 'explaining_something' ||
              scenarioId === 'storytelling' ||
              scenarioId === 'opinions_discussions') &&
            socialPhrasingRewriteRows(tc).length > 0 ? (
              <SentenceInset
                className={
                  scenarioId === 'party_social'
                    ? 'border border-amber-200/80 bg-amber-50/85'
                    : scenarioId === 'explaining_something' ||
                        scenarioId === 'storytelling' ||
                        scenarioId === 'opinions_discussions'
                      ? 'border border-violet-200/80 bg-violet-50/85'
                      : 'border border-violet-200/80 bg-violet-50/85'
                }
              >
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.14em] mb-2 ${
                    scenarioId === 'party_social'
                      ? 'text-amber-950/90'
                      : scenarioId === 'explaining_something' ||
                          scenarioId === 'storytelling' ||
                          scenarioId === 'opinions_discussions'
                        ? 'text-violet-950/90'
                        : 'text-violet-900/85'
                  }`}
                >
                  {scenarioId === 'party_social'
                    ? 'Party: reactions & follow-ups'
                    : scenarioId === 'explaining_something'
                      ? 'Explain: steps & connectors'
                      : scenarioId === 'storytelling'
                        ? 'Story: arc & past tense'
                        : scenarioId === 'opinions_discussions'
                          ? 'Opinions: stance & reasons'
                          : 'Dutch phrasing picks'}
                </p>
                <ul className="space-y-2">
                  {socialPhrasingRewriteRows(tc).map((row, i) => (
                    <li key={`${row.label}-${i}`} className="text-[12px] leading-relaxed text-ink-primary">
                      <span
                        className={`font-semibold ${
                          scenarioId === 'party_social'
                            ? 'text-amber-950'
                            : scenarioId === 'explaining_something' ||
                                scenarioId === 'storytelling' ||
                                scenarioId === 'opinions_discussions'
                              ? 'text-violet-950'
                              : 'text-sky-950'
                        }`}
                      >
                        {row.label}
                      </span>
                      <span
                        className={
                          scenarioId === 'party_social'
                            ? 'text-amber-800 mx-1'
                            : scenarioId === 'explaining_something' ||
                                scenarioId === 'storytelling' ||
                                scenarioId === 'opinions_discussions'
                              ? 'text-violet-800 mx-1'
                              : 'text-violet-700 mx-1'
                        }
                      >
                        →
                      </span>
                      <span>{row.text}</span>
                    </li>
                  ))}
                </ul>
              </SentenceInset>
            ) : null}
          </section>

          {/* Voice review */}
          <SentenceSectionShell
            tone="voice"
            title="Voice review"
            icon={<Volume2 className="h-3.5 w-3.5 text-violet-600 shrink-0" aria-hidden />}
          >
            {hasAudio ? (
              <>
                <SentenceInset className="bg-white/82">
                  <SentenceAudioControls
                    turnId={turn.turnId}
                    learnerSrc={learnerSrc}
                    refSrc={refSrc}
                    referenceText={turn.referenceSentence}
                    onPlaySnippet={onPlaySnippet}
                    audio={audio}
                  />
                </SentenceInset>

                {learnerSrc && refSrc && compareHints.length > 0 ? (
                  <SentenceInset className="bg-violet-50/80 ring-1 ring-violet-100/80">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-800">Listen for this</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {compareHints.slice(0, 2).map((line, i) => (
                        <li key={i} className="text-[11px] text-ink-primary leading-snug flex gap-2"><span className="text-violet-500 shrink-0">·</span><span>{line}</span></li>
                      ))}
                    </ul>
                  </SentenceInset>
                ) : null}

                {!voiceSurfaceLooksConfident &&
                (sgr?.mainVoiceFix || voiceLead || (turn.voiceDrillInstruction ?? '').trim() || sanitizeCoachText(turn.chunkingRhythmSuggestion)) ? (
                  <SentenceInset className="bg-violet-100/65 ring-1 ring-violet-100/90">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-800/80 mb-1">Work on this first</p>
                      <p className="text-[12px] text-ink-primary leading-relaxed">{sgr?.mainVoiceFix || voiceLead}</p>
                    </div>
                    {((turn.voiceDrillInstruction ?? '').trim() || sanitizeCoachText(turn.chunkingRhythmSuggestion)) ? (
                      <p className="mt-2 text-[11px] text-violet-900 leading-relaxed">
                        <span className="font-semibold">Drill:</span>{' '}
                        {(turn.voiceDrillInstruction ?? '').trim() || sanitizeCoachText(turn.chunkingRhythmSuggestion)}
                      </p>
                    ) : null}
                  </SentenceInset>
                ) : null}

                {turn.pronunciationIssues.length > 0 ? (
                  <SentenceInset>
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Start with these words</p>
                      <ReferencePlaybackButton
                        turnId={turn.turnId}
                        refSrc={refSrc}
                        snippetText={pronunciationSnippetText}
                        onPlaySnippet={onPlaySnippet}
                        audio={audio}
                        label="Play reference"
                      />
                    </div>
                    <div className="space-y-2">
                      {turn.pronunciationIssues.slice(0, 2).map((pi, i) => (
                        <div key={i} className="rounded-2xl bg-violet-50/70 px-3 py-2.5 ring-1 ring-violet-100/90">
                          <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-3">
                            <span className="inline-flex h-fit shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-900 ring-1 ring-violet-200 self-start">
                              {pi.word}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[12px] text-ink-primary leading-relaxed">{pi.issue}</p>
                              {pi.fix ? <p className="mt-1 text-[11px] text-emerald-800 leading-relaxed">{pi.fix}</p> : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SentenceInset>
                ) : null}
                {turn.fluencyIssues.length > 0 ? (
                  <SentenceInset>
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Smooth this chunk</p>
                      <ReferencePlaybackButton
                        turnId={turn.turnId}
                        refSrc={refSrc}
                        snippetText={fluencySnippetText}
                        onPlaySnippet={onPlaySnippet}
                        audio={audio}
                        label="Play reference"
                      />
                    </div>
                    <div className="space-y-2">
                      {turn.fluencyIssues.slice(0, 2).map((fi, i) => (
                        <div key={i} className="rounded-2xl bg-amber-50/75 px-3 py-2.5 ring-1 ring-amber-100/90">
                          <p className="text-[12px] text-ink-primary leading-relaxed">{fi.issue}</p>
                          {fi.fix ? <p className="mt-1 text-[11px] text-amber-900 leading-relaxed">{fi.fix}</p> : null}
                        </div>
                      ))}
                    </div>
                  </SentenceInset>
                ) : null}
              </>
            ) : (
              <SentenceInset className="bg-slate-100/80">
                <div className="flex items-start gap-2.5">
                  <MicOff className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[12px] font-medium text-ink-primary">No learner audio on this line</p>
                    <p className="text-[11px] text-ink-secondary mt-0.5 leading-relaxed">Pronunciation feedback needs a clip; language notes above still apply.</p>
                  </div>
                </div>
                {refSrc ? (
                  <div className="mt-3">
                    <SentenceAudioControls
                      turnId={turn.turnId}
                      learnerSrc={null}
                      refSrc={refSrc}
                      referenceText={turn.referenceSentence}
                      onPlaySnippet={onPlaySnippet}
                      audio={audio}
                    />
                  </div>
                ) : null}
              </SentenceInset>
            )}
            {showWordEvidenceSection ? (
              <div className="mt-3 space-y-3 border-t border-violet-100/70 pt-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                  <Hash className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>Word detail</span>
                </div>
              {ev ? (
                <SentenceInset className="space-y-3 bg-white/92">
                  {ev.strongWords.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Came through clearly</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ev.strongWords.slice(0, 5).map((word) => (
                          <span key={word} className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-900">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {ev.weakWords.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Repeat these first</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ev.weakWords.slice(0, 5).map((word) => (
                          <span key={word} className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-950">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {ev.problematicSegments.length > 0 || ev.rushedEndings.length > 0 ? (
                    <p className="text-[11px] text-ink-secondary leading-relaxed">
                      <span className="font-semibold text-slate-800">Best chunk to retry:</span>{' '}
                      {ev.problematicSegments[0] || ev.rushedEndings[0]}
                    </p>
                  ) : null}
                  {ev.pauseIssues.length > 0 ? (
                    <p className="text-[11px] text-ink-secondary leading-relaxed">
                      <span className="font-semibold text-slate-800">Watch the pause:</span>{' '}
                      {ev.pauseIssues[0]}
                    </p>
                  ) : null}
                </SentenceInset>
              ) : null}

              {hasWordData ? (
                <SentenceInset>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">Per-word scores</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {ac!.wordAssessments.map((w, i) => {
                      const ws = WORD_STATUS[w.status] ?? WORD_STATUS.okay
                      return (
                        <button key={i} type="button"
                          onClick={() => setSelectedWord(selectedWord?.word === w.word && selectedWord?.startMs === w.startMs ? null : w)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium ${ws.bg} ${ws.text} hover:ring-1 hover:ring-slate-300 active:scale-[0.97] transition-all`}>
                          <span>{w.word}</span>
                          <span className="text-[10px] font-normal opacity-50 tabular-nums border-l border-current/15 pl-1.5">{Math.round(w.score)}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-ink-tertiary font-medium">
                    {(['strong', 'okay', 'weak', 'unclear'] as const).map(st => (
                      <span key={st} className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${WORD_STATUS[st].dot}`} />{WORD_STATUS[st].label}</span>
                    ))}
                  </div>
                </SentenceInset>
              ) : null}

              {selectedWord ? <WordDetailPanel w={selectedWord} onClose={() => setSelectedWord(null)} turnId={turn.turnId} referenceText={turn.referenceSentence ?? null} onPlaySnippet={onPlaySnippet} audio={audio} /> : null}
              </div>
          ) : null}
          </SentenceSectionShell>

          {(scenarioContextForUi || coachRider || rewriteWhyForUi) ? (
            <section className="rounded-[24px] bg-slate-50/80 px-4 py-4 ring-1 ring-slate-200/70 space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">Why it matters</p>
              {scenarioContextForUi ? (
                <p className="text-[12px] text-ink-primary leading-snug">{scenarioContextForUi}</p>
              ) : null}
              {coachRider ? (
                <p className="text-[12px] text-ink-secondary leading-snug">{sanitizeCoachText(coachRider)}</p>
              ) : null}
              {rewriteWhyForUi ? (
                <p className="text-[12px] text-ink-secondary leading-snug">{rewriteWhyForUi}</p>
              ) : null}
            </section>
          ) : null}

          {/* Save / practice */}
          {adaptiveActions.length > 0 ? (
            <SentenceSectionShell tone="actions" title="Save / practice">
              <p className="text-[12px] text-ink-secondary">Start with one smart next rep.</p>
              <div className="flex flex-wrap gap-2">
                {visibleActions.map((act, i) => {
                  const key = `${turn.turnId}-${act.type}-${i}`
                  const improved =
                    act.type === 'save_pronunciation_word' && (turn.wrongWordDetections?.[0]?.suggestedCorrection)
                      ? turn.wrongWordDetections![0].suggestedCorrection
                      : turn.referenceSentence
                  return (
                    <SaveButton key={key} busyKey={key} saving={saving} savedKeys={savedKeys}
                      label={act.title.slice(0, 52)} savedLabel="Saved"
                      idle={i === 0
                        ? 'inline-flex min-h-touch items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-2.5 text-[12px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60 active:scale-[0.98]'
                        : 'inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-ink-primary hover:bg-slate-50 disabled:opacity-60 active:scale-[0.98]'}
                      done={i === 0
                        ? 'inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-600 px-3.5 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60'
                        : 'inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-100 px-3.5 py-2.5 text-[12px] font-semibold text-emerald-800 disabled:opacity-60'}
                      onClick={() => onSave({
                        type: act.type, title: act.title,
                        content: [transcript, turn.referenceSentence, act.detail].filter(Boolean).join('\n---\n'),
                        sourceTurnId: turn.turnId, saveBusyKey: key,
                        learnerOriginalSentence: transcript, improvedSentence: improved,
                        tagCategory: null, suggestedTrainingMode: null,
                      })} />
                  )
                })}
              </div>
              {hiddenActionCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAllActions((s) => !s)}
                  className="text-[12px] font-semibold text-slate-600 hover:text-ink-primary"
                >
                  {showAllActions ? 'Show fewer actions' : `Show ${hiddenActionCount} more action${hiddenActionCount === 1 ? '' : 's'}`}
                </button>
              ) : null}
            </SentenceSectionShell>
          ) : null}

        </div>
      ) : null}
    </article>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PHONE CALL — weighted performance + line-by-line ear check
// ═══════════════════════════════════════════════════════════════════════════

function displayWeightsSummary(text: string | undefined | null): string {
  return shortenCoachBullet(sanitizeCoachText(text ?? ''), 150)
}

function PhoneCallPerformanceSection({
  performance,
  phoneDims,
  resolvedMedia,
  playReferenceSnippet,
  audio,
}: {
  performance: PhoneCallPerformance
  phoneDims: ScoredDimension[]
  resolvedMedia: Record<string, { learner?: string; reference?: string }>
  playReferenceSnippet: (turnId: string, text: string) => Promise<void>
  audio: AudioController
}) {
  const [snippetLoading, setSnippetLoading] = useState<string | null>(null)
  const [openMomentId, setOpenMomentId] = useState<string | null>(null)

  return (
    <section className="rounded-[28px] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.35)] sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Phone-call performance</p>
          <h2 className="text-[18px] font-semibold tracking-tight text-ink-primary">Phone scoring</h2>
          <p className="text-[13px] text-ink-secondary leading-snug">{displayWeightsSummary(performance.weightsSummary)}</p>
        </div>
        {performance.compositePhoneScore != null ? (
          <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Blended</p>
            <p className="text-[22px] font-semibold tabular-nums text-ink-primary">{performance.compositePhoneScore}</p>
          </div>
        ) : null}
      </div>

      {phoneDims.length > 0 ? (
        <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-[#fbfbf8] px-3">
          {phoneDims.map((dim) => (
            <DimensionRow key={dim.id} dim={dim} />
          ))}
        </div>
      ) : null}

      {performance.sentenceMoments.length > 0 ? (
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Line-by-line ear check</p>
          <p className="text-[12px] text-ink-secondary leading-snug">
            Replay the agent line, then check your meaning against the notes.
          </p>
          <div className="mt-3 space-y-3">
            {performance.sentenceMoments.map((moment: PhoneCallSentenceMoment) => {
              const row = resolvedMedia[moment.turnId] ?? {}
              const learnerSrc = row.learner ?? ''
              const expanded = openMomentId === moment.turnId
              const asstKey = `${moment.turnId}-phone-asst`
              const asstLoading = snippetLoading === asstKey
              const asstPlaying = audio.isActive(asstKey, 'reference', moment.assistantSaidNl)
              return (
                <article
                  key={moment.turnId}
                  className={`rounded-2xl border px-3.5 py-3 sm:px-4 ${moment.didYouCatchThis ? 'border-amber-200 bg-amber-50/80' : 'border-slate-200 bg-white'}`}
                >
                  <button
                    type="button"
                    className="flex w-full flex-col gap-2 text-left"
                    onClick={() => setOpenMomentId(expanded ? null : moment.turnId)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[12px] font-semibold text-ink-primary">Turn {moment.turnIndex + 1}</span>
                        {moment.didYouCatchThis ? (
                          <span className="inline-flex max-w-full items-center rounded-full bg-amber-200/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                            Did you catch this?
                          </span>
                        ) : null}
                      </div>
                      <span className="inline-flex shrink-0 text-slate-500" aria-hidden>
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[12px] leading-snug text-ink-secondary">{moment.learnerSaidNl || '—'}</p>
                  </button>
                  {expanded ? (
                    <div className="mt-3 space-y-3 border-t border-slate-200/80 pt-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Agent (NL)</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-ink-primary">{moment.assistantSaidNl || '—'}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={!moment.assistantSaidNl.trim() || asstLoading}
                            onClick={() => {
                              if (!moment.assistantSaidNl.trim()) return
                              if (asstPlaying && audio.state === 'playing') {
                                audio.stop()
                                return
                              }
                              setSnippetLoading(asstKey)
                              void playReferenceSnippet(asstKey, moment.assistantSaidNl).finally(() => setSnippetLoading(null))
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {asstPlaying && audio.state === 'playing' ? <Pause className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                            {asstLoading ? 'Loading…' : asstPlaying && audio.state === 'playing' ? 'Stop' : 'Replay assistant'}
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">You said</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-ink-primary">{moment.learnerSaidNl || '—'}</p>
                        <button
                          type="button"
                          disabled={!learnerSrc}
                          onClick={() => {
                            if (!learnerSrc) return
                            if (audio.isActive(moment.turnId, 'learner') && audio.state === 'playing') audio.stop()
                            else audio.playLearner(moment.turnId, learnerSrc)
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-semibold text-violet-900 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {audio.isActive(moment.turnId, 'learner') && audio.state === 'playing' ? <Pause className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                          Your recording
                        </button>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Meaning to catch</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-ink-primary">{moment.expectedUnderstandingEn}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Fit check</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">{moment.compareNoteEn}</p>
                      </div>
                      {moment.idealResponseHintNl ? (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Stronger line</p>
                          <p className="mt-1 text-[13px] leading-relaxed text-ink-primary">{moment.idealResponseHintNl}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function SmallTalkPerformanceSection({
  performance,
  smallTalkDims,
}: {
  performance: SmallTalkPerformance
  smallTalkDims: ScoredDimension[]
}) {
  return (
    <section className="rounded-[28px] border border-slate-200/90 bg-white px-4 py-4 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.35)] sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Small talk performance</p>
          <h2 className="text-[18px] font-semibold tracking-tight text-ink-primary">Small talk</h2>
          <p className="text-[13px] text-ink-secondary leading-snug">{displayWeightsSummary(performance.weightsSummary)}</p>
        </div>
        {performance.compositeSmallTalkScore != null ? (
          <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Blended</p>
            <p className="text-[22px] font-semibold tabular-nums text-ink-primary">{performance.compositeSmallTalkScore}</p>
          </div>
        ) : null}
      </div>
      {smallTalkDims.length > 0 ? (
        <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-[#fbfbf8] px-3">
          {smallTalkDims.map((dim) => (
            <DimensionRow key={dim.id} dim={dim} />
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-[12px] text-ink-secondary leading-snug">
        Sentence coaching has natural Dutch options — replay lines you want to smooth out.
      </p>
    </section>
  )
}

function MeetingNewPeoplePerformanceSection({
  performance,
  meetingNewPeopleDims,
}: {
  performance: MeetingNewPeoplePerformance
  meetingNewPeopleDims: ScoredDimension[]
}) {
  return (
    <section className="rounded-[28px] border border-violet-200/70 bg-white px-4 py-4 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.35)] sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700/90">Meeting new people</p>
          <h2 className="text-[18px] font-semibold tracking-tight text-ink-primary">Intros &amp; follow-ups</h2>
          <p className="text-[13px] text-ink-secondary leading-snug">{displayWeightsSummary(performance.weightsSummary)}</p>
        </div>
        {performance.compositeMeetingNewPeopleScore != null ? (
          <div className="shrink-0 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-800/90">Blended</p>
            <p className="text-[22px] font-semibold tabular-nums text-ink-primary">{performance.compositeMeetingNewPeopleScore}</p>
          </div>
        ) : null}
      </div>
      {meetingNewPeopleDims.length > 0 ? (
        <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-[#fbfbf8] px-3">
          {meetingNewPeopleDims.map((dim) => (
            <DimensionRow key={dim.id} dim={dim} />
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-[12px] text-ink-secondary leading-snug">
        Sentence coaching has stronger intros and follow-ups — replay what you want to copy.
      </p>
    </section>
  )
}

function PartySocialPerformanceSection({
  performance,
  partySocialDims,
}: {
  performance: PartySocialPerformance
  partySocialDims: ScoredDimension[]
}) {
  return (
    <section className="rounded-[28px] border border-amber-200/75 bg-white px-4 py-4 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.35)] sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-800/90">Party / social</p>
          <h2 className="text-[18px] font-semibold tracking-tight text-ink-primary">Party flow</h2>
          <p className="text-[13px] text-ink-secondary leading-snug">{displayWeightsSummary(performance.weightsSummary)}</p>
        </div>
        {performance.compositePartySocialScore != null ? (
          <div className="shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900/85">Blended</p>
            <p className="text-[22px] font-semibold tabular-nums text-ink-primary">{performance.compositePartySocialScore}</p>
          </div>
        ) : null}
      </div>
      {partySocialDims.length > 0 ? (
        <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-[#fbfbf8] px-3">
          {partySocialDims.map((dim) => (
            <DimensionRow key={dim.id} dim={dim} />
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-[12px] text-ink-secondary leading-snug">
        Sentence coaching has reactions and fillers — replay lines you want at a mingle.
      </p>
    </section>
  )
}

function ExplainingSomethingPerformanceSection({
  performance,
  explainingSomethingDims,
}: {
  performance: ExplainingSomethingPerformance
  explainingSomethingDims: ScoredDimension[]
}) {
  return (
    <section className="rounded-[28px] border border-violet-200/75 bg-white px-4 py-4 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.35)] sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-800/90">Explaining</p>
          <h2 className="text-[18px] font-semibold tracking-tight text-ink-primary">Structure, steps, connectors</h2>
          <p className="text-[13px] text-ink-secondary leading-relaxed">{performance.weightsSummary}</p>
        </div>
        {performance.compositeExplainingSomethingScore != null ? (
          <div className="shrink-0 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-900/85">Blended</p>
            <p className="text-[22px] font-semibold tabular-nums text-ink-primary">
              {performance.compositeExplainingSomethingScore}
            </p>
          </div>
        ) : null}
      </div>
      {explainingSomethingDims.length > 0 ? (
        <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-[#fbfbf8] px-3">
          {explainingSomethingDims.map((dim) => (
            <DimensionRow key={dim.id} dim={dim} />
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-[12px] text-ink-secondary leading-snug">
        Sentence coaching adds order and connectors — replay the phrasing you need in real explanations.
      </p>
    </section>
  )
}

function StorytellingPerformanceSection({
  performance,
  storytellingDims,
}: {
  performance: StorytellingPerformance
  storytellingDims: ScoredDimension[]
}) {
  return (
    <section className="rounded-[28px] border border-violet-200/75 bg-white px-4 py-4 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.35)] sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-800/90">Storytelling</p>
          <h2 className="text-[18px] font-semibold tracking-tight text-ink-primary">Story flow</h2>
          <p className="text-[13px] text-ink-secondary leading-snug">{displayWeightsSummary(performance.weightsSummary)}</p>
        </div>
        {performance.compositeStorytellingScore != null ? (
          <div className="shrink-0 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-900/85">Blended</p>
            <p className="text-[22px] font-semibold tabular-nums text-ink-primary">{performance.compositeStorytellingScore}</p>
          </div>
        ) : null}
      </div>
      {storytellingDims.length > 0 ? (
        <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-[#fbfbf8] px-3">
          {storytellingDims.map((dim) => (
            <DimensionRow key={dim.id} dim={dim} />
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-[12px] text-ink-secondary leading-snug">
        Sentence coaching fills arc gaps and past-tense color — replay lines you want for real stories.
      </p>
    </section>
  )
}

function OpinionsDiscussionsPerformanceSection({
  performance,
  opinionsDims,
}: {
  performance: OpinionsDiscussionsPerformance
  opinionsDims: ScoredDimension[]
}) {
  return (
    <section className="rounded-[28px] border border-amber-200/75 bg-white px-4 py-4 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.35)] sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-900/85">Opinions &amp; discussion</p>
          <h2 className="text-[18px] font-semibold tracking-tight text-ink-primary">Stance &amp; tone</h2>
          <p className="text-[13px] text-ink-secondary leading-snug">{displayWeightsSummary(performance.weightsSummary)}</p>
        </div>
        {performance.compositeOpinionsDiscussionsScore != null ? (
          <div className="shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-950/85">Blended</p>
            <p className="text-[22px] font-semibold tabular-nums text-ink-primary">{performance.compositeOpinionsDiscussionsScore}</p>
          </div>
        ) : null}
      </div>
      {opinionsDims.length > 0 ? (
        <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-[#fbfbf8] px-3">
          {opinionsDims.map((dim) => (
            <DimensionRow key={dim.id} dim={dim} />
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-[12px] text-ink-secondary leading-snug">
        Sentence coaching sharpens stance, reasons, and softer pushback — replay variants you want in chat.
      </p>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// NEXT ACTION CARD
// ═══════════════════════════════════════════════════════════════════════════

export function SpeakLiveEvaluationPage() {
  const queryClient = useQueryClient()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : params.sessionId?.[0] ?? ''
  const scenarioId = searchParams.get('scenarioId')?.trim() || 'train-station'
  const level = searchParams.get('level')?.trim().toUpperCase() || 'A2'

  useEffect(() => {
    speakLiveHubProgressionRef.current = null
    setSessionHubProgression(null)
  }, [sessionId])

  const audio = useReportAudioController()

  const [payload, setPayload] = useState<ApiLiveSessionEvaluationResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedKeys, setSavedKeys] = useState<Set<string>>(() => new Set())
  const [resolvedMedia, setResolvedMedia] = useState<Record<string, { learner?: string; reference?: string }>>({})
  const [, setMediaLoading] = useState(false)
  const resolvedMediaRef = useRef(resolvedMedia)
  resolvedMediaRef.current = resolvedMedia
  const mediaFetchGenRef = useRef(0)
  const snippetAudioCacheRef = useRef<
    Map<string, { audioUrl: string; wordBoundaries?: SpeakLiveTtsWordBoundary[] }>
  >(new Map())
  const evaluationRunRef = useRef<Promise<ApiLiveSessionEvaluationResponse> | null>(null)
  const [evalPollGeneration, setEvalPollGeneration] = useState(0)
  const [progression, setProgression] = useState<SpeakingProgressSummary | null>(null)
  const [sessionHubProgression, setSessionHubProgression] = useState<{
    xpAwarded: number
    newStreak: number
    streakChanged: boolean
  } | null>(null)
  const speakLiveHubProgressionRef = useRef<string | null>(null)
  const [openTurnId, setOpenTurnId] = useState<string | null>(null)
  const [regeneratingReport, setRegeneratingReport] = useState(false)
  const [timingOpen, setTimingOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchSpeakingProgression().then(r => {
      if (!cancelled && r.enabled) setProgression(r.summary)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const recapHref = useMemo(
    () => `${appSpeakLiveThreadRecap(sessionId)}?${new URLSearchParams({ scenarioId, level }).toString()}`,
    [sessionId, scenarioId, level],
  )

  const poll = useCallback(async (): Promise<ApiLiveSessionEvaluationResponse | undefined> => {
    if (!sessionId) return undefined
    const r = await conversationClient.getLiveSessionEvaluation(sessionId)
    setPayload(r)
    return r
  }, [sessionId])

  const requestEvaluationRun = useCallback((opts?: { forceRestart?: boolean }) => {
    if (!sessionId) {
      return Promise.reject(new Error('Missing session ID.'))
    }
    if (evaluationRunRef.current) {
      return evaluationRunRef.current
    }
    const runPromise = runWithRetry(sessionId, opts).finally(() => {
      if (evaluationRunRef.current === runPromise) {
        evaluationRunRef.current = null
      }
    })
    evaluationRunRef.current = runPromise
    return runPromise
  }, [sessionId])

  const playReferenceSnippet = useCallback(async (turnId: string, text: string) => {
    const cleaned = text.trim()
    if (!cleaned) return
    const cacheKey = `${sessionId}:${cleaned.toLowerCase()}`
    let cached = snippetAudioCacheRef.current.get(cacheKey)
    if (!cached) {
      const res = await conversationClient.speakLiveTtsChunk({
        text: cleaned,
        threadId: sessionId || undefined,
        chunkIndex: 0,
      })
      cached = {
        audioUrl: res.audioUrl,
        wordBoundaries: res.wordBoundaries,
      }
      snippetAudioCacheRef.current.set(cacheKey, cached)
    }
    audio.playReference(turnId, cached.audioUrl, cleaned, cached.wordBoundaries)
  }, [audio, sessionId])

  const restartEvaluationFromScratch = useCallback(async () => {
    if (!sessionId) return
    setLoadError(null)
    setPayload({
      status: 'pending',
      evaluation: null,
      errorMessage: null,
      qaStatus: 'pending',
      qaSummary: null,
    })
    const r = await requestEvaluationRun({ forceRestart: true })
    setPayload(r)
    if (r.status !== 'complete') setEvalPollGeneration(g => g + 1)
  }, [sessionId, requestEvaluationRun])

  const handleRegenerateReport = useCallback(async () => {
    setRegeneratingReport(true)
    setLoadError(null)
    try {
      await restartEvaluationFromScratch()
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not regenerate the report.')
    } finally {
      setRegeneratingReport(false)
    }
  }, [restartEvaluationFromScratch])

  useEffect(() => {
    if (!sessionId || !isFeature1ChatBackendEnabled()) return
    let interval: ReturnType<typeof setInterval> | undefined
    let cancelled = false
    void (async () => {
      try {
        let r = await poll()
        if (cancelled || !r) return
        if (r.status === 'pending') {
          r = await requestEvaluationRun()
          if (cancelled) return
          setPayload(r)
        }
        if (r.status === 'running' || r.status === 'pending') {
          interval = setInterval(async () => { const n = await poll(); if (cancelled || !n) return; if (n.status === 'complete' || n.status === 'failed') { if (interval) clearInterval(interval) } }, 1200)
        }
      } catch (e) { if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Something went wrong loading your feedback.') }
    })()
    return () => { cancelled = true; if (interval) clearInterval(interval) }
  }, [sessionId, poll, requestEvaluationRun, evalPollGeneration])

  useEffect(() => { if (!isFeature1ChatBackendEnabled()) router.replace('/app/talk/live') }, [router])

  const ev = payload?.evaluation ?? null
  const report: SessionEvaluationReport | null = useMemo(() => ev ? parseEvaluationReport(ev as Record<string, unknown>) : null, [ev])
  const showPartialOptimizedBanner = useMemo(() => {
    if (!report || !payload?.evaluation) return false
    return isPartialOptimizedScenarioReport(payload.evaluation as Record<string, unknown>)
  }, [report, payload?.evaluation])
  const evalTimingDebug =
    process.env.NODE_ENV === 'development' || searchParams.get('evalTiming') === '1'
  const showScenarioReportDevPanel = useMemo(
    () => isScenarioReportDevDiagnosticsEnabled({ evalDevQuery: searchParams.get('evalDev') }),
    [searchParams],
  )
  const showBuildTimingOnReport = evalTimingDebug || !!report?.generationDiagnostics
  const turns = useMemo(() => report?.turnEvaluations ?? [], [report])
  const missingCoreGoalIds = useMemo(() => {
    return new Set(
      (report?.taskOutcome?.goalEvidence ?? [])
        .filter((goal) => goal.tier !== 'stretch' && goal.status !== 'completed')
        .map((goal) => goal.goalId.trim().toLowerCase())
        .filter(Boolean),
    )
  }, [report])
  const missingCoreTurnIds = useMemo(() => {
    return new Set(
      (report?.taskOutcome?.goalEvidence ?? [])
        .filter((goal) => goal.tier !== 'stretch' && goal.status !== 'completed' && goal.turnId)
        .map((goal) => goal.turnId as string),
    )
  }, [report])
  const priorityTurnId = useMemo(
    () => selectPrioritySentenceTurnId(turns, missingCoreGoalIds, missingCoreTurnIds),
    [turns, missingCoreGoalIds, missingCoreTurnIds],
  )
  /** When the report pins a focus to a specific turn (e.g. wrong-word detection), prefer that for quotes and saves. */
  const effectivePriorityTurnId = useMemo(
    () => report?.focusArea?.sourceTurnId?.trim() || priorityTurnId,
    [report?.focusArea?.sourceTurnId, priorityTurnId],
  )
  const glossPrefetchScenarioTitle = report?.scenarioName || report?.scenarioTitle || ''
  const glossPrefetchSources = useMemo(
    () => (report ? buildGlossPrefetchSources(turns, glossPrefetchScenarioTitle) : []),
    [report, turns, glossPrefetchScenarioTitle],
  )

  useEffect(() => {
    void prefetchDutchWordGlosses(glossPrefetchSources)
  }, [glossPrefetchSources])

  const pronunciationBreakdown = useMemo(() => {
    if (!report) {
      return {
        focusWords: [] as Array<{ word: string; avg: number; count: number; instruction: string | null }>,
        practiceTurns: [] as Array<{ turnIndex: number; transcript: string; score: number }>,
        actionBullets: [] as string[],
        coverageText: null as string | null,
        partialReadNote: null as string | null,
      }
    }

    const weakWordMap = new Map<string, { label: string; total: number; count: number; instruction: string | null; bestScore: number }>()
    const failedTurns: Array<{ turnIndex: number; transcript: string; reason: string }> = []
    const weakestTurns: Array<{ turnIndex: number; transcript: string; score: number }> = []
    const rushedEndings: string[] = []
    const languagePriorityRepairs: Array<{ turnIndex: number; transcript: string; fixLine: string }> = []

    for (const turn of report.turnEvaluations ?? []) {
      const diag = turn.audioDiagnostics
      const hasLanguageRepairPriority = turnNeedsLanguageRepairForSummary(turn)
      if (turn.signalSources.audioMetrics === 'azure_audio' && diag && !diag.assessmentOk) {
        failedTurns.push({
          turnIndex: turn.turnIndex,
          transcript: turn.learnerTranscript,
          reason: summarizeAudioFailure(diag.assessmentCaveats[0]),
        })
      }

      if (turn.audioCoaching?.pronunciationScore != null) {
        weakestTurns.push({
          turnIndex: turn.turnIndex,
          transcript: hasLanguageRepairPriority && turn.referenceSentence ? turn.referenceSentence : turn.learnerTranscript,
          score: turn.audioCoaching.pronunciationScore,
        })
      }

      if (hasLanguageRepairPriority) {
        const fixTarget = (turn.referenceSentence || '').trim()
        const fixLead = (turn.mainFixLine ?? '').replace(/^Main fix:\s*/i, '').trim()
        if (fixTarget) {
          languagePriorityRepairs.push({
            turnIndex: turn.turnIndex,
            transcript: fixTarget,
            fixLine: fixLead || 'Fix the wording first, then re-record the corrected line slowly.',
          })
        }
      }

      for (const note of turn.audioCoaching?.evidence.rushedEndings ?? []) {
        if (note.trim()) rushedEndings.push(note.trim())
      }

      if (hasLanguageRepairPriority) continue

      for (const w of turn.audioCoaching?.wordAssessments ?? []) {
        if (w.status !== 'weak' && w.status !== 'unclear') continue
        const key = w.word.trim().toLowerCase()
        if (!key) continue
        const prev = weakWordMap.get(key)
        if (prev) {
          prev.total += w.score
          prev.count += 1
          if (w.score < prev.bestScore) {
            prev.bestScore = w.score
            prev.instruction = w.instruction ?? prev.instruction
          }
        } else {
          weakWordMap.set(key, {
            label: w.word.trim(),
            total: w.score,
            count: 1,
            instruction: w.instruction ?? null,
            bestScore: w.score,
          })
        }
      }
    }

    const focusWords = Array.from(weakWordMap.values())
      .map((w) => ({ word: w.label, avg: Math.round(w.total / w.count), count: w.count, instruction: w.instruction }))
      .sort((a, b) => a.avg - b.avg || b.count - a.count)
      .slice(0, 3)

    const practiceTurns = weakestTurns
      .sort((a, b) => a.score - b.score)
      .filter((t, idx) => t.score < 80 || idx === 0)
      .slice(0, 2)
    const es = report.evidenceSummary
    const assessed = es?.audioPipelineDiagnostics?.turnsAssessedOk ?? es?.azurePronunciationTurnCount ?? 0
    const recorded = es?.audioTurnCount ?? 0
    const actionBullets: string[] = []

    for (const repair of languagePriorityRepairs.slice(0, 2)) {
      actionBullets.push(`Fix line ${repair.turnIndex + 1} first: ${repair.fixLine} Then re-record: “${repair.transcript}”.`)
    }

    for (const w of focusWords.slice(0, 2)) {
      actionBullets.push(
        w.instruction?.trim()
          ? w.instruction.trim()
          : `Repeat “${w.word}” slowly and match the reference vowel length and stress.`
      )
    }
    if (rushedEndings.length > 0) {
      actionBullets.push(rushedEndings[0])
    }
    if (practiceTurns[0]) {
      actionBullets.push(`Re-record line ${practiceTurns[0].turnIndex + 1} slowly: “${practiceTurns[0].transcript}”.`)
    }

    const partialReadNote =
      failedTurns.length > 0
        ? `${failedTurns.length} other clip${failedTurns.length === 1 ? '' : 's'} could not be scored clearly, so this advice is based on the usable lines.`
        : null

    return {
      focusWords,
      practiceTurns,
      actionBullets: actionBullets.filter((v, i, arr) => v && arr.indexOf(v) === i).slice(0, 3),
      coverageText:
        recorded > 0
          ? `${assessed} of ${recorded} recorded line${recorded === 1 ? '' : 's'} produced usable pronunciation scoring.`
          : null,
      partialReadNote,
    }
  }, [report])

  const turnsMediaSignature = useMemo(() => turns.map(t => [t.turnId, t.learnerAudioUrl ?? t.originalAudioUrl, t.referenceAudioUrl].join(':')).join('|'), [turns])

  useEffect(() => {
    if (!turnsMediaSignature || !isFeature1ChatBackendEnabled()) return
    const base = getApiBaseUrl().replace(/\/$/, '')
    if (!base) return
    const fetchGen = ++mediaFetchGenRef.current
    const ac = new AbortController()
    const revokeRows = (rows: Record<string, { learner?: string; reference?: string }>) => {
      for (const row of Object.values(rows)) {
        if (row.learner?.startsWith('blob:')) URL.revokeObjectURL(row.learner)
        if (row.reference?.startsWith('blob:')) URL.revokeObjectURL(row.reference)
      }
    }
    const revokeAll = () => { revokeRows(resolvedMediaRef.current) }
    revokeAll(); setResolvedMedia({}); setMediaLoading(true)

    async function resolveClip(raw: string | null | undefined): Promise<string | undefined> {
      if (!raw?.trim()) return undefined
      if (raw.startsWith('data:')) return raw
      const rel = raw.startsWith('/') ? raw.slice(1) : raw
      const url = `${base}/api/${rel}?_cb=${Date.now()}`
      const res = await fetch(url, { headers: { 'x-user-id': getApiUserId() }, signal: ac.signal, cache: 'no-store' })
      if (!res.ok) { console.warn(`[Audio] resolveClip failed: ${res.status} for ${url}`); return undefined }
      const rawCt = res.headers.get('content-type') || ''
      const isLearner = rel.includes('learner-audio')
      const fallbackCt = isLearner ? 'audio/webm' : 'audio/mpeg'
      let ct: string
      if (!rawCt || rawCt === 'application/octet-stream') {
        ct = fallbackCt
      } else if (rawCt.includes('l16') || (rawCt.includes('pcm') && !rawCt.includes('wav'))) {
        ct = 'audio/wav'
      } else {
        ct = rawCt
      }
      const buf = await res.arrayBuffer()
      const firstBytes = Array.from(new Uint8Array(buf, 0, Math.min(48, buf.byteLength))).map(b => b.toString(16).padStart(2, '0')).join(' ')
      console.log(`[Audio] resolveClip: ${url.split('/').slice(-2).join('/')} → ${buf.byteLength} bytes, content-type="${rawCt}" → using "${ct}", first48hex=[${firstBytes}]`)
      if (buf.byteLength === 0) return undefined
      const blob = new Blob([buf], { type: ct })
      return URL.createObjectURL(blob)
    }

    void (async () => {
      const next: Record<string, { learner?: string; reference?: string }> = {}
      try {
        for (const turn of turns) {
          const id = String(turn.turnId ?? ''); if (!id) continue
          const [learner, reference] = await Promise.all([resolveClip(turn.learnerAudioUrl ?? turn.originalAudioUrl ?? ''), resolveClip(turn.referenceAudioUrl ?? '')])
          next[id] = { learner, reference }
        }
        if (ac.signal.aborted || mediaFetchGenRef.current !== fetchGen) { revokeRows(next); return }
        setResolvedMedia(next)
      } catch (error) {
        revokeRows(next)
        if (ac.signal.aborted || isAbortError(error)) return
        console.error('[Audio] resolveClip failed unexpectedly', error)
      } finally { if (mediaFetchGenRef.current === fetchGen) setMediaLoading(false) }
    })()
    return () => { ac.abort(); revokeAll(); setMediaLoading(false) }
  }, [turns, turnsMediaSignature])

  /** Hero + summary strip — must run before any early return (Rules of Hooks). */
  const weightedCompletion = useMemo(() => {
    if (!report || typeof report.taskOutcome?.weightedCompletion !== 'number') return undefined
    return Math.max(0, Math.min(100, Math.round(report.taskOutcome.weightedCompletion)))
  }, [report])

  const goalChecklistPercentUi = useMemo(() => {
    if (!report || typeof report.taskOutcome?.goalChecklistPercent !== 'number') return undefined
    return Math.max(0, Math.min(100, Math.round(report.taskOutcome.goalChecklistPercent)))
  }, [report])

  const showScenarioOutcomeChecklistFootnote = useMemo(
    () =>
      goalChecklistPercentUi != null &&
      weightedCompletion != null &&
      goalChecklistPercentUi - weightedCompletion >= 8,
    [goalChecklistPercentUi, weightedCompletion],
  )

  const coreGoals = useMemo(
    () => (report?.taskOutcome?.goalEvidence ?? []).filter((goal) => goal.tier !== 'stretch'),
    [report],
  )

  const stretchGoals = useMemo(
    () => (report?.taskOutcome?.goalEvidence ?? []).filter((goal) => goal.tier === 'stretch'),
    [report],
  )

  const derivedFocus = useMemo((): FocusArea | null => {
    if (!report) return null
    if (report.focusArea) return report.focusArea
    const missed = coreGoals.find((goal) => goal.status !== 'completed')
    if (!missed) return null
    return {
      label: stripSpeakLiveGoalIdBrackets(missed.goalLabel),
      why: 'This missing question is the main reason your scenario score stayed low.',
      exampleLine: missed.completionHint ?? '',
      cta: 'retry_scenario',
    }
  }, [report, coreGoals])

  const voiceTakeaway = useMemo(() => {
    if (!report) return ''
    const sessionHasAnyAudio = report.sessionAudioMetricsAvailable
    return sanitizeCoachText(
      report.keyTakeaway?.evidenceType === 'audio' || (report.keyTakeaway?.evidenceType === 'mixed' && sessionHasAnyAudio)
        ? report.keyTakeaway?.message
        : '',
    )
  }, [report])

  const languageTakeaway = useMemo(() => {
    if (!report) return ''
    const sessionHasAnyAudio = report.sessionAudioMetricsAvailable
    return sanitizeCoachText(
      report.keyTakeaway?.evidenceType === 'transcript'
      || report.keyTakeaway?.evidenceType === 'mixed'
      || (!sessionHasAnyAudio && report.keyTakeaway?.evidenceType !== 'audio')
        ? report.keyTakeaway?.message
        : '',
    )
  }, [report])

  const fixNextBullets = useMemo(() => {
    if (!report) return []
    return buildFixNextBullets({
      report,
      derivedFocus,
      languageTakeaway,
      voiceTakeaway,
      sessionHasAnyAudio: report.sessionAudioMetricsAvailable,
    })
  }, [report, derivedFocus, languageTakeaway, voiceTakeaway])

  const heroCoachLine = useMemo(
    () =>
      report
        ? clampHeroCoachSummary({
          coachSummary: report.coachSummaryLine,
          coachHeadline: report.coachHeadline,
          keyTakeaway: report.keyTakeaway?.message,
          weightedCompletion,
          fixBullets: fixNextBullets,
        })
        : '',
    [report, weightedCompletion, fixNextBullets],
  )

  const wentWellBullets = useMemo(() => {
    if (!report) return []
    return buildWhatWentWellBullets(report, turns)
  }, [report, turns])

  const priorityTurn = useMemo(
    () => (effectivePriorityTurnId ? turns.find((t) => t.turnId === effectivePriorityTurnId) ?? null : null),
    [turns, effectivePriorityTurnId],
  )

  const practiceModel = useMemo(
    () => pickPracticePhraseForReport(derivedFocus, priorityTurn),
    [derivedFocus, priorityTurn],
  )

  const teacherSummaryInput = useMemo((): SessionTeacherSummaryInput | null => {
    if (!report) return null
    const completedCoreGoals = coreGoals.filter((g) => g.status === 'completed').length
    const voiceHero =
      sanitizeCoachText(report.keyTakeaway?.message)
      || sanitizeCoachText(report.coachHeadline)
      || ''
    return {
      scenarioTitle: report.scenarioName || report.scenarioTitle || 'your session',
      wentWellBullets: wentWellBullets,
      fixNextBullets: fixNextBullets,
      heroLine: voiceHero || null,
      practicePhrase: practiceModel.phrase.trim() || null,
      completedCoreGoals,
      totalCoreGoals: coreGoals.length,
      turns,
    }
  }, [report, coreGoals, wentWellBullets, fixNextBullets, practiceModel.phrase, turns])

  const collapsedMainFixDedupePool = useMemo(
    () => [...fixNextBullets, practiceModel.phrase].filter(Boolean),
    [fixNextBullets, practiceModel.phrase],
  )

  const primaryReportScore = useMemo(() => {
    if (weightedCompletion != null) return weightedCompletion
    if (
      report &&
      typeof report.overall?.overallScore === 'number' &&
      Number.isFinite(report.overall.overallScore)
    ) {
      return Math.round(report.overall.overallScore)
    }
    return null
  }, [weightedCompletion, report])

  useEffect(() => {
    if (!sessionId || !report || payload?.status !== 'complete') return
    if (speakLiveHubProgressionRef.current === sessionId) return
    speakLiveHubProgressionRef.current = sessionId
    const uid = getApiUserId()
    const tz = getClientTimeZone()
    const w =
      typeof report.taskOutcome?.weightedCompletion === 'number'
        ? Math.round(Math.max(0, Math.min(100, report.taskOutcome.weightedCompletion)))
        : typeof report.overall?.overallScore === 'number'
          ? Math.round(report.overall.overallScore)
          : 0
    const completed = w >= 45 && report.learnerTurnCount >= 2
    const durationSeconds = Math.max(0, Math.floor(report.sessionDurationSeconds || report.durationSec || 0))
    const catalog = getSpeakLiveCatalogItem(scenarioId)
    const type =
      scenarioId === LANGUAGE_COACH_SCENARIO_ID || catalog?.type === 'coach_mode' ? 'coach' : 'scenario'
    const improvements =
      report.focusArea?.label?.trim()
        ? [report.focusArea.label.trim().slice(0, 160)]
        : report.keyTakeaway?.message?.trim()
          ? [report.keyTakeaway.message.trim().slice(0, 160)]
          : undefined
    void postProgressionSessionComplete(
      {
        sessionId,
        userId: uid,
        type,
        durationSeconds,
        completed,
        meaningfulCompletion: completed,
        turns: report.learnerTurnCount,
        improvements: improvements && improvements.length > 0 ? improvements : undefined,
        createdAt: report.endedAt || new Date().toISOString(),
      },
      tz,
    )
      .then((r) => {
        setSessionHubProgression({
          xpAwarded: r.xpAwarded,
          newStreak: r.newStreak,
          streakChanged: r.streakChanged,
        })
        void queryClient.invalidateQueries({ queryKey: ['talk', 'session-history'] })
        return invalidateProgressionQueries(queryClient, uid, tz)
      })
      .catch(() => {
        speakLiveHubProgressionRef.current = null
      })
  }, [sessionId, report, payload?.status, scenarioId, queryClient])

  const practiceSavePhraseKey = useMemo(() => {
    if (!practiceModel.turnId || !practiceModel.phrase.trim()) return null
    return `save-phrase-hero-${practiceModel.turnId}-${practiceModel.phrase.slice(0, 48)}`
  }, [practiceModel.turnId, practiceModel.phrase])

  const handleSave = async (input: Record<string, unknown>) => {
    const key = String(input.saveBusyKey ?? `${input.sourceTurnId}-${input.type}-${input.title}`)
    if (savedKeys.has(key)) return
    setSaveError(null)
    setSaving(key)
    try {
      const rawTag = typeof input.tagCategory === 'string' ? input.tagCategory : null
      const VALID_TAGS = new Set([
        'library', 'coach_follow_up', 'review_queue', 'speaking_drill',
        'pronunciation_drill', 'rhythm_drill', 'phrasing_upgrade', 'general',
      ])
      const tagCategory = rawTag && VALID_TAGS.has(rawTag) ? rawTag : null
      await conversationClient.saveTrainingItem({
        sourceSessionId: sessionId, sourceTurnId: (input.sourceTurnId as string) ?? null,
        type: (input.type as string) as Parameters<typeof conversationClient.saveTrainingItem>[0]['type'],
        title: String(input.title ?? ''), content: String(input.content ?? ''),
        audioReferenceUrl: null, learnerAudioUrl: null, sourceScenarioId: scenarioId,
        learnerOriginalSentence: (input.learnerOriginalSentence as string) ?? null,
        improvedSentence: (input.improvedSentence as string) ?? null,
        tagCategory,
        suggestedTrainingMode: (input.suggestedTrainingMode as string) ?? null,
        metadata: {
          ...(typeof input.metadata === 'object' && input.metadata !== null && !Array.isArray(input.metadata)
            ? (input.metadata as Record<string, unknown>)
            : {}),
          scenarioId,
          level,
          surface: 'speak_live_voice_report',
        },
      })
      setSavedKeys(prev => { const next = new Set(prev); next.add(key); return next })
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save. Check your connection and try again.')
    } finally { setSaving(null) }
  }

  // ─── Non-report states ─────────────────────────────────────────────────

  if (!sessionId) return <div className="min-h-[100dvh] bg-white flex items-center justify-center text-[13px] text-slate-400">We couldn&apos;t find this session. Try going back and opening it again.</div>
  if (!isFeature1ChatBackendEnabled()) return null

  if (loadError) {
    return (
      <div className="min-h-[100dvh] bg-white px-5 py-16 max-w-md mx-auto flex flex-col gap-4 text-center">
        <p className="text-[14px] text-ink-secondary">{loadError}</p>
        <button type="button" className="rounded-xl bg-slate-900 px-5 py-3 text-[13px] font-semibold text-white hover:bg-slate-800"
          onClick={() => { setLoadError(null); void poll().then(r => { if (r) { setPayload(r); if (r.status !== 'complete') setEvalPollGeneration(g => g + 1) } }) }}>Retry</button>
        <button type="button" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-[13px] font-semibold text-slate-900 hover:bg-slate-50"
          onClick={() => { void restartEvaluationFromScratch().catch(e => setLoadError(e instanceof Error ? e.message : 'Could not restart the report evaluation.')) }}>
          Restart report from scratch
        </button>
        <button type="button" className="text-[13px] text-slate-500 hover:underline" onClick={() => router.push(APP_TALK_HUB)}>Back to Talk</button>
      </div>
    )
  }

  if (!payload || payload.status === 'pending' || payload.status === 'running') {
    const verifying = payload?.qaStatus === 'running' || payload?.speakLivePostSessionPhase === 'verifying'
    const phase = payload?.evaluationPhase ?? null
    const headline = getScenarioReportLoadingHeadline({ verifying, evaluationPhase: phase })
    const subtitle = getScenarioReportLoadingSubtitle({
      verifying,
      qaSummary: payload?.qaSummary,
      evaluationPhase: phase,
    })
    const chipActive = activeScenarioReportStageChip(phase, {
      verifying,
      qaRunning: payload?.qaStatus === 'running',
    })
    const prepVariant = isOptimizedScenarioReportLane(phase) ? 'optimized' : 'standard'
    const diag = payload?.evaluationDiagnostics
    return (
      <>
        <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center gap-3 px-5 py-10">
          <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-slate-700 motion-safe:animate-spin" />
          <p className="text-[14px] font-semibold text-ink-primary mt-3">{headline}</p>
          <p className="text-[13px] text-ink-secondary max-w-sm text-center leading-relaxed">{subtitle}</p>
          <ScenarioReportStageChips active={chipActive} />
          <EvaluationPreparingSteps
            apiStatus={payload?.status}
            speakLivePhase={payload?.speakLivePostSessionPhase}
            qaStatus={payload?.qaStatus}
            evaluationPhase={phase}
            variant={prepVariant}
          />
          {payload?.partialEvaluationInsights && payload.partialEvaluationInsights.length > 0 ? (
            <div className="mt-4 w-full max-w-md rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-900/80">Early takeaways</p>
              <ul className="mt-2 list-disc pl-4 text-[13px] text-ink-primary space-y-1.5">
                {payload.partialEvaluationInsights.map((line, i) => (
                  <li key={i} className="leading-snug">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {diag?.runningForMs != null ? (
            <div className="mt-2 w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Technical details</p>
              <div className="mt-2 space-y-1 text-[12px] text-slate-700">
                <p>Current phase: {payload?.evaluationPhase ?? payload?.speakLivePostSessionPhase ?? payload?.status ?? 'pending'}</p>
                <p>Running for: {formatDurationMs(diag.runningForMs)}</p>
              </div>
            </div>
          ) : null}
          {showScenarioReportDevPanel ? <ScenarioReportGenerationDevPanel payload={payload ?? null} report={null} /> : null}
          {evalTimingDebug ? (
            <button
              type="button"
              onClick={() => setTimingOpen(true)}
              className="mt-1 inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              <Timer className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
              Build timing (debug)
            </button>
          ) : null}
          <button
            type="button"
            className="mt-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-[13px] font-semibold text-slate-900 hover:bg-slate-50"
            onClick={() => {
              void restartEvaluationFromScratch().catch((e) =>
                setLoadError(e instanceof Error ? e.message : 'Could not restart the report evaluation.')
              )
            }}
          >
            Restart report from scratch
          </button>
          <button type="button" className="mt-4 text-[12px] font-semibold text-slate-600 hover:underline" onClick={() => router.push(recapHref)}>Read the conversation while you wait</button>
        </div>
        {evalTimingDebug ? (
          <EvaluationTimingBreakdown
            open={timingOpen}
            onClose={() => setTimingOpen(false)}
            generationDiagnostics={null}
            evaluationDiagnostics={payload?.evaluationDiagnostics}
            buildStatus={payload?.status}
          />
        ) : null}
      </>
    )
  }

  if (payload.status === 'failed') {
    const msg = payload.errorMessage ?? ''
    const qaFailed = payload.qaStatus === 'failed' || /report qa/i.test(msg)
    const isUnavailable = msg.startsWith('Evaluation not available:')
    const noAudio = msg.includes('no voice recording')
    const noModel = msg.includes('coaching model')
    const debugMatch = msg.match(/\[Debug:\s*(.+)\]/)
    const debugInfo = debugMatch?.[1] ?? null
    const userMsg = qaFailed
      ? "We're still verifying this report because some feedback did not match your session closely enough."
      : msg.replace(/\s*\[Debug:.*\]/, '')

    return (
      <EvalUnavailablePage
        isUnavailable={isUnavailable} noAudio={noAudio} noModel={noModel}
        userMsg={userMsg} debugInfo={debugInfo} fullError={msg} sessionId={sessionId}
        onRetry={() => { void runWithRetry(sessionId).then(r => { setPayload(r); setEvalPollGeneration(g => g + 1) }) }}
        onRestart={() => { void restartEvaluationFromScratch().catch(e => setLoadError(e instanceof Error ? e.message : 'Could not restart the report evaluation.')) }}
        onBack={() => router.push(APP_TALK_HUB)}
        onRecap={() => router.push(recapHref)}
      />
    )
  }

  if (!report) {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center gap-3">
        <p className="text-[13px] text-slate-400">No feedback available yet.</p>
        <button type="button" className="text-[12px] text-slate-500 hover:underline" onClick={() => void poll().then(r => r && setPayload(r))}>Refresh</button>
      </div>
    )
  }

  if (report.scenarioId === 'language_coach' && report.languageCoachDebrief) {
    return (
      <LanguageCoachDedicatedReport
        report={report}
        debrief={report.languageCoachDebrief}
        memoryRibbon={payload.learningMemoryRibbon ?? null}
        recapHref={recapHref}
        sessionId={sessionId}
        scenarioId={report.scenarioId}
        level={level}
        onPlayDutchReference={playReferenceSnippet}
        onSave={handleSave}
        saving={saving}
        savedKeys={savedKeys}
        onBeforeLeave={() => audio.stop()}
        onRebuildReport={() => void handleRegenerateReport()}
        rebuildingReport={regeneratingReport}
      />
    )
  }

  // ─── Full report ───────────────────────────────────────────────────────

  const es = report.evidenceSummary
  const audioEv = es ? deriveAudioEvidence(es) : null
  const langEv = es ? deriveLanguageEvidence(es) : null
  const reportTitle = report.scenarioName || report.scenarioTitle
  const retryHref =
    report.scenarioId === 'language_coach'
      ? APP_LANGUAGE_COACH
      : speakLiveRunHref({ scenarioId, level })
  const sessionHasAnyAudio = report.sessionAudioMetricsAvailable

  const voiceDims = (report.overall?.dimensions ?? []).filter(d => {
    const id = d.id.toLowerCase()
    return id.includes('pronun') || id.includes('rhythm') || id.includes('fluency') || id.includes('pacing') || id.includes('voice')
  })
  const phoneDims = (report.overall?.dimensions ?? []).filter(d => d.id.startsWith('phone_'))
  const smallTalkDims = (report.overall?.dimensions ?? []).filter(d => d.id.startsWith('small_talk_'))
  const meetingNewPeopleDims = (report.overall?.dimensions ?? []).filter(d => d.id.startsWith('meeting_new_people_'))
  const partySocialDims = (report.overall?.dimensions ?? []).filter(d => d.id.startsWith('party_social_'))
  const explainingSomethingDims = (report.overall?.dimensions ?? []).filter(d => d.id.startsWith('explaining_something_'))
  const storytellingDims = (report.overall?.dimensions ?? []).filter(d => d.id.startsWith('storytelling_'))
  const opinionsDiscussionsDims = (report.overall?.dimensions ?? []).filter(d => d.id.startsWith('opinions_'))
  const languageDims = (report.overall?.dimensions ?? []).filter(d => {
    const id = d.id.toLowerCase()
    if (
      d.id.startsWith('phone_') ||
      d.id.startsWith('small_talk_') ||
      d.id.startsWith('meeting_new_people_') ||
      d.id.startsWith('party_social_') ||
      d.id.startsWith('explaining_something_') ||
      d.id.startsWith('storytelling_') ||
      d.id.startsWith('opinions_')
    ) {
      return false
    }
    return !id.includes('pronun') && !id.includes('rhythm') && !id.includes('fluency') && !id.includes('pacing') && !id.includes('voice')
  })
  const phonePerformanceBlock =
    report.scenarioId === 'phone_call' && report.phoneCallPerformance ? report.phoneCallPerformance : null
  const smallTalkPerformanceBlock =
    report.scenarioId === 'small_talk' && report.smallTalkPerformance ? report.smallTalkPerformance : null
  const meetingNewPeoplePerformanceBlock =
    report.scenarioId === 'meeting_new_people' && report.meetingNewPeoplePerformance
      ? report.meetingNewPeoplePerformance
      : null
  const partySocialPerformanceBlock =
    report.scenarioId === 'party_social' && report.partySocialPerformance ? report.partySocialPerformance : null
  const explainingSomethingPerformanceBlock =
    report.scenarioId === 'explaining_something' && report.explainingSomethingPerformance
      ? report.explainingSomethingPerformance
      : null
  const storytellingPerformanceBlock =
    report.scenarioId === 'storytelling' && report.storytellingPerformance ? report.storytellingPerformance : null
  const opinionsDiscussionsPerformanceBlock =
    report.scenarioId === 'opinions_discussions' && report.opinionsDiscussionsPerformance
      ? report.opinionsDiscussionsPerformance
      : null

  return (
    <div className="min-h-[100dvh] bg-[#f7f7f3] text-ink-primary">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/92 backdrop-blur-xl px-5 py-3.5 flex items-center justify-between gap-3">
        <button type="button" onClick={() => { audio.stop(); router.push(APP_TALK_HUB) }} className="text-[13px] font-semibold text-slate-600 shrink-0 hover:text-ink-primary">Done</button>
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-slate-400 truncate text-center flex-1">Session report</p>
        <button type="button" onClick={() => router.push(recapHref)} className="text-[12px] font-medium text-slate-400 hover:text-slate-600 shrink-0">Recap</button>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 pb-16 sm:px-5 sm:py-10 sm:pb-20">
        <div className="space-y-12">
        {saveError ? (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-2xl border border-rose-200/90 bg-rose-50 px-4 py-3 text-left shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-[13px] font-medium text-rose-950">{saveError}</p>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="shrink-0 text-[12px] font-semibold text-rose-800 underline decoration-rose-300 underline-offset-2 hover:text-rose-950"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {showPartialOptimizedBanner ? (
          <div
            role="status"
            className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/90 px-4 py-3 text-left shadow-sm sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden />
              <p className="text-[13px] leading-relaxed text-slate-700">
                Some voice scoring covered only part of your recorded lines; your transcript feedback and the rest of this report are unchanged.
              </p>
            </div>
            <button
              type="button"
              disabled={regeneratingReport}
              onClick={() => void handleRegenerateReport()}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:self-center"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 shrink-0 ${regeneratingReport ? 'motion-safe:animate-spin' : ''}`}
                aria-hidden
              />
              {regeneratingReport ? 'Re-scoring…' : 'Re-score voice'}
            </button>
          </div>
        ) : null}
        {report.coachingModel?.source === 'deterministic' ? (
          <div
            role="alert"
            className="flex gap-3 rounded-2xl border border-amber-200/90 bg-amber-50 px-4 py-3.5 text-left shadow-sm"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-amber-900/90">Live coaching model unavailable</p>
              <p className="text-[13px] leading-relaxed text-amber-950/95">{report.coachingModel.userMessage}</p>
            </div>
          </div>
        ) : null}

        {/* Above the fold: coach stack (A–D) */}
        <div className="rounded-[28px] border border-violet-200/50 bg-gradient-to-br from-violet-50/40 via-white to-violet-50/35 px-5 py-8 shadow-[0_28px_64px_-48px_rgba(79,70,229,0.18)] ring-1 ring-violet-100/40 sm:px-8 sm:py-10">
          <div className="space-y-10 sm:space-y-12">
        {/* A — Top summary */}
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">
              <span className="h-1 w-6 rounded-full bg-gradient-to-r from-violet-500 to-violet-500" aria-hidden />
              How you did
            </p>
            <h1 className="text-[clamp(1.5rem,4.5vw,1.85rem)] font-semibold tracking-tight text-ink-primary leading-[1.12]">{reportTitle}</h1>
          </div>
          {heroCoachLine ? (
            <p className="max-w-2xl text-[15px] leading-relaxed text-slate-600">{heroCoachLine}</p>
          ) : null}
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-violet-100/80 pb-6">
            {primaryReportScore != null ? (
              <div className="min-w-0 rounded-2xl bg-gradient-to-br from-white to-violet-50/60 px-4 py-3 ring-1 ring-violet-200/60 shadow-[0_12px_28px_-20px_rgba(109,40,217,0.2)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600/90">Overall</p>
                <p className="mt-1.5 bg-gradient-to-r from-violet-700 to-violet-600 bg-clip-text text-[40px] font-semibold tabular-nums tracking-tight text-transparent leading-none sm:text-[44px]">
                  {primaryReportScore}
                </p>
              </div>
            ) : (
              <div className="text-[13px] text-slate-500">See full feedback for scores.</div>
            )}
          </div>
          <p className="text-[13px] leading-relaxed text-slate-500">
            <span className="font-medium text-slate-600">{report.targetLevel}</span>
            <span className="mx-2 text-slate-300 select-none" aria-hidden>·</span>
            <span>{formatSessionDuration(report.sessionDurationSeconds)}</span>
            <span className="mx-2 text-slate-300 select-none" aria-hidden>·</span>
            <span>
              {report.learnerTurnCount} {report.learnerTurnCount === 1 ? 'turn' : 'turns'}
            </span>
            {audioEv ? (
              <>
                <span className="mx-2 text-slate-300 select-none" aria-hidden>·</span>
                <span className={audioEv.status === 'none' ? 'text-amber-700/90' : undefined}>
                  Audio{' '}
                  {audioEv.status === 'all' ? 'captured end-to-end' : audioEv.status === 'partial' ? 'partially captured' : 'not available'}
                </span>
              </>
            ) : null}
          </p>
          {sessionHubProgression ? (
            <div
              className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-emerald-200/85 bg-gradient-to-r from-emerald-50/90 to-teal-50/50 px-4 py-3.5 ring-1 ring-emerald-100/60"
              aria-live="polite"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-900/75">Progress</span>
                <span className="text-[22px] font-bold tabular-nums text-emerald-950">
                  +{sessionHubProgression.xpAwarded} XP
                </span>
              </div>
              <div className="min-w-0 text-[13px] leading-snug text-emerald-950/90">
                {sessionHubProgression.streakChanged ? (
                  <span className="font-semibold">Streak updated — {sessionHubProgression.newStreak} day streak.</span>
                ) : sessionHubProgression.newStreak > 0 ? (
                  <span>Current streak: {sessionHubProgression.newStreak} day{sessionHubProgression.newStreak === 1 ? '' : 's'}.</span>
                ) : (
                  <span>Logged to your Talk momentum (streak builds on daily practice).</span>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {sessionId && teacherSummaryInput ? (
          <SessionVoiceTeacherSummaryCard sessionId={sessionId} summaryInput={teacherSummaryInput} />
        ) : null}

        {/* B — What went well */}
        <section className="space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700/90">What went well</h2>
          {wentWellBullets.length > 0 ? (
            <ul className="space-y-3">
              {wentWellBullets.map((line, i) => (
                <li key={`well-${i}-${line.slice(0, 24)}`} className="flex gap-3 text-[14px] leading-snug text-ink-primary">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600/90" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] leading-relaxed text-slate-500">Highlights are light this run — full feedback includes goal-by-goal notes.</p>
          )}
        </section>

        {/* C — Fix this next (high-visibility callout) */}
        <section
          className="rounded-2xl border border-amber-300/55 bg-gradient-to-br from-amber-50/95 via-white to-orange-50/30 px-4 py-5 shadow-[0_14px_36px_-28px_rgba(180,83,9,0.35)] ring-1 ring-amber-200/45 sm:px-5 sm:py-6"
          aria-labelledby="speak-live-fix-next-heading"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="speak-live-fix-next-heading" className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-950/90">
              Fix this next
            </h2>
            <span className="rounded-full bg-amber-600/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950/85">
              Priority
            </span>
          </div>
          {fixNextBullets.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {fixNextBullets.map((line, i) => (
                <li
                  key={`fix-${i}-${line.slice(0, 24)}`}
                  className="flex gap-3 rounded-xl border border-amber-200/60 bg-white/90 px-3 py-2.5 text-[14px] leading-snug text-ink-primary shadow-sm"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] leading-relaxed text-amber-950/80">No urgent fix flagged — open full feedback below for goal-by-goal notes.</p>
          )}
        </section>

        {/* D — Practice now (single primary CTA: scenario retry) */}
        <section className="rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-950 to-sky-950 px-5 py-6 text-white shadow-[0_28px_56px_-36px_rgba(30,27,75,0.65)] ring-1 ring-violet-500/25 sm:px-6 sm:py-7">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-200/80">Practice now</h2>
          {practiceModel.phrase.trim() ? (
            <p className="mt-3 text-[17px] font-semibold leading-snug tracking-tight text-white">{practiceModel.phrase}</p>
          ) : (
            <p className="mt-3 text-[14px] leading-relaxed text-white/80">Run the scenario again and aim for one clear Dutch line each turn.</p>
          )}
          <div className="mt-6 space-y-3">
            <a
              href={retryHref}
              className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_28px_-14px_rgba(14,165,233,0.55)] hover:bg-violet-400 active:scale-[0.99] transition-transform"
            >
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              {report.scenarioId === 'language_coach' ? 'Start another session' : 'Practice this scenario'}
            </a>
            {(practiceModel.phrase.trim() && practiceModel.turnId && sessionHasAnyAudio) ||
            (practiceModel.phrase.trim() && practiceModel.turnId && practiceSavePhraseKey) ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
                {practiceModel.phrase.trim() && practiceModel.turnId && sessionHasAnyAudio ? (
                  <button
                    type="button"
                    onClick={() =>
                      void playReferenceSnippet(
                        practiceModel.turnId!,
                        (priorityTurn?.referenceSentence?.trim() || practiceModel.phrase).trim(),
                      )
                    }
                    className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-[13px] font-medium text-white/90 hover:bg-white/10"
                  >
                    <Play className="h-4 w-4 shrink-0" aria-hidden />
                    Hear reference clip
                  </button>
                ) : null}
                {practiceModel.phrase.trim() && practiceModel.turnId && practiceSavePhraseKey ? (
                  <button
                    type="button"
                    disabled={Boolean(saving) || savedKeys.has(practiceSavePhraseKey)}
                    onClick={() =>
                      void handleSave({
                        type: 'save_phrase',
                        title: 'Corrected phrase',
                        content: [
                          `Original: ${practiceModel.learnerLine ?? ''}`,
                          `Corrected: ${practiceModel.phrase}`,
                          `Scenario: ${reportTitle}`,
                        ].join('\n'),
                        sourceTurnId: practiceModel.turnId,
                        saveBusyKey: practiceSavePhraseKey,
                        learnerOriginalSentence: practiceModel.learnerLine ?? '',
                        improvedSentence: practiceModel.phrase,
                        tagCategory: 'phrasing_upgrade',
                        suggestedTrainingMode: null,
                      })
                    }
                    className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-white/20 bg-transparent px-4 py-2.5 text-[13px] font-medium text-white/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <BookmarkPlus className="h-4 w-4 shrink-0" aria-hidden />
                    {savedKeys.has(practiceSavePhraseKey) ? 'Saved' : saving === practiceSavePhraseKey ? 'Saving…' : 'Save this phrase'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
          </div>

        <ReportPracticeNowSection
          bundle={payload.practiceNow}
          showEngineDebug={isDevToolsEnabledClient() || searchParams.get('evalTiming') === '1'}
        />

        <div className="mt-6">
          <ReportQuickCapturePrompt variant="onLight" initial="problem" />
        </div>

        {payload.learningMemoryRibbon && learningMemoryRibbonHasContent(payload.learningMemoryRibbon) ? (
          <div className="mt-8">
            <LearningMemoryRibbon ribbon={payload.learningMemoryRibbon} />
          </div>
        ) : null}

        {/* Progressive disclosure: one entry, all deep modules preserved below */}
        <details className="group motion-safe:transition-[box-shadow] motion-safe:duration-300 open:shadow-[0_12px_40px_-28px_rgba(15,23,42,0.12)]">
          <summary className="mt-8 flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-3.5 text-left marker:content-none [&::-webkit-details-marker]:hidden motion-safe:transition-[background-color,border-color] motion-safe:duration-200 hover:border-slate-300 hover:bg-slate-50 sm:px-5">
            <span className="text-[15px] font-semibold tracking-tight text-ink-primary">See full feedback</span>
            <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ease-out group-open:rotate-180" aria-hidden />
          </summary>
          <div className="space-y-10 border-t border-slate-100/90 pt-8 pb-1">
            <p className="text-[13px] leading-relaxed text-slate-500">
              <span className="font-medium text-slate-600">{modeLabel(report.mode)}</span>
              {langEv ? (
                <>
                  <span className="mx-2 text-slate-300 select-none" aria-hidden>·</span>
                  <span>
                    Language coaching {langEv.status === 'available' ? 'full' : 'partial'}
                  </span>
                </>
              ) : null}
              {showBuildTimingOnReport ? (
                <>
                  <span className="mx-2 text-slate-300 select-none" aria-hidden>·</span>
                  <button
                    type="button"
                    onClick={() => setTimingOpen(true)}
                    className="font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-ink-primary"
                  >
                    Build timing
                  </button>
                </>
              ) : null}
            </p>
        {report.taskOutcome && report.taskOutcome.goalEvidence.length > 0 ? (
          <section className="rounded-[28px] border border-teal-200/70 bg-gradient-to-br from-teal-50/80 via-white to-violet-50/50 px-4 py-4 shadow-[0_16px_40px_-28px_rgba(13,148,136,0.2)] ring-1 ring-teal-100/60 sm:px-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-800/90">Scenario outcome</p>
                <p className="mt-2 text-[14px] text-ink-secondary leading-relaxed">{outcomeSummary(weightedCompletion)}</p>
                {showScenarioOutcomeChecklistFootnote ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                    Every checklist goal is marked complete ({goalChecklistPercentUi}%). The percentage also reflects how
                    natural and on-brief your Dutch was across the session.
                  </p>
                ) : null}
              </div>
              {weightedCompletion != null ? (
                <div className="text-right rounded-2xl bg-white/90 px-3 py-2 ring-1 ring-teal-200/70 shadow-sm">
                  <p className="bg-gradient-to-r from-teal-700 to-violet-600 bg-clip-text text-[28px] font-semibold tabular-nums tracking-tight text-transparent">{weightedCompletion}%</p>
                  {goalChecklistPercentUi != null ? (
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-teal-700/80">Goals + delivery</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            {coreGoals.length > 0 ? (
              <div className="mt-4 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Core goals</p>
                <div className="space-y-3">
                  {coreGoals.map((goal, index) => <GoalRow key={`${goal.goalId}-${index}`} goal={goal} />)}
                </div>
              </div>
            ) : null}
            {stretchGoals.length > 0 ? (
              <div className="mt-4 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Stretch</p>
                <div className="space-y-3">
                  {stretchGoals.map((goal, index) => <GoalRow key={`${goal.goalId}-${index}`} goal={goal} />)}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {derivedFocus ? (
          <FocusAreaCard
            focus={derivedFocus}
            reportTitle={reportTitle}
            retryHref={retryHref}
            priorityTurnId={effectivePriorityTurnId}
            priorityLearnerLine={
              derivedFocus.learnerOriginalLine?.trim()
                || (priorityTurn
                  ? (priorityTurn.learnerTranscript || priorityTurn.transcriptOriginal || '').trim() || null
                  : null)
            }
            saving={saving}
            savedKeys={savedKeys}
            onSave={(input) => void handleSave(input)}
          />
        ) : null}

        {derivedFocus?.cta !== 'retry_scenario' ? (
          <a
            href={retryHref}
            className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-[14px] font-semibold text-white shadow-[0_24px_40px_-30px_rgba(15,23,42,0.85)] hover:bg-slate-800 active:scale-[0.99]"
          >
            <ArrowRight className="h-4 w-4" />
            {report.scenarioId === 'language_coach' ? 'Another Language Coach session' : 'Retry this scenario'}
          </a>
        ) : null}

        {phonePerformanceBlock && (phoneDims.length > 0 || phonePerformanceBlock.sentenceMoments.length > 0) ? (
          <PhoneCallPerformanceSection
            performance={phonePerformanceBlock}
            phoneDims={phoneDims}
            resolvedMedia={resolvedMedia}
            playReferenceSnippet={playReferenceSnippet}
            audio={audio}
          />
        ) : null}

        {smallTalkPerformanceBlock && smallTalkDims.length > 0 ? (
          <SmallTalkPerformanceSection performance={smallTalkPerformanceBlock} smallTalkDims={smallTalkDims} />
        ) : null}

        {meetingNewPeoplePerformanceBlock && meetingNewPeopleDims.length > 0 ? (
          <MeetingNewPeoplePerformanceSection
            performance={meetingNewPeoplePerformanceBlock}
            meetingNewPeopleDims={meetingNewPeopleDims}
          />
        ) : null}

        {partySocialPerformanceBlock && partySocialDims.length > 0 ? (
          <PartySocialPerformanceSection performance={partySocialPerformanceBlock} partySocialDims={partySocialDims} />
        ) : null}

        {explainingSomethingPerformanceBlock && explainingSomethingDims.length > 0 ? (
          <ExplainingSomethingPerformanceSection
            performance={explainingSomethingPerformanceBlock}
            explainingSomethingDims={explainingSomethingDims}
          />
        ) : null}

        {storytellingPerformanceBlock && storytellingDims.length > 0 ? (
          <StorytellingPerformanceSection performance={storytellingPerformanceBlock} storytellingDims={storytellingDims} />
        ) : null}

        {opinionsDiscussionsPerformanceBlock && opinionsDiscussionsDims.length > 0 ? (
          <OpinionsDiscussionsPerformanceSection
            performance={opinionsDiscussionsPerformanceBlock}
            opinionsDims={opinionsDiscussionsDims}
          />
        ) : null}

        <section className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {sessionHasAnyAudio ? (
              <section className="rounded-3xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.35)]">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-violet-600" />
                  <h2 className="text-[15px] font-semibold text-ink-primary">Voice</h2>
                </div>
                {voiceTakeaway ? (
                  <p className="mt-3 text-[13px] text-ink-primary leading-relaxed">{voiceTakeaway}</p>
                ) : null}
                {voiceDims.length > 0 ? (
                  <div className="mt-3 divide-y divide-slate-100">
                    {voiceDims.map(dim => <DimensionRow key={dim.id} dim={dim} />)}
                  </div>
                ) : (
                  <p className="mt-3 text-[12px] text-ink-secondary">More voice detail sits in sentence coaching.</p>
                )}
                {(pronunciationBreakdown.focusWords.length > 0 || pronunciationBreakdown.actionBullets.length > 0) ? (
                  <div className="mt-3 rounded-2xl bg-violet-50 px-3.5 py-3">
                    {pronunciationBreakdown.focusWords.length > 0 ? (
                      <p className="text-[12px] text-ink-primary leading-relaxed">
                        <span className="font-semibold text-violet-900">First fix:</span>{' '}
                        {pronunciationBreakdown.focusWords.slice(0, 3).map((w) => w.word).join(' · ')}
                      </p>
                    ) : null}
                    {pronunciationBreakdown.actionBullets.length > 0 ? (
                      <ul className="mt-2 space-y-1.5">
                        {pronunciationBreakdown.actionBullets.slice(0, 2).map((line, i) => (
                          <li key={`${line}-${i}`} className="flex gap-2 text-[12px] text-ink-secondary">
                            <span className="text-violet-500 mt-0.5">•</span>
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : (
              <section className="rounded-3xl border border-rose-200/90 bg-white px-5 py-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.35)]">
                <div className="flex items-center gap-2">
                  <MicOff className="h-4 w-4 text-rose-500" />
                  <h2 className="text-[15px] font-semibold text-ink-primary">Voice</h2>
                </div>
                <p className="mt-3 text-[13px] text-ink-secondary leading-relaxed">
                  No voice analysis was available for this run, so the report below is based on your wording and task completion.
                </p>
              </section>
            )}

            <section className="rounded-3xl border border-slate-200/90 bg-white px-5 py-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.35)]">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-violet-600" />
                <h2 className="text-[15px] font-semibold text-ink-primary">Language</h2>
              </div>
              {languageTakeaway ? (
                <p className="mt-3 text-[13px] text-ink-primary leading-relaxed">{languageTakeaway}</p>
              ) : null}
              {langEv?.status === 'available' && languageDims.length > 0 ? (
                <div className="mt-3 divide-y divide-slate-100">
                  {languageDims.map(dim => <DimensionRow key={dim.id} dim={dim} />)}
                </div>
              ) : (
                <p className="mt-3 text-[12px] text-ink-secondary">More language detail sits in sentence coaching.</p>
              )}
            </section>
          </div>

          <ProgressionSignalSection progression={progression} />

          {turns.length > 0 ? (
            <details className="sub-details group/sc rounded-[28px] border border-slate-200/90 bg-white shadow-[0_12px_28px_-22px_rgba(15,23,42,0.25)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-[16px] font-semibold tracking-tight text-ink-primary marker:content-none [&::-webkit-details-marker]:hidden sm:px-5">
                <span>Sentence coaching</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open/sc:rotate-180" aria-hidden />
              </summary>
              <div className="space-y-3 border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5">
                <p className="text-[12px] text-ink-secondary">
                  Each row shows your line and the main fix. Expand a row for playback, corrections, and save actions.
                </p>
                {turns.map(turn => {
                  const hasScenarioGap = turnMatchesMissingCoreGoal(turn, missingCoreGoalIds, missingCoreTurnIds)
                  const isPrioritySentence = effectivePriorityTurnId === turn.turnId
                  return (
                    <SentenceReviewCard
                      key={turn.turnId || `t-${turn.turnIndex}`}
                      turn={turn}
                      resolvedMedia={resolvedMedia[turn.turnId] ?? {}}
                      saving={saving}
                      savedKeys={savedKeys}
                      onSave={input => void handleSave(input)}
                      audio={audio}
                      scenarioTitle={reportTitle}
                      scenarioId={report.scenarioId}
                      onPlaySnippet={playReferenceSnippet}
                      expanded={openTurnId === turn.turnId}
                      onToggle={() => setOpenTurnId((current) => current === turn.turnId ? null : turn.turnId)}
                      hasScenarioGap={hasScenarioGap}
                      isPrioritySentence={isPrioritySentence}
                      collapsedMainFixDedupeAgainst={collapsedMainFixDedupePool}
                    />
                  )
                })}
              </div>
            </details>
          ) : null}
        </section>

        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 px-4 py-4 space-y-2.5 sm:px-5">
          <button
            type="button"
            disabled={regeneratingReport}
            onClick={() => void handleRegenerateReport()}
            className="flex w-full min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className={`h-3.5 w-3.5 shrink-0 ${regeneratingReport ? 'motion-safe:animate-spin' : ''}`} aria-hidden />
            {regeneratingReport ? 'Regenerating…' : 'Regenerate report'}
          </button>
          {showBuildTimingOnReport ? (
            <button
              type="button"
              onClick={() => setTimingOpen(true)}
              className="flex w-full min-h-touch items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white/80 px-4 py-2 text-[12px] font-medium text-slate-600 hover:bg-white"
            >
              <Timer className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
              Build timing breakdown
            </button>
          ) : null}
          <p className="text-center text-[11px] leading-snug text-slate-400 px-1">
            Re-runs the full coaching pipeline if something looks off.
          </p>
        </div>

        <div className="border-t border-slate-100/80 pt-6 text-center">
          <p className="text-[12px] text-slate-500">
            <button
              type="button"
              onClick={() => router.push(recapHref)}
              className="font-medium text-slate-600 underline decoration-slate-200 underline-offset-2 hover:text-ink-primary"
            >
              Session recap
            </button>
            <span className="mx-2 text-slate-300 select-none" aria-hidden>·</span>
            <button
              type="button"
              onClick={() => { audio.stop(); router.push(APP_TALK_HUB) }}
              className="font-medium text-slate-600 underline decoration-slate-200 underline-offset-2 hover:text-ink-primary"
            >
              Talk hub
            </button>
          </p>
        </div>

          </div>
        </details>
        </div>
        </div>
      </main>

      {showBuildTimingOnReport ? (
        <EvaluationTimingBreakdown
          open={timingOpen}
          onClose={() => setTimingOpen(false)}
          generationDiagnostics={report.generationDiagnostics}
          evaluationDiagnostics={payload.evaluationDiagnostics}
          buildStatus="complete"
        />
      ) : null}
      {showScenarioReportDevPanel ? (
        <div className="mx-auto max-w-3xl px-4 pb-8 sm:px-5">
          <ScenarioReportGenerationDevPanel payload={payload} report={report} />
        </div>
      ) : null}
    </div>
  )
}
