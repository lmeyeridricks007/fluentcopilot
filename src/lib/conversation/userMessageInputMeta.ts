/** Optional metadata when sending a user line (e.g. from voice review). Mirrors backend `ConversationUserInputMeta`. */
export type UserMessageInputMeta = {
  inputMode?: 'text' | 'speech'
  originalTranscript?: string | null
  audioReference?: string | null
  /** Speak Live: CEFR for ultra-lean live prompt (A1–B2). */
  learnerLevelCefr?: 'A1' | 'A2' | 'B1' | 'B2'
}
