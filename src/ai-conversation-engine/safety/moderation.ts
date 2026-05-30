/**
 * AI Conversation Engine — moderation/safety checks.
 */

export interface ModerationInput {
  text: string
  context?: 'user_message' | 'tutor_response'
}

export interface ModerationResult {
  allowed: boolean
  flags?: string[]
  reason?: string
}

export interface IModerationService {
  check(input: ModerationInput): Promise<ModerationResult>
}

/**
 * Simple rule-based moderation for development.
 * Replace with provider moderation API (e.g. OpenAI Moderation) in production.
 */
export class MockModerationService implements IModerationService {
  private readonly blockPatterns: RegExp[] = [
    /\b(offensive|explicit|harm)\b/i,
    /(jailbreak|ignore previous|disregard instructions)/i,
  ]

  async check(input: ModerationInput): Promise<ModerationResult> {
    const lower = input.text.toLowerCase().trim()
    if (lower.length === 0) return { allowed: false, flags: ['empty'], reason: 'Empty input' }
    for (const pattern of this.blockPatterns) {
      if (pattern.test(input.text)) {
        return { allowed: false, flags: ['blocked'], reason: 'Content did not pass safety check' }
      }
    }
    return { allowed: true }
  }
}

let defaultModeration: IModerationService = new MockModerationService()

export function setModerationService(service: IModerationService): void {
  defaultModeration = service
}

export function getModerationService(): IModerationService {
  return defaultModeration
}
