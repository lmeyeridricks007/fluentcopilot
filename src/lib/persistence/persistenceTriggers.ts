/**
 * Thin entry points for product code — keeps persistence calls traceable.
 */
export { persistOnboardingStepImmediate, syncSessionUserToLearnerProfile } from './profilePersistenceBridge'
export { refreshProgressAfterDomainWrite } from './progressPersistenceBridge'
export { runIncrementalSave, createDebouncedFlush } from './saveStrategies'
export * from './persistencePolicy'
export type { IncrementalSaveDomain, IncrementalSaveMode, IncrementalSaveResult } from './types'
