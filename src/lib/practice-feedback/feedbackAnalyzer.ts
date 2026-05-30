import type {
  PostConversationFeedbackInput,
  SessionOutcome,
  SessionPerformanceSignals,
} from '@/lib/practice-feedback/types'

function norm(s: string): string {
  return s.toLowerCase().trim()
}

function phraseAppearsInUserText(phrase: string, userNorm: string): boolean {
  const p = norm(phrase)
  if (p.length < 4) return userNorm.includes(p)
  const words = p.split(/\s+/).filter((w) => w.length > 2)
  if (words.length === 0) return userNorm.includes(p)
  const hit = words.filter((w) => userNorm.includes(w)).length
  return hit >= Math.min(2, words.length) || userNorm.includes(p.slice(0, 6))
}

const ENGLISH_LEAK = /\b(please|sorry|thanks|thank you|yes|no|hello|okay|ok)\b/i

const TIME_ADV_SUBJ = /\b(vandaag|gisteren|morgen|straks|vanavond|nu)\s+(ik|jij|je|u)\s+/i

function deriveOutcome(input: PostConversationFeedbackInput): SessionOutcome {
  if (input.sessionOutcome) return input.sessionOutcome
  const users = input.messages.filter((m) => m.role === 'user')
  const n = users.length
  const u = norm(users.map((m) => m.content).join(' '))
  let outcome: SessionOutcome = 'partial'
  if (n >= 4 && (u.includes('dank') || u.includes('alstublieft') || u.length > 80)) {
    outcome = 'success'
  }
  if (n < 2 || u.length < 15) {
    outcome = 'needs_practice'
  }
  if (!input.sessionOutcome && input.mode === 'guided' && input.branchQualities?.length) {
    const weak = input.branchQualities.filter((q) => q === 'weak').length
    if (weak >= 2) outcome = 'needs_practice'
  }
  return outcome
}

/**
 * Derives cross-mode performance signals from session artifacts (no LLM).
 */
export function analyzePracticeSession(input: PostConversationFeedbackInput): SessionPerformanceSignals {
  const userMsgs = input.messages.filter((m) => m.role === 'user').map((m) => m.content)
  const asstMsgs = input.messages.filter((m) => m.role === 'assistant').map((m) => m.content)
  const combined = userMsgs.join(' ')
  const normalized = norm(combined)
  const sessionOutcome = deriveOutcome(input)

  const missed: Array<{ phrase: string; translation?: string }> = []
  let used = 0
  for (const kp of input.keyPhrases) {
    if (phraseAppearsInUserText(kp.phrase, normalized)) used += 1
    else missed.push({ phrase: kp.phrase, translation: kp.translation })
  }

  const branches = input.branchQualities ?? []
  const weakBranchCount = branches.filter((b) => b === 'weak').length
  const strongBranchCount = branches.filter((b) => b === 'strong').length
  const okBranchCount = branches.filter((b) => b === 'ok').length

  const supportUses = input.supportUsage?.estimatedToolUses ?? 0
  const supportHeavy = supportUses >= 4 || Boolean(input.supportUsage?.easierModeUsed && supportUses >= 2)

  let wordOrderRisk = false
  for (const line of userMsgs) {
    if (TIME_ADV_SUBJ.test(line)) {
      wordOrderRisk = true
      break
    }
  }

  return {
    mode: input.mode,
    userTurnCount: userMsgs.length,
    userMessages: userMsgs,
    combinedUserText: combined,
    normalizedUserText: normalized,
    assistantTurnCount: asstMsgs.length,
    hasPoliteness: /\b(dank|bedankt|alstublieft|graag)\b/i.test(combined),
    hasQuestion: combined.includes('?'),
    englishTokensDetected: ENGLISH_LEAK.test(combined),
    wordOrderRisk,
    missedKeyPhrases: missed,
    usedKeyPhraseCount: used,
    weakBranchCount,
    strongBranchCount,
    okBranchCount,
    sessionOutcome,
    supportHeavy,
    avgUserTurnLength: userMsgs.length ? combined.length / userMsgs.length : 0,
  }
}
