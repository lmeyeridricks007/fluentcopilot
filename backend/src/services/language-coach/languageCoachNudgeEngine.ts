import type {
  LanguageCoachConversationRole,
  LanguageCoachGuideRepeatMode,
  LanguageCoachIssueType,
  LanguageCoachNudgeSeverity,
  LanguageCoachNudgeType,
  LanguageCoachPendingNudgePlan,
  LanguageCoachPersistedBlob,
} from '../../domain/speakLive/languageCoachSessionTypes'

/** Map heuristic weakness tags → canonical issue types for nudges + reports. */
const TAG_TO_ISSUES: Record<string, LanguageCoachIssueType[]> = {
  past_tense: ['tense_issue'],
  word_order: ['word_order_issue'],
  english_fallback: ['word_choice_issue'],
  article: ['article_preposition_issue'],
  short_fragments: ['low_clarity', 'simple_structure_overuse'],
  follow_up_gap: ['weak_follow_up'],
  question_form: ['question_form_issue'],
  wrong_word_choice: ['word_choice_issue'],
  low_clarity: ['low_clarity'],
  simple_repeat: ['simple_structure_overuse'],
}

export function issueTypesFromTags(tags: string[]): LanguageCoachIssueType[] {
  const set = new Set<LanguageCoachIssueType>()
  for (const t of tags) {
    const mapped = TAG_TO_ISSUES[t]
    if (mapped) for (const m of mapped) set.add(m)
  }
  return [...set]
}

export function aggregateSeverity(
  issueKinds: LanguageCoachIssueType[],
  weaknessHits: Record<string, number>,
  tagsThisTurn: string[]
): LanguageCoachNudgeSeverity {
  const majorSignals =
    issueKinds.includes('low_clarity') ||
    tagsThisTurn.includes('low_clarity') ||
    (tagsThisTurn.includes('english_fallback') && tagsThisTurn.includes('short_fragments'))
  if (majorSignals) return 'major'

  for (const tag of ['word_order', 'past_tense', 'question_form']) {
    const hits = weaknessHits[tag] ?? 0
    if (tagsThisTurn.includes(tag) && hits >= 3) return 'major'
    if (tagsThisTurn.includes(tag) && hits >= 2) return 'medium'
  }
  if (tagsThisTurn.some((t) => ['past_tense', 'word_order', 'article', 'question_form', 'wrong_word_choice'].includes(t))) {
    return 'medium'
  }
  if (tagsThisTurn.length) return 'minor'
  return 'minor'
}

function turnsSinceLastNudge(blob: LanguageCoachPersistedBlob): number {
  if (blob.lastNudgeCoachTurnIndex < 0) return 999
  return blob.coachTurnIndex - blob.lastNudgeCoachTurnIndex
}

function modelNudgesThisSession(blob: LanguageCoachPersistedBlob): number {
  return blob.nudgeEvents.filter((e) => e.nudgeType === 'MODEL').length
}

function hasClaritySignal(issueKinds: LanguageCoachIssueType[], tagsThisTurn: string[]): boolean {
  return issueKinds.includes('low_clarity') || tagsThisTurn.includes('low_clarity')
}

function hasGrammarSignals(issueKinds: LanguageCoachIssueType[], tagsThisTurn: string[]): boolean {
  const grammarTags = new Set([
    'past_tense',
    'word_order',
    'article',
    'question_form',
    'wrong_word_choice',
    'simple_repeat',
    'english_fallback',
  ])
  if (tagsThisTurn.some((t) => grammarTags.has(t))) return true
  return issueKinds.some((k) =>
    ['tense_issue', 'word_order_issue', 'article_preposition_issue', 'question_form_issue', 'word_choice_issue'].includes(
      k,
    ),
  )
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function isShortForLevel(learnerCefr: string | null, wordCount: number): boolean {
  const cefr = (learnerCefr ?? '').toUpperCase()
  if (cefr === 'B1' || cefr === 'B2') return wordCount < 7
  if (cefr === 'A2') return wordCount < 4
  return wordCount < 3
}

function shouldStartGuideRepeatLoop(params: {
  coachActiveGuide: boolean
  conversationRole: LanguageCoachConversationRole
  issueKinds: LanguageCoachIssueType[]
  severity: LanguageCoachNudgeSeverity
  learnerCefr: string | null
  userText: string
}): boolean {
  const { coachActiveGuide, conversationRole, issueKinds, severity, learnerCefr, userText } = params
  if (!coachActiveGuide || conversationRole !== 'coach') return false
  const grammarish = issueKinds.some((k) =>
    ['tense_issue', 'word_order_issue', 'article_preposition_issue', 'question_form_issue', 'word_choice_issue'].includes(k),
  )
  if (grammarish) return true
  /**
   * “Weak follow-up” alone often maps to EXPAND-style coaching, which feels like ignoring mistakes when Guide is ON.
   * For longer learner lines, still run the bounded repeat loop so the coach models better Dutch instead of only asking another open question.
   */
  if (issueKinds.includes('weak_follow_up') && countWords(userText) >= 8) {
    return true
  }
  const formFit = issueKinds.includes('low_clarity') || issueKinds.includes('simple_structure_overuse')
  if (!formFit) return false
  return severity !== 'minor' || isShortForLevel(learnerCefr, countWords(userText))
}

/**
 * Social / professional roles: suppress grammar-teaching nudges; keep flow.
 * Coach uses full strategy below.
 */
function roleSuppressesGrammarNudge(
  role: LanguageCoachConversationRole,
  severity: LanguageCoachNudgeSeverity,
  issueKinds: LanguageCoachIssueType[],
  tagsThisTurn: string[],
  gap: number,
): boolean {
  if (role === 'coach') return false
  const grammar = hasGrammarSignals(issueKinds, tagsThisTurn)
  const clarity = hasClaritySignal(issueKinds, tagsThisTurn)
  if (!grammar || clarity) return false

  if (role === 'friend' || role === 'date') {
    return severity !== 'major' || gap < 4
  }
  if (role === 'colleague') {
    return severity === 'minor' || (severity === 'medium' && gap < 2)
  }
  if (role === 'dutch_local') {
    return severity === 'minor' || (severity === 'medium' && gap < 1)
  }
  return false
}

/**
 * Decide whether this coach reply should carry an explicit nudge strategy.
 * Conservative by default — flow over accuracy.
 */
export function decideLanguageCoachNudge(input: {
  blob: LanguageCoachPersistedBlob
  userText: string
  tagsThisTurn: string[]
  learnerCefr: string | null
}): LanguageCoachPendingNudgePlan | null {
  const { blob, userText, tagsThisTurn, learnerCefr } = input
  const trimmed = userText.trim()
  if (!trimmed) return null

  const issueKinds = issueTypesFromTags(tagsThisTurn)
  if (!issueKinds.length && !tagsThisTurn.length) return null

  const severity = aggregateSeverity(issueKinds, blob.weaknessHits, tagsThisTurn)
  const gap = turnsSinceLastNudge(blob)
  const { feedbackStyle, coachStyle } = blob
  const conversationRole: LanguageCoachConversationRole = blob.conversationRole ?? 'coach'
  const coachActiveGuide = conversationRole === 'coach' && blob.coachGuideWhileSpeaking

  if (roleSuppressesGrammarNudge(conversationRole, severity, issueKinds, tagsThisTurn, gap)) {
    return null
  }

  const socialFollowUpOnly =
    tagsThisTurn.includes('follow_up_gap') || issueKinds.includes('weak_follow_up')
  if ((conversationRole === 'friend' || conversationRole === 'date') && !hasClaritySignal(issueKinds, tagsThisTurn)) {
    if (!socialFollowUpOnly && severity !== 'major') return null
  }

  const cefr = (learnerCefr ?? '').toUpperCase()
  const isBeginner = cefr === 'A1' || cefr === 'A2'

  /** At-end-only: only interrupt flow for major confusion. */
  if (feedbackStyle === 'at_end_only') {
    if (coachActiveGuide) {
      if (severity === 'minor') return null
    } else if (severity !== 'major') {
      return null
    }
  }

  /** Subtle: require spacing between noticeable nudges unless major. */
  if (feedbackStyle === 'subtle_and_end') {
    const minGap = coachActiveGuide ? (severity === 'major' ? 0 : 1) : isBeginner ? 2 : 2
    if (severity !== 'major' && gap < minGap) return null
  }

  /** Every-turn: still skip pure noise / empty signals. */
  if (feedbackStyle === 'every_turn') {
    if (!tagsThisTurn.length && !issueKinds.includes('low_clarity')) return null
    const minorGap = coachActiveGuide ? 0 : 1
    if (severity === 'minor' && gap < minorGap) return null
  }

  let nudgeType: LanguageCoachNudgeType = 'RECAST'

  const unclear = severity === 'major' && (issueKinds.includes('low_clarity') || tagsThisTurn.includes('low_clarity'))
  if (unclear) {
    nudgeType = 'CLARIFY'
  } else if (issueKinds.includes('weak_follow_up') || tagsThisTurn.includes('follow_up_gap')) {
    nudgeType = 'EXPAND'
  } else if (severity === 'minor' && (issueKinds.includes('tense_issue') || issueKinds.includes('word_order_issue'))) {
    nudgeType = 'RECAST'
  } else if (severity === 'medium') {
    nudgeType = blob.conversationGoal === 'follow_up_questions' ? 'EXPAND' : 'RECAST'
  }

  const canUseModel =
    conversationRole === 'coach' &&
    nudgeType === 'RECAST' &&
    modelNudgesThisSession(blob) < 1 &&
    severity === 'major' &&
    (feedbackStyle === 'every_turn' || coachStyle === 'challenging') &&
    (issueKinds.includes('tense_issue') || issueKinds.includes('word_order_issue'))

  if (canUseModel && coachStyle !== 'supportive') {
    nudgeType = 'MODEL'
  }

  const promptDirective = buildNudgePromptDirective({
    nudgeType,
    severity,
    coachStyle,
    issueKinds,
    conversationGoal: blob.conversationGoal,
    coachActiveGuide,
    conversationRole,
  })
  const guideRepeatMode =
    shouldStartGuideRepeatLoop({
      coachActiveGuide,
      conversationRole,
      issueKinds,
      severity,
      learnerCefr: learnerCefr ?? null,
      userText: trimmed,
    })
      ? 'start'
      : undefined
  const effectivePromptDirective =
    guideRepeatMode ?
      buildGuideRepeatPromptDirective({
        severity,
        issueKinds,
        coachStyle,
        learnerCefr: learnerCefr ?? null,
        repeatMode: guideRepeatMode,
        repeatCount: 1,
      })
    : promptDirective

  return {
    nudgeType,
    learnerOriginal: trimmed.slice(0, 2000),
    detectedIssueTypes: issueKinds.length ? issueKinds : ['low_clarity'],
    severity,
    coachTurnIndexBeforeReply: blob.coachTurnIndex,
    promptDirective: effectivePromptDirective,
    ...(guideRepeatMode ? { guideRepeatMode, guideRepeatCount: 1 } : {}),
  }
}

export function buildGuideRepeatPromptDirective(params: {
  severity: LanguageCoachNudgeSeverity
  issueKinds: LanguageCoachIssueType[]
  coachStyle: LanguageCoachPersistedBlob['coachStyle']
  learnerCefr: string | null
  repeatMode: LanguageCoachGuideRepeatMode
  repeatCount: number
}): string {
  const { severity, issueKinds, coachStyle, learnerCefr, repeatMode, repeatCount } = params
  const cefr = (learnerCefr ?? '').toUpperCase()
  const levelFit =
    cefr === 'B1' || cefr === 'B2'
      ? 'For B1/B2, expect a fuller and more natural Dutch line; call out if the learner answer is too short for that level.'
      : 'For A1/A2, keep the correction simpler and shorter, but still give a natural Dutch line to repeat.'
  const tone =
    coachStyle === 'supportive'
      ? 'Warm and patient.'
      : coachStyle === 'challenging'
        ? 'Direct but respectful.'
        : 'Clear and balanced.'
  const attemptLine =
    repeatMode === 'retry'
      ? repeatCount >= 3
        ? 'This is the LAST repeat request for the same correction point. After this attempt, move on even if it is not perfect.'
        : `This is repeat attempt ${repeatCount} of max 3 for the same correction point.`
      : 'Start a bounded correction loop for this same point.'
  return [
    repeatMode === 'retry' ? 'GUIDE_REPEAT_LOOP=RETRY' : 'GUIDE_REPEAT_LOOP=START',
    `Severity=${severity}; signals=${issueKinds.join(', ')}`,
    levelFit,
    attemptLine,
    tone,
    'Learner-facing reply must stay in Dutch only and stay compact: exactly 3 short sentences when possible.',
    'Sentence 1: brief correction cue plus EXACTLY one natural Dutch model line introduced with `Zeg precies: "..."`.',
    'Sentence 2: one very short reason why it sounds better; adapt the explanation to the learner level.',
    'Sentence 3: ask the learner to repeat that exact line before you continue.',
    'Do NOT move the conversation to a new topic yet. Do NOT ask a fresh content question until the repeat loop ends.',
    'If the issue is that the answer is too short for level, say that briefly and provide a fuller level-appropriate line to repeat.',
  ].join(' ')
}

export function buildNudgePromptDirective(params: {
  nudgeType: LanguageCoachNudgeType
  severity: LanguageCoachNudgeSeverity
  coachStyle: LanguageCoachPersistedBlob['coachStyle']
  issueKinds: LanguageCoachIssueType[]
  conversationGoal: LanguageCoachPersistedBlob['conversationGoal']
  coachActiveGuide?: boolean
  conversationRole?: LanguageCoachConversationRole
}): string {
  const { nudgeType, severity, coachStyle, issueKinds, conversationGoal, coachActiveGuide, conversationRole } = params
  const role = conversationRole ?? 'coach'
  const issues = issueKinds.join(', ')
  const tone =
    coachStyle === 'supportive'
      ? 'Warm and patient; keep Dutch short.'
      : coachStyle === 'challenging'
        ? 'Push slightly harder but stay respectful; Dutch only.'
        : 'Balanced partner tone; Dutch only.'

  const roleTone =
    role === 'friend' || role === 'date'
      ? 'Role=friend/date: prioritize warmth and flow — no grammar teaching; one short natural line.'
      : role === 'colleague'
        ? 'Role=colleague: professional brevity — clarify meaning if needed; avoid sounding like a teacher.'
        : role === 'dutch_local'
          ? 'Role=dutch_local: realistic Dutch partner — concise; no effusive praise; stay socially natural.'
          : ''

  if (nudgeType === 'RECAST') {
    const guideExtra = coachActiveGuide
      ? 'Coach active guide: you MAY include one short Dutch line “Je kunt zeggen: «…»” (≤12 words inside quotes) before your follow-up — still max 2–3 short sentences total.'
      : ''
    return [
      'NUDGE_STRATEGY=RECAST',
      `Severity=${severity}; signals=${issues}`,
      coachActiveGuide
        ? 'Reformulate intent in natural Dutch; prefer one compact explicit model phrase if it unlocks the next turn faster.'
        : 'Reformulate the learner’s intended meaning in natural Dutch inside your reply (implicit correction).',
      coachActiveGuide
        ? 'Add one simpler follow-up question after the help line.'
        : 'Add one natural follow-up question in Dutch — do not quote grammar rules.',
      guideExtra,
      roleTone,
      tone,
    ]
      .filter(Boolean)
      .join(' ')
  }
  if (nudgeType === 'CLARIFY') {
    return [
      'NUDGE_STRATEGY=CLARIFY',
      `Severity=${severity}; signals=${issues}`,
      coachActiveGuide
        ? 'If stuck, you may offer a tight A/B choice in Dutch (“Vandaag of morgen?” style) OR one sentence starter — pick one device only.'
        : 'Meaning may be unclear: ask one gentle clarifying question in Dutch (or offer one tight paraphrase-as-question).',
      'Do not lecture; stay conversational.',
      roleTone,
      tone,
    ]
      .filter(Boolean)
      .join(' ')
  }
  if (nudgeType === 'EXPAND') {
    return [
      'NUDGE_STRATEGY=EXPAND',
      `Severity=${severity}; signals=${issues}; goal=${conversationGoal}`,
      coachActiveGuide
        ? 'Invite richer Dutch with ONE simpler scaffold (“Begin met: «Ik …»”) only if the learner is very short or blocked; otherwise a single focused who/what/when question.'
        : 'Invite richer Dutch: who/what/when/why — one focused follow-up, still natural.',
      roleTone,
      tone,
    ]
      .filter(Boolean)
      .join(' ')
  }
  return [
    'NUDGE_STRATEGY=MODEL',
    `Severity=${severity}; signals=${issues}`,
    'Sparingly: weave ONE short optional Dutch model phrase (“Je kunt ook zeggen: …”) naturally, then continue the chat.',
    'Do not stack multiple model phrases.',
    roleTone,
    tone,
  ]
    .filter(Boolean)
    .join(' ')
}
