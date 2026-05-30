import { describe, expect, it, vi } from 'vitest'
import { shouldPersistTrainingLoopGenerationDebug } from './trainingLoopDevFlags'

describe('shouldPersistTrainingLoopGenerationDebug', () => {
  it('is false in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('TRAINING_LOOP_STORE_GENERATION_DEBUG', '')
    expect(shouldPersistTrainingLoopGenerationDebug()).toBe(false)
    vi.unstubAllEnvs()
  })

  it('is false in production even when env requests debug', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('TRAINING_LOOP_STORE_GENERATION_DEBUG', '1')
    expect(shouldPersistTrainingLoopGenerationDebug()).toBe(false)
    vi.unstubAllEnvs()
  })

  it('is true in non-production unless explicitly disabled', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('TRAINING_LOOP_STORE_GENERATION_DEBUG', '')
    expect(shouldPersistTrainingLoopGenerationDebug()).toBe(true)
    vi.stubEnv('TRAINING_LOOP_STORE_GENERATION_DEBUG', '0')
    expect(shouldPersistTrainingLoopGenerationDebug()).toBe(false)
    vi.unstubAllEnvs()
  })
})
