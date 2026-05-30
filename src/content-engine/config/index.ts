/**
 * Content engine — config and feature flags.
 * Replace with env or remote config in production.
 */

export interface EngineConfig {
  generation_enabled: boolean
  max_retries: number
  default_model_id: string
  fallback_model_id?: string
  rate_limit_rpm?: number
  batch_chunk_size: number
  batch_concurrency: number
}

export const defaultEngineConfig: EngineConfig = {
  generation_enabled: true,
  max_retries: 2,
  default_model_id: 'gpt-4o-mini',
  fallback_model_id: undefined,
  rate_limit_rpm: 60,
  batch_chunk_size: 10,
  batch_concurrency: 3,
}

let config: EngineConfig = defaultEngineConfig

export function getEngineConfig(): EngineConfig {
  return { ...config }
}

export function setEngineConfig(next: Partial<EngineConfig>): void {
  config = { ...config, ...next }
}
