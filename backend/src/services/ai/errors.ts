/**
 * AI layer errors — map to HTTP in conversation services, never leak raw provider payloads.
 */

export class AiConfigurationError extends Error {
  readonly code = 'AI_CONFIGURATION' as const
  constructor(message: string) {
    super(message)
    this.name = 'AiConfigurationError'
  }
}

export class AiProviderError extends Error {
  readonly code = 'AI_PROVIDER' as const
  readonly statusCode?: number
  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'AiProviderError'
    this.statusCode = statusCode
  }
}

export class AiValidationError extends Error {
  readonly code = 'AI_VALIDATION' as const
  constructor(message: string) {
    super(message)
    this.name = 'AiValidationError'
  }
}

export class AiTimeoutError extends Error {
  readonly code = 'AI_TIMEOUT' as const
  constructor(message: string) {
    super(message)
    this.name = 'AiTimeoutError'
  }
}
