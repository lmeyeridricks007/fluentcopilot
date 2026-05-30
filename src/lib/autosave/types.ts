/** Shared autosave metadata — nested under `DraftsDocumentV1.writingDrafts[key].payload`. */
export type AutosaveEnvelopeV1 = {
  v: 1
  domain: 'writing' | 'simulation' | 'exam' | 'text_answer'
  entityId: string
  /** ISO time when this draft was last written. */
  savedAt: string
  body: unknown
}

export type AutosaveDomain = AutosaveEnvelopeV1['domain']

export type AutosaveAnalyticsContext = {
  domain: AutosaveDomain
  entity_id: string
  save_mode: 'debounced' | 'interval' | 'flush' | 'immediate'
}
