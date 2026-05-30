/**
 * Detect when the learner asks the Language Coach to stay on a micro-topic for the session
 * (e.g. “focus on er”, “werk aan woordvolgorde”) and when they explicitly want to move on.
 * Strings are English/Dutch mixed, internal-only for prompts — never shown verbatim to the learner.
 */

const GENERIC_CAPTURE = /^(it|this|that|these|those|dit|dat|deze|die|het|iets|something|anything|that one)$/i

/** Learner asked to drop the sticky micro-lesson topic for this session. */
export function wantsToClearPinnedLessonFocus(userText: string): boolean {
  const t = userText.trim()
  if (t.length < 6) return false
  const lower = t.toLowerCase()
  if (
    /\b(something else|different topic|another topic|new topic|change (the )?subject|switch topics|move on|enough about|not (that|this) anymore)\b/i.test(
      t,
    )
  ) {
    return true
  }
  if (
    /\b(iets anders|ander onderwerp|nieuw onderwerp|laten we (het )?over iets anders|genoeg daarover|niet meer over|anders.*(onderwerp|topic)|stop maar met|anders praten)\b/i.test(
      lower,
    )
  ) {
    return true
  }
  if (/\b(let'?s|can we|could we|shall we)\s+(talk|chat|speak)\s+about\s+something\s+else\b/i.test(lower)) return true
  if (/\b(kunnen we|laten we)\s+(het\s+)?over\s+iets\s+anders\b/i.test(lower)) return true
  return false
}

function sanitizeCapture(raw: string): string | null {
  const s = raw.replace(/\s+/g, ' ').trim().replace(/^["'“„]+|["'”]+$/g, '').replace(/^[\s\-–:]+/, '').slice(0, 200)
  if (!s || GENERIC_CAPTURE.test(s)) return null
  return s
}

/** Pull a short focus phrase from a learner line (null if none). */
export function tryExtractPinnedLessonFocusFromLearnerTurn(userText: string): string | null {
  const t = userText.trim()
  if (t.length < 4) return null
  const patterns: RegExp[] = [
    /\b(?:please\s+)?(?:focus|work|practice|drill)(?:\s+on|\s+with)\s+(.{1,120}?)(?:[.!?,;]|$)/i,
    /\b(?:let'?s|let us|can we|could we|shall we)\s+(?:work|focus|practice)\s+on\s+(.{1,120}?)(?:[.!?,;]|$)/i,
    /\b(?:i want to|i'?d like to|ik wil)\s+(?:practice|work on|focus on|oefenen met)\s+(.{1,120}?)(?:[.!?,;]|$)/i,
    /\b(?:werk|oefen|focus(?:sen)?)\s+(?:aan|met|op)\s+(.{1,120}?)(?:[.!?,;]|$)/i,
    /\b(?:help me (?:with|on)\s+|help me understand|teach me|leg me uit|hoe gebruik ik)\s+(.{1,120}?)(?:[.!?,;]|$)/i,
    /\b(?:for (?:this )?session|in (?:this )?lesson),?\s+(?:i want to )?(?:focus on|work on)\s+(.{1,120}?)(?:[.!?,;]|$)/i,
  ]
  for (const re of patterns) {
    const m = t.match(re)
    if (m?.[1]) {
      const out = sanitizeCapture(m[1])
      if (out) return out
    }
  }
  return null
}

/** Apply clear-or-update rules for the per-session pinned focus. */
export function updateLearnerPinnedLessonFocus(prev: string | null, userText: string): string | null {
  if (wantsToClearPinnedLessonFocus(userText)) return null
  const extracted = tryExtractPinnedLessonFocusFromLearnerTurn(userText)
  if (extracted) return extracted
  return prev
}
