/**
 * Heuristics used only by second-pass **stored report QA** (`liveSessionEvaluationQa.ts`) to repair
 * legacy JSON that was built before the recommendation verify LLM pass existed.
 * The live orchestrator relies on {@link runSpeakLiveRecommendationVerifyLlm} for in-context checks.
 */

export function sameLearnerFacingSurface(a: string, b: string): boolean {
  return a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Customer / traveler side: questions or common checkout asks (no ? in transcript). */
export function learnerLineLooksLikeCustomerQuestion(learner: string): boolean {
  const s = learner.trim()
  if (!s) return false
  if (/\?/.test(s)) return true
  return /^(mag\s+ik|mag\s+het|kan\s+ik|kunt?\s+u|kunnen\s+we|kunnen\s+jullie|waar\s+(kan|moet|is)|hoeveel|wat\s+kost|is\s+dit|zijn\s+deze|heeft\s+u|hebt\s+u|waar\s+is|mag\s+dit)/i.test(
    s,
  )
}

/**
 * Staff-style affirmation answering the customer (not a line the learner should repeat as their own).
 */
export function referenceLooksLikeStaffAffirmationAnsweringCustomer(ref: string): boolean {
  const t = ref.trim()
  if (!t || /\?/.test(t)) return false
  if (!/^(ja\b|jazeker|natuurlijk|tuurlijk|nee\b|goed\b|prima\b)/i.test(t)) return false
  if (/\b(u|je)\s+kun(t|nen)\b/i.test(t)) return true
  if (/\b(u|je)\s+kan\b/i.test(t)) return true
  if (/\bdat\s+(kan|mag)\b/i.test(t)) return true
  return false
}

export function isLearnerFacingImprovedVersion(improved: string): boolean {
  const t = improved.trim()
  if (!t) return false
  if (referenceLooksLikeStaffAffirmationAnsweringCustomer(t)) return false
  return true
}
