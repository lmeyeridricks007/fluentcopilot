import { useNoOpModeration } from '../../config/env'
import { AzureContentSafetyProvider } from './azureContentSafetyProvider'
import { NoOpModerationProvider } from './noOpModerationProvider'
import type { ModerationProvider } from './moderationTypes'

export function createModerationProvider(): ModerationProvider {
  if (useNoOpModeration()) return new NoOpModerationProvider()
  return new AzureContentSafetyProvider()
}
