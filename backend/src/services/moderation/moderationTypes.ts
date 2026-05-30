export type ModerationSeverity = 'safe' | 'warn' | 'block'

export interface ModerationResult {
  severity: ModerationSeverity
  categoriesFlagged: string[]
  /** When block/warn, optional sanitized or fallback text */
  replacementText?: string
}

export interface ModerationProvider {
  analyzeUserText(text: string): Promise<ModerationResult>
  analyzeAssistantText(text: string): Promise<ModerationResult>
}
