import type { ConversationThread } from '../../models/contracts'
import type { LanguageCoachIssueType } from '../../domain/speakLive/languageCoachSessionTypes'
import { parseSpeakLiveState } from '../../domain/speakLive/speakLiveFsm'
import { detectLanguageCoachWeaknessSignals } from './languageCoachWeaknessSignals'
import { issueTypesFromTags } from './languageCoachNudgeEngine'

export type LiveCoachTurnFeedback = {
  verdict: 'good' | 'needs_work'
  pickedUpByCoach: boolean
  /** True when the latest assistant line clearly corrects (strict repeat template and/or common Dutch coach phrasing). */
  explicitCorrectionInReply: boolean
  guideModeActive: boolean
  correctionLoopActive: boolean
  reasons: string[]
  summary: string
  targetLine?: string | null
  repeatCount?: number | null
}

function normalizeLine(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

function uniqueIssueTypes(issueTypes: LanguageCoachIssueType[]): LanguageCoachIssueType[] {
  return Array.from(new Set(issueTypes))
}

function formatIssueLabel(issueType: LanguageCoachIssueType): string {
  switch (issueType) {
    case 'tense_issue':
      return 'verb tense'
    case 'word_order_issue':
      return 'word order'
    case 'article_preposition_issue':
      return 'article or preposition'
    case 'question_form_issue':
      return 'question form'
    case 'weak_follow_up':
      return 'follow-up depth'
    case 'simple_structure_overuse':
      return 'sentence variety'
    case 'word_choice_issue':
      return 'word choice'
    case 'low_clarity':
      return 'clarity'
    default:
      return 'accuracy'
  }
}

/** Tight “guide repeat” template the FSM sometimes steers the model toward. */
function assistantUsedExplicitCorrectionShape(assistantReply: string | null | undefined): boolean {
  const r = (assistantReply ?? '').trim()
  if (!r) return false
  const hasModelCue = /zeg precies\s*:/i.test(r) || /herhaal(?:\s+precies)?\s*:/i.test(r) || /nog eens\s*:/i.test(r)
  const hasWhyOrRepeat = /\bwaarom\b/i.test(r) || /herhal/i.test(r) || /kun je dat/i.test(r)
  return hasModelCue && hasWhyOrRepeat
}

/**
 * Learner-facing correction the coach already typed (free-form Dutch), not only the strict repeat template.
 * Without this, live check stays “good / not surfaced” while the assistant is clearly correcting word order etc.
 */
function assistantUsesVisibleDutchCorrection(assistantReply: string | null | undefined): boolean {
  if (assistantUsedExplicitCorrectionShape(assistantReply)) return true
  const r = (assistantReply ?? '').trim()
  if (r.length < 18) return false
  // Very common coach lines: model + optional why + repeat ask
  if (/je\s+kunt\s+zeggen\s*:/i.test(r)) return true
  if (/zeg\s+het\s+(zo|als volgt|bijvoorbeeld)\s*:/i.test(r)) return true
  if (/probeer\s*(?:het\s+)?(zo|eens)\s*:/i.test(r)) return true
  const hasQuotedModel = /["'„«][^"'»]{3,}["'”»]/.test(r)
  const asksRepeat = /kun je dat\s+herhal/i.test(r) || /\bherhal(?:en)?\s*\?/i.test(r) || /\b(nog\s+eens|herhaal)\b/i.test(r)
  const hasWhy = /\bwaarom\s*:/i.test(r) || /\bwaarom\b/i.test(r)
  if (hasQuotedModel && (asksRepeat || hasWhy)) return true
  return false
}

export function buildLiveCoachTurnFeedback(params: {
  thread: ConversationThread
  userText: string
  /** Latest assistant Dutch line — used to detect visible correction vs generic follow-up. */
  assistantReply?: string | null
}): LiveCoachTurnFeedback | null {
  const speakLiveState = parseSpeakLiveState(params.thread.speakLiveStateJson)
  const lc = speakLiveState?.languageCoach
  const userTextTrimmed = params.userText.trim()
  if (!lc || !userTextTrimmed) return null

  const normalizedUserText = normalizeLine(userTextTrimmed)
  const { tags } = detectLanguageCoachWeaknessSignals(userTextTrimmed)
  const heuristicIssues = uniqueIssueTypes(issueTypesFromTags(tags))
  const activeCorrection = lc.activeGuideCorrection ?? null
  const correctionLoopActive =
    Boolean(activeCorrection?.targetLine) && normalizeLine(activeCorrection?.sourceLearnerOriginal ?? '') === normalizedUserText
  const matchingNudge =
    [...(lc.nudgeEvents ?? [])]
      .reverse()
      .find((event) => normalizeLine(event.learnerOriginal) === normalizedUserText) ?? null

  const issueTypes = uniqueIssueTypes(
    correctionLoopActive && activeCorrection
      ? activeCorrection.issueTypes
      : matchingNudge?.detectedIssueTypes?.length
        ? matchingNudge.detectedIssueTypes
        : heuristicIssues
  )
  const reasons = issueTypes.map(formatIssueLabel)
  const explicitCorrectionInReply = assistantUsesVisibleDutchCorrection(params.assistantReply)
  const verdict =
    issueTypes.length > 0 || correctionLoopActive || explicitCorrectionInReply ? 'needs_work' : 'good'
  const pickedUpByCoach = Boolean(correctionLoopActive || matchingNudge || explicitCorrectionInReply)

  let summary = 'This turn looks good so far.'
  if (verdict === 'needs_work' && correctionLoopActive && activeCorrection) {
    summary =
      reasons.length > 0
        ? `Coach picked this up as ${reasons.join(', ')} and asked for a repeat.`
        : 'Coach picked this up and asked for a repeat.'
  } else if (verdict === 'needs_work' && pickedUpByCoach) {
    if (explicitCorrectionInReply) {
      summary =
        reasons.length > 0
          ? `Coach gave a visible correction in Dutch (model line / repeat prompt). Heuristic hints: ${reasons.join(', ')}.`
          : 'Coach gave a visible correction in Dutch (model line, why, or repeat prompt) in this reply.'
    } else {
      summary =
        reasons.length > 0
          ? `Heuristics flagged ${reasons.join(', ')}, but the coach reply did not yet use the full “model + repeat” correction shape.`
          : 'Heuristics flagged a possible issue, but the coach reply did not yet use the full “model + repeat” correction shape.'
    }
  } else if (verdict === 'needs_work') {
    summary =
      reasons.length > 0
        ? `Live check saw possible ${reasons.join(', ')}, but no visible coach correction was triggered yet.`
        : 'Live check saw a possible issue, but no visible coach correction was triggered yet.'
  }

  return {
    verdict,
    pickedUpByCoach,
    explicitCorrectionInReply,
    guideModeActive: Boolean(lc.coachGuideWhileSpeaking),
    correctionLoopActive,
    reasons,
    summary,
    targetLine: correctionLoopActive ? activeCorrection?.targetLine ?? null : null,
    repeatCount: correctionLoopActive ? activeCorrection?.repeatCount ?? null : null,
  }
}
