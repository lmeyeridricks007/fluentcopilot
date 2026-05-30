export type KnmMcqOption = { id: string; label: string; imageUrl?: string }

export type KnmMcqItem = {
  questionNl: string
  questionEn: string
  /** English gloss of the quoted passage (A2 reading bank); shown under TEXT in exam UI. */
  passageEn?: string
  /** When set, exam UI offers TTS for the stem (spoken Dutch); text may stay available as an optional transcript. */
  audioScriptNl?: string
  /** Animated situational illustration (exam UI prefers this over `questionImageUrl`). */
  illustrationId?: string
  questionImageUrl?: string
  options: KnmMcqOption[]
  correctOptionIds: string[]
}
