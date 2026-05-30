import type { ModerationProvider, ModerationResult } from './moderationTypes'

export class NoOpModerationProvider implements ModerationProvider {
  async analyzeUserText(): Promise<ModerationResult> {
    return { severity: 'safe', categoriesFlagged: [] }
  }
  async analyzeAssistantText(): Promise<ModerationResult> {
    return { severity: 'safe', categoriesFlagged: [] }
  }
}
