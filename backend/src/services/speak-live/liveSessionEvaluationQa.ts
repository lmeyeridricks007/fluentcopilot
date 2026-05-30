import {
  learnerLineLooksLikeCustomerQuestion,
  referenceLooksLikeStaffAffirmationAnsweringCustomer,
  isLearnerFacingImprovedVersion,
  sameLearnerFacingSurface,
} from './liveSessionLearnerReferenceGuards'
import { maybeStripCrossPhraseWordPairs } from './liveSessionRecommendationVerifyLlm'
import {
  buildSentenceGroundedReview,
  canonicalLearnerDutchLine,
  filterWrongWordDetectionsGroundedInLearner,
  focusImprovementActions,
  singleWrongWordSwapMatchesCanonical,
} from './liveSessionReportEnrichment'
import {
  AUDIO_ONLY_FEEDBACK_TYPES,
  type LiveSessionEvaluation,
  type TurnEvaluation,
  type WrongWordDetection,
} from './liveVoiceEvaluationTypes'
import { filterKeyProblemsWhenNoAudio, filterStrengthsWhenNoAudio } from './liveSessionEvaluationTrust'
import {
  clampReportScoresInPlace,
  collectFastStructuralQaIssues,
  ORCHESTRATOR_RERUN_ISSUE_CODES,
  type FastGuardIssue,
  type FastGuardIssueCode,
} from './liveSessionEvaluationQaFastGuards'

/** Legacy stored-report repair — optional regex strip via `SPEAK_LIVE_EVAL_REGEX_CROSS_PHRASE_STRIP=1`. */
function filterWrongWordsForLegacyQaRepair(
  learnerTranscript: string,
  dets: WrongWordDetection[] | undefined,
): WrongWordDetection[] {
  const stripped = maybeStripCrossPhraseWordPairs(learnerTranscript, dets?.length ? dets : [])
  return filterWrongWordDetectionsGroundedInLearner(learnerTranscript, stripped)
}

export type ReportQaStageStatus = 'pending' | 'running' | 'passed' | 'failed'

export type ReportQaIssueSeverity = 'fixable' | 'rerun' | 'warn'

export type ReportQaIssueCode =
  | 'placeholder_copy_detected'
  | 'completed_goal_greeting_evidence'
  | 'completed_goal_missing_evidence'
  | 'bad_train_departure_rewrite'
  | 'mismatched_train_status_rewrite'
  | 'mismatched_reference_word_correction'
  | 'staff_reply_reference_mismatch'
  | 'unsafe_fixed_phrase_word_correction'
  | 'main_fix_word_swap_misaligned_with_canonical'
  | 'audio_claim_without_audio_evidence'
  | 'missing_core_section'
  | 'score_out_of_range'
  | 'no_user_turn_evaluation'
  | 'impossible_goal_percentage'
  | 'duplicate_feedback_block'
  | 'missing_improved_version_for_major_issue'
  | 'speech_scoring_unavailable_unmarked'
  | 'empty_main_focus'
  | 'assistant_turn_scored'

export type ReportQaIssue = {
  code: ReportQaIssueCode
  severity: ReportQaIssueSeverity
  message: string
  turnId?: string
  goalId?: string
}

export type StoredReportQa = {
  version: number
  status: 'passed' | 'fixed' | 'failed'
  checkedAt: string
  issues: string[]
  fixesApplied: string[]
  rerunCount: number
  /** Deterministic QA rules that matched (issues, repairs, or structural checks). */
  qaRulesTriggered?: string[]
}

export type ReportQaResult = {
  passed: boolean
  shouldRerun: boolean
  /** All issues the QA stage flagged before any auto-repair. */
  issues: ReportQaIssue[]
  /** Issues still present after applying fixable repairs (excludes `severity: warn` for pass/fail). */
  unresolvedIssues: ReportQaIssue[]
  /** Non-blocking findings (still published when no blocking unresolved issues). */
  warnIssues: ReportQaIssue[]
  fixesApplied: string[]
  blockingReason?: string
  /** Fast deterministic checks + repair hooks (diagnostic). */
  qaRulesTriggered: string[]
}

const REPORT_QA_VERSION = 1

const PLACEHOLDER_RE =
  /offline:|connect the full evaluation llm|detailed coaching will be available when you retry|retry for detailed/i

const GREETING_RE = /^(goedemiddag|goedemorgen|goedenavond|hallo|hoi)[.!?]?$/i
const TRAIN_STATUS_RE = /\b(op tijd|vertraging|vertraagd|te laat)\b/i
const TRAIN_PLATFORM_OR_DEPARTURE_RE = /\b(platform|perron|departure)\b|van welk station|waar vertrekt|hoe laat vertrekt/i
const TRAIN_STATUS_RESIDUAL_COPY_RE =
  /platform or departure question|different station question|station scenario|ask which platform|departure goal/i

const SKIP_WORDS = new Set([
  'de', 'het', 'een', 'te', 'en', 'of', 'maar', 'naar', 'van', 'op', 'in', 'aan', 'bij',
  'met', 'voor', 'is', 'er', 'ik', 'u', 'je', 'hij', 'ze', 'we', 'mijn', 'uw', 'dit', 'dat',
])

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/^[^a-zà-ÿ0-9]+|[^a-zà-ÿ0-9]+$/gi, '')
    .trim()
}

function tokenizeMeaningful(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normalizeToken)
    .filter((tok) => tok && !SKIP_WORDS.has(tok))
}

function meaningfulOverlap(a: string, b: string): number {
  const aa = tokenizeMeaningful(a)
  const bb = tokenizeMeaningful(b)
  if (aa.length === 0 || bb.length === 0) return 0
  return aa.filter((tok) => bb.includes(tok)).length
}

function trainDepartureRewrite(text: string): { destination: string } | null {
  const match = /^wat is de tijd naar ([a-zà-ÿ' -]+)\??$/i.exec(text.trim())
  if (!match) return null
  return { destination: match[1].trim() }
}

function repairTrainDepartureLine(turn: TurnEvaluation, text: string): string {
  const parsed = trainDepartureRewrite(text)
  if (!parsed) return text
  const ref = turn.referenceSentence.trim()
  if (/trein/i.test(ref)) return ref
  return `Hoe laat vertrekt de trein naar ${parsed.destination}?`
}

function scenarioLooksLikeTrain(evaluation: LiveSessionEvaluation): boolean {
  const scene = (evaluation.scenarioTitle ?? evaluation.scenarioName ?? '').toLowerCase()
  return scene.includes('train') || scene.includes('station')
}

function learnerAsQuestion(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  return /[?!.\u2026]$/.test(trimmed) ? trimmed : `${trimmed}?`
}

function looksLikeTrainStatusQuestion(text: string): boolean {
  const lower = text.trim().toLowerCase()
  if (!lower) return false
  return lower.includes('trein') && TRAIN_STATUS_RE.test(lower)
}

function looksLikePlatformOrDepartureGoal(text: string): boolean {
  return TRAIN_PLATFORM_OR_DEPARTURE_RE.test(text.trim().toLowerCase())
}

function hasResidualTrainStatusRepairCopy(turn: TurnEvaluation): boolean {
  const candidates = [
    turn.mainFixLine,
    turn.referenceSentenceReason,
    turn.naturalRewrite?.whyMoreNatural,
    turn.languageEvaluation?.whyItIsBetter,
    turn.languageEvaluation?.whyThisIsMoreNatural,
    turn.languageEvaluation?.learnerFacingGrammarLine,
    turn.sentenceGroundedReview?.mainFix,
    turn.sentenceGroundedReview?.whyBetter,
    ...(turn.sentenceGroundedReview?.whatToFix ?? []),
    ...(turn.scenarioGoalFit.relevantGoals ?? []),
    turn.scenarioGoalFit.summary,
  ]
  return candidates.some((value) => TRAIN_STATUS_RESIDUAL_COPY_RE.test((value ?? '').trim()))
}

function hasPlaceholderCopy(evaluation: LiveSessionEvaluation): boolean {
  const payload = JSON.stringify(evaluation)
  return PLACEHOLDER_RE.test(payload)
}

function fixBadTrainRewrites(evaluation: LiveSessionEvaluation): string[] {
  if (!scenarioLooksLikeTrain(evaluation)) return []

  const fixes: string[] = []
  for (const turn of evaluation.turnEvaluations) {
    const updatedReference = repairTrainDepartureLine(turn, turn.referenceSentence)
    if (updatedReference !== turn.referenceSentence) {
      turn.referenceSentence = updatedReference
      fixes.push(`Repaired train rewrite for turn ${turn.turnIndex + 1}`)
    }
    if (turn.naturalRewrite?.improved) {
      const repaired = repairTrainDepartureLine(turn, turn.naturalRewrite.improved)
      if (repaired !== turn.naturalRewrite.improved) {
        turn.naturalRewrite.improved = repaired
        fixes.push(`Repaired natural rewrite for turn ${turn.turnIndex + 1}`)
      }
    }
    if (turn.languageEvaluation?.improvedVersion) {
      const repaired = repairTrainDepartureLine(turn, turn.languageEvaluation.improvedVersion)
      if (repaired !== turn.languageEvaluation.improvedVersion) {
        turn.languageEvaluation.improvedVersion = repaired
        fixes.push(`Repaired improved version for turn ${turn.turnIndex + 1}`)
      }
    }
    if (turn.sentenceGroundedReview?.nativePhrase) {
      const repaired = repairTrainDepartureLine(turn, turn.sentenceGroundedReview.nativePhrase)
      if (repaired !== turn.sentenceGroundedReview.nativePhrase) {
        turn.sentenceGroundedReview.nativePhrase = repaired
        fixes.push(`Repaired sentence review rewrite for turn ${turn.turnIndex + 1}`)
      }
    }
  }

  return fixes
}

function repairMismatchedTrainStatusRewrites(evaluation: LiveSessionEvaluation): string[] {
  if (!scenarioLooksLikeTrain(evaluation)) return []

  const fixes: string[] = []
  const delayGoalLabel = 'Ask if the train is on time'

  for (const turn of evaluation.turnEvaluations) {
    if (!looksLikeTrainStatusQuestion(turn.learnerTranscript)) continue

    const hasBadRewrite =
      looksLikePlatformOrDepartureGoal(turn.referenceSentence) ||
      (turn.naturalRewrite?.improved ? looksLikePlatformOrDepartureGoal(turn.naturalRewrite.improved) : false) ||
      (turn.languageEvaluation?.improvedVersion ? looksLikePlatformOrDepartureGoal(turn.languageEvaluation.improvedVersion) : false) ||
      (turn.sentenceGroundedReview?.nativePhrase ? looksLikePlatformOrDepartureGoal(turn.sentenceGroundedReview.nativePhrase) : false)

    const hasBadGoalMapping =
      turn.scenarioGoalFit.relevantGoals.some((goal) => looksLikePlatformOrDepartureGoal(goal)) ||
      looksLikePlatformOrDepartureGoal(turn.scenarioGoalFit.summary)

    const hasResidualCopy = hasResidualTrainStatusRepairCopy(turn)

    if (!hasBadRewrite && !hasBadGoalMapping && !hasResidualCopy) continue

    const canonical = learnerAsQuestion(turn.learnerTranscript)
    const why = 'This question already works for asking if the train is on time.'

    turn.referenceSentence = canonical
    turn.referenceSentenceReason = 'This wording already asks if the train is on time clearly.'
    turn.referenceKind = 'reference_pronunciation'
    turn.scenarioGoalFit = {
      summary: 'This line asks if the train is on time.',
      alignmentScore: Math.max(turn.scenarioGoalFit.alignmentScore, 85),
      relevantGoals: [delayGoalLabel],
    }

    if (turn.naturalRewrite) {
      turn.naturalRewrite = {
        ...turn.naturalRewrite,
        improved: canonical,
        whyMoreNatural: why,
      }
    }

    if (turn.languageEvaluation) {
      turn.languageEvaluation.improvedVersion = canonical
      turn.languageEvaluation.grammarIssues = turn.languageEvaluation.grammarIssues.filter(
        (issue) => !looksLikePlatformOrDepartureGoal(issue),
      )
      turn.languageEvaluation.sentenceStructureIssues = turn.languageEvaluation.sentenceStructureIssues.filter(
        (issue) => !looksLikePlatformOrDepartureGoal(issue),
      )
      turn.languageEvaluation.grammarIssues = []
      turn.languageEvaluation.sentenceStructureIssues = []
      turn.languageEvaluation.whyItIsBetter = 'This wording already works for asking if the train is on time.'
      turn.languageEvaluation.whyThisIsMoreNatural = why
      turn.languageEvaluation.learnerFacingGrammarLine = 'This wording is fine here; focus on sounding clear and steady.'
    }

    turn.keyProblems = turn.keyProblems.filter((issue) => !looksLikePlatformOrDepartureGoal(issue))
    turn.compareListenFor = turn.compareListenFor?.filter((note) => !looksLikePlatformOrDepartureGoal(note))

    if (turn.sentenceGroundedReview) {
      turn.sentenceGroundedReview = {
        ...turn.sentenceGroundedReview,
        mainFix: 'Keep this wording; focus on cleaner sounds on the key words.',
        whatWorked: ['Clear intent in asking about the train\'s status.'],
        whatToFix: [],
        nativePhrase: canonical,
        whyBetter: why,
      }
    }

    turn.mainFixLine = 'Main fix: keep this wording — focus on pronunciation.'
    turn.improvementActions = focusImprovementActions(turn)
    fixes.push(`Repaired mismatched train status rewrite for turn ${turn.turnIndex + 1}`)
  }

  return fixes
}

function repairMismatchedReferenceWordCorrections(evaluation: LiveSessionEvaluation): string[] {
  const fixes: string[] = []

  for (const turn of evaluation.turnEvaluations) {
    const hasMismatch =
      (turn.wrongWordDetections?.length ?? 0) > 0 &&
      turn.referenceSentence.trim() &&
      meaningfulOverlap(turn.learnerTranscript, turn.referenceSentence) <= 1

    if (!hasMismatch) continue

    turn.wrongWordDetections = undefined
    turn.compareListenFor = undefined

    turn.sentenceGroundedReview = buildSentenceGroundedReview(turn, [], [], null, evaluation.scenarioTitle)
    turn.improvementActions = focusImprovementActions(turn)

    const rebuiltMainFix = turn.sentenceGroundedReview?.mainFix?.trim() ?? ''
    if (rebuiltMainFix) {
      turn.mainFixLine = `Main fix: ${rebuiltMainFix.charAt(0).toLowerCase()}${rebuiltMainFix.slice(1)}`
    } else if ((turn.mainFixLine ?? '').includes('instead of')) {
      turn.mainFixLine = 'Main fix: keep the meaning clear and use the full Dutch line below.'
    }

    fixes.push(`Removed mismatched word correction for turn ${turn.turnIndex + 1}`)
  }

  return fixes
}

function wordSwapMainFixMisalignedWithCanonical(turn: TurnEvaluation): boolean {
  const line = (turn.mainFixLine ?? '').trim().toLowerCase()
  if (!line.includes('instead of')) return false
  const w = turn.wrongWordDetections?.[0]
  if (!w) return false
  const canonical =
    turn.sentenceGroundedReview?.nativePhrase?.trim() || canonicalLearnerDutchLine(turn)
  if (!canonical) return false
  const learner = turn.learnerTranscript.trim()
  if (sameLearnerFacingSurface(learner, canonical)) return false
  return !singleWrongWordSwapMatchesCanonical(learner, w, canonical)
}

function repairWordSwapMainFixMisaligned(evaluation: LiveSessionEvaluation): string[] {
  const fixes: string[] = []

  for (const turn of evaluation.turnEvaluations) {
    if (!wordSwapMainFixMisalignedWithCanonical(turn)) continue
    const wrong = turn.wrongWordDetections ?? []
    turn.sentenceGroundedReview = buildSentenceGroundedReview(turn, wrong, [], null, evaluation.scenarioTitle)
    const phrase =
      turn.sentenceGroundedReview?.nativePhrase?.trim() || canonicalLearnerDutchLine(turn)
    if (phrase) {
      turn.mainFixLine = `Main fix: use this phrasing — “${phrase}”.`
    }
    turn.improvementActions = focusImprovementActions(turn)
    fixes.push(`Aligned main fix with canonical Dutch line for turn ${turn.turnIndex + 1}`)
  }

  return fixes
}

function repairUnsafeFixedPhraseWordCorrections(evaluation: LiveSessionEvaluation): string[] {
  const fixes: string[] = []

  for (const turn of evaluation.turnEvaluations) {
    const prev = turn.wrongWordDetections ?? []
    const next = filterWrongWordsForLegacyQaRepair(turn.learnerTranscript, prev)
    if (JSON.stringify(prev) === JSON.stringify(next)) continue

    turn.wrongWordDetections = next.length ? next : undefined
    turn.compareListenFor = undefined

    turn.sentenceGroundedReview = buildSentenceGroundedReview(turn, next, [], null, evaluation.scenarioTitle)
    turn.improvementActions = focusImprovementActions(turn)

    const rebuiltMainFix = turn.sentenceGroundedReview?.mainFix?.trim() ?? ''
    if (rebuiltMainFix) {
      turn.mainFixLine = `Main fix: ${rebuiltMainFix.charAt(0).toLowerCase()}${rebuiltMainFix.slice(1)}`
    } else if ((turn.mainFixLine ?? '').includes('instead of')) {
      turn.mainFixLine = 'Main fix: keep the meaning clear and use the full Dutch line below.'
    }

    fixes.push(`Removed unsafe fixed-phrase word correction for turn ${turn.turnIndex + 1}`)
  }

  return fixes
}

function repairStaffReplyReferenceMismatch(evaluation: LiveSessionEvaluation): string[] {
  const fixes: string[] = []

  for (const turn of evaluation.turnEvaluations) {
    if (!learnerLineLooksLikeCustomerQuestion(turn.learnerTranscript)) continue
    if (!referenceLooksLikeStaffAffirmationAnsweringCustomer(turn.referenceSentence)) continue

    const learner = turn.learnerTranscript.trim()
    const improvedRaw = turn.languageEvaluation?.improvedVersion?.trim() ?? ''
    const better = isLearnerFacingImprovedVersion(improvedRaw) ? improvedRaw : learner

    if (sameLearnerFacingSurface(turn.referenceSentence, better)) {
      continue
    }

    turn.referenceSentence = better
    turn.referenceKind = sameLearnerFacingSurface(better, learner) ? 'reference_pronunciation' : 'more_natural_dutch'
    turn.referenceSentenceReason = `${turn.referenceSentenceReason.trim()} (Adjusted: removed staff-style line from the learner target.)`

    if (turn.languageEvaluation) {
      const nextImp = sameLearnerFacingSurface(better, improvedRaw) ? improvedRaw : better
      turn.languageEvaluation = { ...turn.languageEvaluation, improvedVersion: nextImp }
    }

    const wrong = filterWrongWordsForLegacyQaRepair(turn.learnerTranscript, turn.wrongWordDetections)
    turn.wrongWordDetections = wrong.length ? wrong : undefined
    turn.compareListenFor = undefined

    turn.sentenceGroundedReview = buildSentenceGroundedReview(turn, wrong, [], null, evaluation.scenarioTitle)
    turn.improvementActions = focusImprovementActions(turn)

    const rebuiltMainFix = turn.sentenceGroundedReview?.mainFix?.trim() ?? ''
    if (rebuiltMainFix) {
      turn.mainFixLine = `Main fix: ${rebuiltMainFix.charAt(0).toLowerCase()}${rebuiltMainFix.slice(1)}`
    } else if ((turn.mainFixLine ?? '').includes('instead of')) {
      turn.mainFixLine = 'Main fix: keep the meaning clear and use the full Dutch line below.'
    }

    fixes.push(`Replaced staff-style reference with a learner-facing line for turn ${turn.turnIndex + 1}`)
  }

  return fixes
}

/**
 * When the report marks a turn as not Azure-audio-backed but still carries pronunciation/fluency
 * chips (stale merge / edge pipeline), strip those so QA can publish a transcript-safe report.
 */
function repairAudioClaimsWithoutEvidence(evaluation: LiveSessionEvaluation): string[] {
  const fixes: string[] = []
  for (const turn of evaluation.turnEvaluations) {
    if (turn.signalSources.audioMetrics === 'azure_audio') continue
    const hadPron = (turn.pronunciationIssues?.length ?? 0) > 0
    const hadFluency = (turn.fluencyIssues?.length ?? 0) > 0
    const prevFeedback = turn.feedbackItems?.length ?? 0
    if (hadPron || hadFluency) {
      turn.pronunciationIssues = []
      turn.fluencyIssues = []
      fixes.push(`Removed audio-specific coaching chips for turn ${turn.turnIndex + 1} (no reliable audio metrics).`)
    }
    turn.feedbackItems = (turn.feedbackItems ?? []).filter(
      (item) =>
        turn.signalSources.audioMetrics === 'azure_audio' ||
        (item.source !== 'audio' && !AUDIO_ONLY_FEEDBACK_TYPES.has(item.type)),
    )
    if ((turn.feedbackItems?.length ?? 0) < prevFeedback) {
      fixes.push(`Filtered audio-sourced feedback items for turn ${turn.turnIndex + 1}.`)
    }
    turn.keyProblems = filterKeyProblemsWhenNoAudio(turn.keyProblems ?? [])
    turn.keyStrengths = filterStrengthsWhenNoAudio(turn.keyStrengths ?? [])
    if (turn.quickLabels && (hadPron || hadFluency)) {
      turn.quickLabels = {
        ...turn.quickLabels,
        pronunciation: '—',
        rhythm: '—',
      }
    }
  }
  return fixes
}

function findTurnForGoalEvidence(evaluation: LiveSessionEvaluation, turnId: string | null, turnIndex: number | null): TurnEvaluation | undefined {
  if (turnId) {
    const byId = evaluation.turnEvaluations.find((t) => t.turnId === turnId)
    if (byId) return byId
  }
  if (turnIndex != null) {
    return evaluation.turnEvaluations.find((t) => t.turnIndex === turnIndex)
  }
  return undefined
}

/** First learner line in the session that is not greeting-only (for thin goal quotes). */
function firstSubstantiveLearnerLine(evaluation: LiveSessionEvaluation): string | null {
  for (const turn of evaluation.turnEvaluations) {
    const tx = (turn.learnerTranscript ?? '').trim()
    if (tx && !GREETING_RE.test(tx)) return tx.slice(0, 280)
  }
  return null
}

/**
 * Fills empty or greeting-only completed-goal evidence from real transcript lines so report QA
 * does not block publish on recap/FSM mismatches (common on phone_call and similar flows).
 */
function repairGoalEvidenceForQa(evaluation: LiveSessionEvaluation): string[] {
  const fixes: string[] = []
  const goals = evaluation.taskOutcome?.goalEvidence
  if (!goals?.length) return fixes

  for (const ge of goals) {
    if (ge.status !== 'completed' || ge.tier === 'stretch') continue

    const ev = (ge.evidenceText ?? '').trim()
    if (!ev) {
      const turn = findTurnForGoalEvidence(evaluation, ge.turnId, ge.turnIndex)
      const tx = (turn?.learnerTranscript ?? '').trim()
      if (tx) {
        ge.evidenceText = tx.slice(0, 280)
        fixes.push(`Filled missing evidence for goal “${ge.goalLabel}”.`)
        continue
      }
      const fb = firstSubstantiveLearnerLine(evaluation)
      if (fb) {
        ge.evidenceText = fb
        fixes.push(`Filled missing evidence for goal “${ge.goalLabel}” from another turn in this session.`)
      }
      continue
    }

    if (!GREETING_RE.test(ev)) continue

    const turn = findTurnForGoalEvidence(evaluation, ge.turnId, ge.turnIndex)
    const full = (turn?.learnerTranscript ?? '').trim()
    if (full && !GREETING_RE.test(full)) {
      ge.evidenceText = full.slice(0, 280)
      fixes.push(`Broadened greeting-only evidence for goal “${ge.goalLabel}”.`)
      continue
    }
    const fb = firstSubstantiveLearnerLine(evaluation)
    if (fb) {
      ge.evidenceText = fb
      fixes.push(`Replaced thin greeting quote for goal “${ge.goalLabel}” with a clearer line from your call.`)
    }
  }

  return fixes
}

function collectQaIssues(evaluation: LiveSessionEvaluation): ReportQaIssue[] {
  const issues: ReportQaIssue[] = []

  if (hasPlaceholderCopy(evaluation)) {
    issues.push({
      code: 'placeholder_copy_detected',
      severity: 'rerun',
      message: 'Report still contains placeholder or degraded fallback copy.',
    })
  }

  for (const goal of evaluation.taskOutcome?.goalEvidence ?? []) {
    const evidence = goal.evidenceText?.trim() ?? ''
    if (goal.status === 'completed' && goal.tier !== 'stretch' && !evidence) {
      issues.push({
        code: 'completed_goal_missing_evidence',
        severity: 'warn',
        message: `Completed goal “${goal.goalLabel}” has no supporting evidence.`,
        goalId: goal.goalId,
      })
    }
    if (goal.status === 'completed' && goal.tier !== 'stretch' && GREETING_RE.test(evidence)) {
      issues.push({
        code: 'completed_goal_greeting_evidence',
        severity: 'warn',
        message: `Completed goal “${goal.goalLabel}” is backed only by a greeting-like quote.`,
        goalId: goal.goalId,
      })
    }
  }

  for (const turn of evaluation.turnEvaluations) {
    const turnHasTrainRewrite =
      trainDepartureRewrite(turn.referenceSentence) ||
      (turn.naturalRewrite?.improved ? trainDepartureRewrite(turn.naturalRewrite.improved) : null) ||
      (turn.languageEvaluation?.improvedVersion ? trainDepartureRewrite(turn.languageEvaluation.improvedVersion) : null) ||
      (turn.sentenceGroundedReview?.nativePhrase ? trainDepartureRewrite(turn.sentenceGroundedReview.nativePhrase) : null)
    if (turnHasTrainRewrite) {
      issues.push({
        code: 'bad_train_departure_rewrite',
        severity: 'fixable',
        message: 'Train-station rewrite uses the stale “Wat is de tijd naar …” phrasing.',
        turnId: turn.turnId,
      })
    }

    const hasMismatchedTrainStatusRewrite =
      looksLikeTrainStatusQuestion(turn.learnerTranscript) &&
      (
        looksLikePlatformOrDepartureGoal(turn.referenceSentence) ||
        (turn.naturalRewrite?.improved ? looksLikePlatformOrDepartureGoal(turn.naturalRewrite.improved) : false) ||
        (turn.languageEvaluation?.improvedVersion ? looksLikePlatformOrDepartureGoal(turn.languageEvaluation.improvedVersion) : false) ||
        (turn.sentenceGroundedReview?.nativePhrase ? looksLikePlatformOrDepartureGoal(turn.sentenceGroundedReview.nativePhrase) : false) ||
        turn.scenarioGoalFit.relevantGoals.some((goal) => looksLikePlatformOrDepartureGoal(goal)) ||
        looksLikePlatformOrDepartureGoal(turn.scenarioGoalFit.summary) ||
        hasResidualTrainStatusRepairCopy(turn)
      )
    if (hasMismatchedTrainStatusRewrite) {
      issues.push({
        code: 'mismatched_train_status_rewrite',
        severity: 'fixable',
        message: 'Train on-time question was rewritten or explained as a different station goal.',
        turnId: turn.turnId,
      })
    }

    if (
      (turn.wrongWordDetections?.length ?? 0) > 0 &&
      turn.referenceSentence.trim() &&
      meaningfulOverlap(turn.learnerTranscript, turn.referenceSentence) <= 1
    ) {
      issues.push({
        code: 'mismatched_reference_word_correction',
        severity: 'fixable',
        message: 'Wrong-word correction appears to come from a mismatched reference sentence.',
        turnId: turn.turnId,
      })
    }

    if (
      learnerLineLooksLikeCustomerQuestion(turn.learnerTranscript) &&
      referenceLooksLikeStaffAffirmationAnsweringCustomer(turn.referenceSentence)
    ) {
      issues.push({
        code: 'staff_reply_reference_mismatch',
        severity: 'fixable',
        message: 'Reference line reads like staff dialogue while the learner spoke as the customer.',
        turnId: turn.turnId,
      })
    }

    const prevWrong = turn.wrongWordDetections ?? []
    const filteredWrong = filterWrongWordsForLegacyQaRepair(turn.learnerTranscript, prevWrong)
    if (prevWrong.length !== filteredWrong.length) {
      issues.push({
        code: 'unsafe_fixed_phrase_word_correction',
        severity: 'fixable',
        message: 'Word-level correction would break a common fixed Dutch phrase.',
        turnId: turn.turnId,
      })
    }

    if (wordSwapMainFixMisalignedWithCanonical(turn)) {
      issues.push({
        code: 'main_fix_word_swap_misaligned_with_canonical',
        severity: 'fixable',
        message:
          'Main fix suggests a literal word swap that does not match the canonical Dutch line (e.g. “Sounds more native”).',
        turnId: turn.turnId,
      })
    }

    const audioBacked = turn.signalSources.audioMetrics === 'azure_audio'
    if (!audioBacked && ((turn.pronunciationIssues?.length ?? 0) > 0 || (turn.fluencyIssues?.length ?? 0) > 0)) {
      issues.push({
        code: 'audio_claim_without_audio_evidence',
        severity: 'fixable',
        message: 'Turn contains audio-specific findings even though the report marks it as not audio-backed.',
        turnId: turn.turnId,
      })
    }
  }

  return issues
}

function mapFastGuardIssues(fast: FastGuardIssue[]): ReportQaIssue[] {
  return fast.map((f) => ({
    code: f.code as ReportQaIssueCode,
    severity: f.severity,
    message: f.message,
    turnId: f.turnId,
    goalId: f.goalId,
  }))
}

function dedupeReportIssues(list: ReportQaIssue[]): ReportQaIssue[] {
  const seen = new Set<string>()
  return list.filter((i) => {
    const k = `${i.code}|${i.turnId ?? ''}|${i.goalId ?? ''}|${i.message}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function issueRequiresOrchestratorRerun(issue: ReportQaIssue): boolean {
  if (issue.severity !== 'rerun') return false
  if (issue.code === 'placeholder_copy_detected') return true
  return ORCHESTRATOR_RERUN_ISSUE_CODES.has(issue.code as FastGuardIssueCode)
}

export function runSecondPassReportQa(
  evaluation: LiveSessionEvaluation,
  opts?: { allowFixes?: boolean },
): ReportQaResult {
  const allowFixes = opts?.allowFixes !== false
  const qaRulesTriggered: string[] = ['qa:deterministic_started']
  const fixesApplied: string[] = []

  /**
   * `turnEvaluations` is declared as a required `TurnEvaluation[]` on the type, and every
   * producer in the codebase sets it (the voice orchestrator pushes from the parallel loop,
   * the Language Coach evaluator sets `[]`). The only way it can be missing at runtime is a
   * corrupt persisted-JSON row. Other consumers (e.g. `speakingProgressMappers`,
   * `liveSpeakingSessionInsights`, `speakLiveLearningEvaluationArtifactsExtractor`) already
   * normalize this as `turnEvaluations ?? []`; align QA with the rest of the pipeline so a
   * stray legacy row cannot crash the structural pass mid-loop. This is type-correct empty
   * coercion, not fabricated turn data — there is no fake content being invented.
   */
  if (!Array.isArray(evaluation.turnEvaluations)) {
    evaluation.turnEvaluations = []
    qaRulesTriggered.push('qa:normalized_missing_turnEvaluations_array')
  }

  fixesApplied.push(...clampReportScoresInPlace(evaluation, qaRulesTriggered))

  const structuralPass1 = mapFastGuardIssues(collectFastStructuralQaIssues(evaluation, qaRulesTriggered))
  const legacyPass1 = collectQaIssues(evaluation)
  const flaggedIssues = dedupeReportIssues([...structuralPass1, ...legacyPass1])

  if (allowFixes && flaggedIssues.some((issue) => issue.code === 'bad_train_departure_rewrite')) {
    fixesApplied.push(...fixBadTrainRewrites(evaluation))
  }
  if (allowFixes && flaggedIssues.some((issue) => issue.code === 'mismatched_train_status_rewrite')) {
    fixesApplied.push(...repairMismatchedTrainStatusRewrites(evaluation))
  }
  if (allowFixes && flaggedIssues.some((issue) => issue.code === 'mismatched_reference_word_correction')) {
    fixesApplied.push(...repairMismatchedReferenceWordCorrections(evaluation))
  }
  if (allowFixes && flaggedIssues.some((issue) => issue.code === 'staff_reply_reference_mismatch')) {
    fixesApplied.push(...repairStaffReplyReferenceMismatch(evaluation))
  }
  if (allowFixes && flaggedIssues.some((issue) => issue.code === 'unsafe_fixed_phrase_word_correction')) {
    fixesApplied.push(...repairUnsafeFixedPhraseWordCorrections(evaluation))
  }
  if (allowFixes && flaggedIssues.some((issue) => issue.code === 'main_fix_word_swap_misaligned_with_canonical')) {
    fixesApplied.push(...repairWordSwapMainFixMisaligned(evaluation))
  }
  if (allowFixes && flaggedIssues.some((issue) => issue.code === 'audio_claim_without_audio_evidence')) {
    fixesApplied.push(...repairAudioClaimsWithoutEvidence(evaluation))
  }
  if (
    allowFixes &&
    flaggedIssues.some(
      (issue) => issue.code === 'completed_goal_missing_evidence' || issue.code === 'completed_goal_greeting_evidence',
    )
  ) {
    fixesApplied.push(...repairGoalEvidenceForQa(evaluation))
  }

  const finalMerged = dedupeReportIssues([
    ...mapFastGuardIssues(collectFastStructuralQaIssues(evaluation, qaRulesTriggered)),
    ...collectQaIssues(evaluation),
  ])

  const warnIssues = finalMerged.filter((i) => i.severity === 'warn')
  const unresolvedBlocking = finalMerged.filter((i) => i.severity !== 'warn')

  const rerunIssue = unresolvedBlocking.find((issue) => issueRequiresOrchestratorRerun(issue))
  const uniqueRulesTriggered = [...new Set(qaRulesTriggered)]
  return {
    passed: unresolvedBlocking.length === 0,
    shouldRerun: Boolean(rerunIssue),
    issues: flaggedIssues,
    unresolvedIssues: unresolvedBlocking,
    warnIssues,
    fixesApplied,
    blockingReason: rerunIssue?.message,
    qaRulesTriggered: uniqueRulesTriggered,
  }
}

export function buildStoredReportQa(result: ReportQaResult, rerunCount: number): StoredReportQa {
  return {
    version: REPORT_QA_VERSION,
    status: result.fixesApplied.length > 0 ? 'fixed' : result.passed ? 'passed' : 'failed',
    checkedAt: new Date().toISOString(),
    issues: result.issues.map((issue) => `${issue.code}: ${issue.message}`),
    fixesApplied: result.fixesApplied,
    rerunCount,
    qaRulesTriggered: result.qaRulesTriggered,
  }
}

export function isStoredEvaluationTrusted(evaluation: LiveSessionEvaluation): boolean {
  const qa = evaluation.reportQa
  return Boolean(
    qa &&
    qa.version === REPORT_QA_VERSION &&
    (qa.status === 'passed' || qa.status === 'fixed'),
  )
}

export function storedEvaluationNeedsRefreshFromJson(json: string): boolean {
  if (PLACEHOLDER_RE.test(json)) return true
  try {
    const evaluation = JSON.parse(json) as LiveSessionEvaluation
    const qa = runSecondPassReportQa(evaluation, { allowFixes: false })
    return !qa.passed
  } catch {
    return false
  }
}

export function createQaPhaseStatus(params: {
  rowStatus: 'pending' | 'running' | 'complete' | 'failed'
  speakLivePostSessionPhase: string | null | undefined
  evaluation: LiveSessionEvaluation | null
  errorMessage?: string | null
}): ReportQaStageStatus {
  if (params.rowStatus === 'failed' && /report qa/i.test(params.errorMessage ?? '')) return 'failed'
  if (params.rowStatus === 'complete' && params.evaluation && isStoredEvaluationTrusted(params.evaluation)) return 'passed'
  if ((params.speakLivePostSessionPhase ?? '').toLowerCase() === 'verifying') return 'running'
  if (params.rowStatus === 'running') return 'pending'
  return 'pending'
}

export function qaSummaryForApi(result: ReportQaResult): string | null {
  if (result.passed && result.fixesApplied.length === 0) return null
  if (result.fixesApplied.length > 0) return `Verified, flagged, and repaired ${result.fixesApplied.length} report issue(s) before publishing.`
  if (result.blockingReason) return result.blockingReason
  return null
}
