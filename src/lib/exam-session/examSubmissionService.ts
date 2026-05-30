/**
 * Placeholder for server-side batch submission. Client simulations score inline via domain evaluators.
 * Keeps a single import path when a backend exam pipeline is added.
 */

export type ExamSubmissionPayload = {
  sessionId: string
  examType: string
  bundlesJson?: unknown
}

export async function submitExamSessionClient(_payload: ExamSubmissionPayload): Promise<{ ok: true }> {
  return { ok: true }
}
